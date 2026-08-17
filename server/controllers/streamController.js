// server/controllers/streamController.js
const axios = require("axios");
const Stream = require("../models/Stream");
const User = require("../models/User");
const Purchase = require("../models/Purchase");
const Notification = require("../models/Notification");

const LIVEPEER_API_URL =
  "https://livepeer.studio/api/stream";

// @desc    Initialize a Livepeer stream session
// @route   POST /api/streams/create
// @access  Private (Verified Creator)
exports.createStream =
  async (
    req,
    res,
  ) => {
    try {
      const {
        title,
        priceNGN,
      } =
        req.body;
      const creatorId =
        req
          .user
          ._id;

      if (
        !title
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Stream title is required.",
            },
          );
      }

      // 1. Call Livepeer Studio API to provision stream
      const livepeerRes =
        await axios.post(
          LIVEPEER_API_URL,
          {
            name: `Nippy_${creatorId}_${Date.now()}`,
            profiles:
              [
                {
                  name: "720p",
                  bitrate: 2000000,
                  fps: 30,
                  width: 1280,
                  height: 720,
                },
                {
                  name: "480p",
                  bitrate: 1000000,
                  fps: 30,
                  width: 854,
                  height: 480,
                },
                {
                  name: "360p",
                  bitrate: 500000,
                  fps: 30,
                  width: 640,
                  height: 360,
                },
              ],
          },
          {
            headers:
              {
                Authorization: `Bearer ${process.env.LIVEPEER_API_KEY}`,
                "Content-Type":
                  "application/json",
              },
          },
        );

      const {
        id: livepeerStreamId,
        streamKey,
        playbackId,
      } = livepeerRes.data;

      // 2. Save stream details to MongoDB
      const stream =
        await Stream.create(
          {
            creatorId,
            title,
            priceNGN:
              priceNGN ||
              0,
            isPaywalled:
              Number(
                priceNGN,
              ) >
              0,
            livepeerStreamId,
            streamKey,
            playbackId,
            status:
              "OFFLINE",
          },
        );

      res
        .status(
          201,
        )
        .json(
          {
            success: true,
            streamId:
              stream._id,
            playbackId:
              stream.playbackId,
            // Ingest URL and Stream Key are returned ONLY to the creator for OBS/streaming setup
            rtmpIngestUrl:
              "rtmp://rtmp.livepeer.com/live",
            streamKey,
          },
        );
    } catch (error) {
      console.error(
        "Create Stream Error:",
        error
          .response
          ?.data ||
          error.message,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to initialize live stream.",
          },
        );
    }
  };

// @desc    Get Playback Details & Gate Access for Fans
// @route   GET /api/streams/:id
// @access  Private
exports.getStream = async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id).populate(
      "creatorId",
      "username creatorProfile monetizationSettings"
    );

    if (!stream) {
      return res.status(404).json({
        message: "Stream not found.",
      });
    }

    // Bypass access check if the user requesting is the creator themselves
    const isCreator = String(stream.creatorId._id) === String(req.user._id);

    if (!isCreator) {
      // Check for an active, unexpired subscription
      const activeSubscription = await Purchase.findOne({
        user: req.user._id,
        creator: stream.creatorId._id,
        purchaseType: "SUBSCRIPTION",
        status: "completed",
        expiresAt: { $gt: new Date() }, // Ensures the subscription hasn't expired
      });

      if (!activeSubscription) {
        return res.status(403).json({
          message: "Access denied. An active subscription is required to view this live stream.",
          requiresSubscription: true,
          creatorId: stream.creatorId._id,
          // Pass the sub price back so the frontend can immediately prompt them to subscribe
          subscriptionPriceNGN: stream.creatorId.monetizationSettings?.monthlySubscription || 0,
        });
      }
    }

    res.status(200).json({
      success: true,
      stream: {
        _id: stream._id,
        title: stream.title,
        status: stream.status,
        playbackUrl: `https://livepeercdn.studio/hls/${stream.playbackId}/index.m3u8`,
        creator: stream.creatorId,
      },
    });
  } catch (error) {
    console.error("Get Stream Error:", error);
    res.status(500).json({
      message: "Error retrieving stream playback.",
    });
  }
};

// @desc    Livepeer Webhook Listener (Handles stream status transitions)
// @route   POST /api/streams/webhook
// @access  Public (Validated via event structure)
exports.handleWebhook =
  async (
    req,
    res,
  ) => {
    try {
      const {
        event,
        stream:
          lpStream,
      } =
        req.body;

      if (
        !lpStream ||
        !lpStream.id
      ) {
        return res
          .status(
            400,
          )
          .send(
            "Invalid webhook payload.",
          );
      }

      const stream =
        await Stream.findOne(
          {
            livepeerStreamId:
              lpStream.id,
          },
        );
      if (
        !stream
      ) {
        return res
          .status(
            200,
          )
          .send(
            "Stream not tracked by Nippy.",
          );
      }

      const io =
        req.io; // Socket.IO injected from server.js

      if (
        event ===
        "stream.started"
      ) {
        stream.status =
          "ACTIVE";
        stream.startedAt =
          new Date();
        await stream.save();

        // 1. Create Stateful Notification record
        const creator =
          await User.findById(
            stream.creatorId,
          );
        const notification =
          await Notification.create(
            {
              userId:
                stream.creatorId,
              type: "LIVE",
              status:
                "ACTIVE",
              message: `${creator.username} is now LIVE: "${stream.title}"`,
              targetId:
                stream._id,
            },
          );

        // 2. Broadcast instant WebSocket alert to all online clients
        if (
          io
        ) {
          io.emit(
            "live_stream_started",
            {
              streamId:
                stream._id,
              creatorId:
                stream.creatorId,
              creatorUsername:
                creator.username,
              title:
                stream.title,
              notificationId:
                notification._id,
            },
          );
        }
      } else if (
        event ===
        "stream.idle"
      ) {
        stream.status =
          "ENDED";
        stream.endedAt =
          new Date();
        await stream.save();

        // Update active notification status to ENDED
        await Notification.updateMany(
          {
            targetId:
              stream._id,
            type: "LIVE",
          },
          {
            status:
              "ENDED",
          },
        );

        // Broadcast WebSocket stream ended event
        if (
          io
        ) {
          io.emit(
            "live_stream_ended",
            {
              streamId:
                stream._id,
              creatorId:
                stream.creatorId,
            },
          );
        }
      }

      res
        .status(
          200,
        )
        .send(
          "Webhook processed successfully.",
        );
    } catch (error) {
      console.error(
        "Livepeer Webhook Error:",
        error,
      );
      res
        .status(
          500,
        )
        .send(
          "Webhook handler failure.",
        );
    }
  };

// @desc    End an active live stream
// @route   PUT /api/streams/:id/end
// @access  Private
exports.endStream = async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);

    if (!stream) {
      return res.status(404).json({ message: "Stream not found." });
    }

    // Ensure only the creator can end their stream
    if (String(stream.creatorId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized to end this stream." });
    }

    // Terminate it
    stream.status = "ENDED";
    await stream.save();

    res.status(200).json({ success: true, message: "Stream successfully ended." });
  } catch (error) {
    console.error("End Stream Error:", error);
    res.status(500).json({ message: "Failed to end stream." });
  }
};
