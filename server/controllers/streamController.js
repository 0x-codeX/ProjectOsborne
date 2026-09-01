// server/controllers/streamController.js
const {
  RtcTokenBuilder,
  RtcRole,
} = require("agora-access-token");
const Stream = require("../models/Stream");
const User = require("../models/User");
const Purchase = require("../models/Purchase");
const Notification = require("../models/Notification");

// @desc    Initialize a DB stream session
// @route   POST /api/streams/create
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
      )
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

      // We no longer call a third-party API. The Stream ID *is* the Agora Channel Name.
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
            status:
              "OFFLINE",
            startedAt:
              Date.now(),
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
          },
        );
    } catch (error) {
      console.error(
        "Create Stream Error:",
        error,
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

// @desc    Get Playback Details & Generate Agora Token
// @route   GET /api/streams/:id
exports.getStream =
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
        ).populate(
          "creatorId",
          "username creatorProfile monetizationSettings subscribers walletAddress",
        );

      if (
        !stream
      )
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

      const creatorIdObj =
        stream
          .creatorId
          ._id ||
        stream.creatorId;
      const isCreator =
        String(
          creatorIdObj,
        ) ===
        String(
          req
            .user
            ._id,
        );

      // --- HYBRID PAYWALL CHECK ---
      if (
        !isCreator
      ) {
        const activeSubscription =
          await Purchase.findOne(
            {
              user: req
                .user
                ._id,
              creator:
                creatorIdObj,
              purchaseType:
                "SUBSCRIPTION",
              status:
                "completed",
              $or: [
                {
                  expiresAt:
                    {
                      $gt: new Date(),
                    },
                },
                {
                  expiresAt:
                    {
                      $exists: false,
                    },
                },
                {
                  expiresAt:
                    null,
                },
              ],
            },
          );

        const creatorDoc =
          await User.findById(
            creatorIdObj,
          );
        const isSubbedInArray =
          creatorDoc?.subscribers?.includes(
            req
              .user
              ._id,
          );

        if (
          !activeSubscription &&
          !isSubbedInArray
        ) {
          return res
            .status(
              403,
            )
            .json(
              {
                message:
                  "Access denied. An active subscription is required to view this live stream.",
                requiresSubscription: true,
                creatorId:
                  creatorIdObj,
                subscriptionPriceNGN:
                  stream
                    .creatorId
                    .monetizationSettings
                    ?.monthlySubscription ||
                  0,
              },
            );
        }
      }

      // --- AGORA TOKEN GENERATION ---
      const role =
        isCreator
          ? RtcRole.PUBLISHER
          : RtcRole.SUBSCRIBER;
      const privilegeExpiredTs =
        Math.floor(
          Date.now() /
            1000,
        ) +
        3600 *
          4; // 4 Hour Limit

      const agoraToken =
        RtcTokenBuilder.buildTokenWithUid(
          process
            .env
            .AGORA_APP_ID,
          process
            .env
            .AGORA_APP_CERTIFICATE,
          stream._id.toString(), // Channel Name
          0, // Let Agora auto-assign UID
          role,
          privilegeExpiredTs,
        );

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
                creator:
                  stream.creatorId,
                agoraAppId:
                  process
                    .env
                    .AGORA_APP_ID, // Send App ID securely to frontend
                agoraToken:
                  agoraToken,
              },
          },
        );
    } catch (error) {
      console.error(
        "Get Stream Error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Error retrieving stream data.",
          },
        );
    }
  };

// @desc    Fire FOMO Notifications when Creator Connects
// @route   PUT /api/streams/:id/go-live
exports.goLive =
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
        String(
          stream.creatorId,
        ) !==
        String(
          req
            .user
            ._id,
        )
      )
        return res
          .status(
            403,
          )
          .json(
            {
              message:
                "Unauthorized",
            },
          );

      stream.status =
        "LIVE";
      stream.isLive = true;
      await stream.save();

      const creator =
        await User.findById(
          stream.creatorId,
        );

      // FIXED: Sync the Live Status to the User Model so old posts light up!
      creator.isLive = true;
      creator.currentStreamId =
        stream._id;
      await creator.save();

      const activeSubscribers =
        await Purchase.find(
          {
            creator:
              stream.creatorId,
            purchaseType:
              "SUBSCRIPTION",
            status:
              "completed",
            expiresAt:
              {
                $gt: new Date(),
              },
          },
        ).select(
          "user",
        );

      const subscriberIds =
        activeSubscribers.map(
          (
            sub,
          ) =>
            sub.user.toString(),
        );
      const followerIds =
        creator.followers
          ? creator.followers.map(
              (
                id,
              ) =>
                id.toString(),
            )
          : [];
      const uniqueFanIds =
        [
          ...new Set(
            [
              ...subscriberIds,
              ...followerIds,
            ],
          ),
        ];

      if (
        uniqueFanIds.length >
        0
      ) {
        const notifications =
          uniqueFanIds.map(
            (
              userId,
            ) => ({
              recipient:
                userId,
              type: "GO_LIVE",
              title: `${creator.username} is LIVE!`,
              message: `${creator.username} just started streaming: "${stream.title}". Tap to join!`,
              actionUrl: `/live/${stream._id}`,
              sender:
                creator._id,
            }),
          );
        await Notification.insertMany(
          notifications,
        );
      }

      req.io.emit(
        "live_stream_started",
        {
          streamId:
            stream._id,
          title:
            stream.title,
          creatorId:
            stream.creatorId, // FIXED: Announce exactly who went live
        },
      );
      res
        .status(
          200,
        )
        .json(
          {
            success: true,
          },
        );
    } catch (error) {
      console.error(
        "Go Live Error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to trigger live status.",
          },
        );
    }
  };

// @desc    End an active live stream
// @route   PUT /api/streams/:id/end
exports.endStream = async (req, res) => {
  try {
    const stream =
      await Stream.findById(
        req
          .params
          .id,
      );
    if (
      !stream ||
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
              "Unauthorized.",
          },
        );
    }

    // Update database state
    stream.status =
      "ENDED";
    stream.isLive = false;
    stream.endedAt =
      Date.now();
    await stream.save();

    // FIXED: Clear the Live Status from the User Model securely
    const creatorToUpdate =
      await User.findById(
        stream.creatorId,
      );
    if (
      creatorToUpdate
    ) {
      creatorToUpdate.isLive = false;
      creatorToUpdate.currentStreamId =
        null;
      await creatorToUpdate.save();
    }

    // CRITICAL FIX: Broadcast the kill signal to all connected fans
    if (
      req.io
    ) {
      req.io.emit(
        "live_stream_ended",
        {
          streamId:
            stream._id,
        },
      );
    }

    res
      .status(
        200,
      )
      .json(
        {
          success: true,
        },
      );
  } catch (error) {
    res.status(500).json({ message: "Failed to end stream." });
  }
};
