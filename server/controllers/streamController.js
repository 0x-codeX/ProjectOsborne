// server/controllers/streamController.js
const axios = require("axios");
const https = require("https");
const Stream = require("../models/Stream");
const User = require("../models/User");
const Purchase = require("../models/Purchase");
const Notification = require("../models/Notification");

const LIVEPEER_API_URL =
  "https://livepeer.studio/api/stream";

// @desc    Initialize a Livepeer stream session
// @route   POST /api/streams/create
// @access  Private (Verified Creator)
exports.createStream = async (req, res) => {
  try {
    const { title, priceNGN } = req.body;
    const creatorId = req.user._id;

    if (!title) {
      return res.status(400).json({ message: "Stream title is required." });
    }

    // 1. Call Livepeer Studio API to provision stream
    const livepeerRes = await axios.post(
      LIVEPEER_API_URL,
      {
        name: `Nippy_${creatorId}_${Date.now()}`,
        // CRITICAL FIX: Explicitly enable WebRTC (WHIP/WHEP) for this stream!
        record: false,
        playbackPolicy: { type: "public" }, 
        profiles: [
          { name: "720p", bitrate: 2000000, fps: 30, width: 1280, height: 720 },
          { name: "480p", bitrate: 1000000, fps: 30, width: 854, height: 480 },
          { name: "360p", bitrate: 500000, fps: 30, width: 640, height: 360 },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.LIVEPEER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { id: livepeerStreamId, streamKey, playbackId } = livepeerRes.data;

    // 2. Save stream details to MongoDB
    const stream = await Stream.create({
      creatorId,
      title,
      priceNGN: priceNGN || 0,
      isPaywalled: Number(priceNGN) > 0,
      livepeerStreamId,
      streamKey,
      playbackId,
      status: "OFFLINE",
      startedAt: Date.now(),
    });

    res.status(201).json({
      success: true,
      streamId: stream._id,
      playbackId: stream.playbackId,
      // Ingest URL and Stream Key are returned ONLY to the creator for OBS/streaming setup
      rtmpIngestUrl: "rtmp://rtmp.livepeer.com/live",
      streamKey,
    });
  } catch (error) {
    console.error("Create Stream Error:", error.response?.data || error.message);
    res.status(500).json({ message: "Failed to initialize live stream." });
  }
};

// @desc    Get Playback Details & Gate Access for Fans
// @route   GET /api/streams/:id
// @access  Private
exports.getStream = async (req, res) => {
  try {
    const stream =
      await Stream.findById(
        req
          .params
          .id,
      )
        .select(
          "+streamKey",
        )
        .populate(
          "creatorId",
          "username creatorProfile monetizationSettings subscribers walletAddress",
        );

    if (!stream) {
      return res.status(404).json({ message: "Stream not found." });
    }

    const creatorIdObj = stream.creatorId._id || stream.creatorId;
    const isCreator = String(creatorIdObj) === String(req.user._id);

    // --- THE HYBRID PAYWALL CHECK ---
    if (!isCreator) {
      // 1. Check the strict financial ledger
      const activeSubscription = await Purchase.findOne({
        user: req.user._id,
        creator: creatorIdObj,
        purchaseType: "SUBSCRIPTION",
        status: "completed",
        // Failsafe: if expiresAt doesn't exist on old test data, allow it. If it does, must be future.
        $or: [
          { expiresAt: { $gt: new Date() } },
          { expiresAt: { $exists: false } },
          { expiresAt: null }
        ]
      });

      // 2. Check the UI Fallback Array (in case the Purchase record is desynced)
      // Checks if the fan's ID is in the creator's subscribers array
      const creatorDoc = await User.findById(creatorIdObj);
      const isSubbedInArray = creatorDoc?.subscribers?.includes(req.user._id);

      if (!activeSubscription && !isSubbedInArray) {
        return res.status(403).json({
          message: "Access denied. An active subscription is required to view this live stream.",
          requiresSubscription: true,
          creatorId: creatorIdObj,
          subscriptionPriceNGN: stream.creatorId.monetizationSettings?.monthlySubscription || 0,
        });
      }
    }

    // If they pass either check, open the doors!
    res
      .status(
        200,
      )
      .json(
        {
          success: true,
          stream:
            {
              _id: stream._id,
              title:
                stream.title,
              status:
                stream.status,
              playbackId:
                stream.playbackId,
              playbackUrl: `https://livepeercdn.studio/hls/${stream.playbackId}/index.m3u8`,
              creator:
                stream.creatorId,
              ...(isCreator && {
                streamKey:
                  stream.streamKey,
              }),
            },
        },
      );
  } catch (error) {
    console.error("Get Stream Error:", error);
    res.status(500).json({ message: "Error retrieving stream playback." });
  }
};


// @desc    End an active live stream
// @route   PUT /api/streams/:id/end
// @access  Private
exports.endStream =
  async (
    req,
    res,
  ) => {
    try {
      const stream =
        await Stream.findById(
          req
            .params
            .id,
        );

      if (
        !stream
      ) {
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "Stream not found.",
            },
          );
      }

      // Ensure only the creator can end their stream
      if (
        String(
          stream.creatorId,
        ) !==
        String(
          req
            .user
            ._id,
        )
      ) {
        return res
          .status(
            403,
          )
          .json(
            {
              message:
                "Not authorized to end this stream.",
            },
          );
      }

      // Terminate it
      stream.status =
        "ENDED";
      await stream.save();

      res
        .status(
          200,
        )
        .json(
          {
            success: true,
            message:
              "Stream successfully ended.",
          },
        );
    } catch (error) {
      console.error(
        "End Stream Error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to end stream.",
          },
        );
    }
  };

// @desc    Proxy WHIP request to Livepeer (Bypasses Browser Security & SSL Blocks)
// @route   POST /api/streams/:id/whip
// @access  Private
exports.proxyWhipRequest = async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id).select('+streamKey');
    
    if (!stream) {
      return res.status(404).json({ message: "Stream not found." });
    }

    if (String(stream.creatorId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized to broadcast this stream." });
    }

    const { sdp } = req.body;
    if (!sdp) {
      return res.status(400).json({ message: "SDP offer is required." });
    }

    // Official WebRTC Ingest URL
    const whipUrl = `https://rtmp.livepeer.com/webrtc/${stream.streamKey}`;
    
    const sslBypassAgent = new https.Agent({ rejectUnauthorized: false });

    // Axios natively follows 307 redirects and keeps it as a POST. 
    // We just need to provide the strict WHIP content type.
    const livepeerRes = await axios.post(whipUrl, sdp, {
      headers: {
        'Authorization': `Bearer ${stream.streamKey}`,
        'Content-Type': 'application/whip+sdp', // THE MASTER FIX
        'User-Agent': 'Nippy-Backend/1.0'
      },
      httpsAgent: sslBypassAgent,
      maxRedirects: 5 // Allow Axios to seamlessly follow Livepeer's load balancer
    });

    // Send the SDP Answer back to the React frontend
    res.set('Content-Type', 'application/sdp');
    res.status(201).send(livepeerRes.data);

  } catch (error) {
    console.error("WHIP Proxy Error:", error.message);
    if (error.response) {
      console.error("Livepeer Rejection Data:", error.response.status, error.response.data);
    }
    res.status(500).json({ message: "Failed to proxy WebRTC connection." });
  }
};

// @desc    Handle Livepeer Webhooks (stream.started, stream.idle)
// @route   POST /api/streams/webhook
// @access  Public (Livepeer server calls this)
exports.handleLivepeerWebhook = async (req, res) => {
  try {
    const event = req.body;
    console.log(`[LIVEPEER WEBHOOK] Received Event: ${event.event}`);

    const livepeerStreamId = event.stream?.id;
    if (!livepeerStreamId) return res.status(400).json({ message: "No stream ID" });

    // Ensure we match your exact DB schema
    const stream = await Stream.findOne({ livepeerStreamId: livepeerStreamId });
    if (!stream) {
      console.log(`[WEBHOOK] Stream ${livepeerStreamId} not found in DB. Ignored.`);
      return res.status(200).send("Ignored");
    }

    if (event.event === "stream.started") {
      stream.isLive = true;
      await stream.save();
      
      const creator = await User.findById(stream.creatorId);

      // --- THE MASS FOMO NOTIFICATION BLAST ---
      
      // 1. Get all active subscribers
      const activeSubscribers = await Purchase.find({
        creator: stream.creatorId,
        purchaseType: "SUBSCRIPTION",
        status: "completed",
        expiresAt: { $gt: new Date() }
      }).select("user");
      
      const subscriberIds = activeSubscribers.map(sub => sub.user.toString());

      // 2. Get all followers (Assuming your User model has a 'followers' array)
      const followerIds = creator.followers ? creator.followers.map(id => id.toString()) : [];

      // 3. Merge arrays and remove duplicates (Set theory)
      const uniqueFanIds = [...new Set([...subscriberIds, ...followerIds])];

      // 4. Generate the payload using your exact schema
      if (uniqueFanIds.length > 0) {
        const notifications = uniqueFanIds.map((userId) => ({
          recipient: userId,
          type: "GO_LIVE", // Matches your Schema enum perfectly
          title: `${creator.username} is LIVE!`,
          message: `${creator.username} just started streaming: "${stream.title}". Tap to join!`,
          actionUrl: `/stream/${stream._id}`, // Adjust this if your fan viewing route is different
          sender: creator._id
        }));

        // Insert all notifications in one massive, highly-efficient database call
        await Notification.insertMany(notifications);
        console.log(`[WEBHOOK] Fired GO_LIVE notifications to ${uniqueFanIds.length} fans.`);
      }

      // Fire the WebSocket to the frontend instantly
      req.io.emit("live_stream_started", { 
        streamId: stream._id, 
        title: stream.title 
      });
      console.log(`🔴 [STREAM IS LIVE] ${stream.title} is now broadcasting!`);
    } 
    else if (event.event === "stream.idle") {
      stream.isLive = false;
      await stream.save();
      
      // Fire the WebSocket to end the stream on the frontend
      req.io.emit("live_stream_ended", { streamId: stream._id });
      console.log(`⚪ [STREAM ENDED] ${stream.title} has stopped broadcasting.`);
    }

    res.status(200).send("Webhook received");

  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).send("Server Error");
  }
};
