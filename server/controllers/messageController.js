const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Purchase = require("../models/Purchase");
const User = require("../models/User");
const {
  ethers,
} = require("ethers");
const Wallet = require("../models/Wallet");
const {
  convertAndRoundPrice,
} = require("../utils/currencyConversion");

const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const {
  getSignedUrl,
} = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");

const s3Client =
  new S3Client(
    {
      region:
        process
          .env
          .S3_REGION ||
        "auto",
      endpoint:
        process
          .env
          .S3_ENDPOINT,
      forcePathStyle: true,
      credentials:
        {
          accessKeyId:
            process
              .env
              .S3_ACCESS_KEY,
          secretAccessKey:
            process
              .env
              .S3_SECRET_KEY,
        },
    },
  );

// @desc    Send a message (Enforces Bundles, 24-hr PPV rule, Subscriptions, & Audio Uploads)
// @route   POST /api/messages/send
exports.sendMessage =
  async (
    req,
    res,
  ) => {
    try {
      const senderId =
        req
          .user
          ._id ||
        req
          .user
          .id;
      let {
        receiverId,
        text,
        isVaultLink,
      } =
        req.body;
      let fileKey =
        req
          .body
          .fileKey;
      let fileType =
        req
          .body
          .fileType;
      let price =
        Number(
          req
            .body
            .price,
        ) ||
        0;
      let fileUrl =
        null;

      if (
        !receiverId
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Receiver ID is required.",
            },
          );
      if (
        !text &&
        !fileKey &&
        !req.file
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Message cannot be empty.",
            },
          );

      const sender =
        await User.findById(
          senderId,
        );
      const receiver =
        await User.findById(
          receiverId,
        );
      if (
        !sender ||
        !receiver
      )
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "User not found.",
            },
          );

      let conversation =
        await Conversation.findOne(
          {
            participants:
              {
                $all: [
                  senderId,
                  receiverId,
                ],
              },
          },
        );

      let creatorId,
        fanId;
      let actingAsFan = false;

      if (
        conversation
      ) {
        creatorId =
          conversation.creator.toString();
        fanId =
          conversation.fan.toString();
        actingAsFan =
          senderId.toString() ===
          fanId;
      } else {
        if (
          sender.role ===
          "fan"
        ) {
          creatorId =
            receiverId;
          fanId =
            senderId;
          actingAsFan = true;
        } else {
          creatorId =
            senderId;
          fanId =
            receiverId;
          actingAsFan = false;
        }
      }

      // --- THE GATEKEEPER: FAN BUSINESS RULES ---
      if (
        actingAsFan
      ) {
        if (
          text &&
          text.length >
            200
        )
          return res
            .status(
              400,
            )
            .json(
              {
                message:
                  "Fan messages are limited to 200 characters to prevent spam.",
              },
            );
        if (
          req.file ||
          fileKey ||
          fileType
        )
          return res
            .status(
              400,
            )
            .json(
              {
                message:
                  "Fans are restricted to text-only messages.",
              },
            );

        if (
          !conversation ||
          conversation.bubblesLeft <=
            0
        ) {
          return res
            .status(
              402,
            )
            .json(
              {
                message:
                  "Message bundle exhausted. Purchase a new bundle to keep chatting.",
                requiresBundle: true,
              },
            );
        }

        const now =
          new Date();
        const twentyFourHoursAgo =
          new Date(
            now.getTime() -
              24 *
                60 *
                60 *
                1000,
          );

        const validAccess =
          await Purchase.findOne(
            {
              user: fanId,
              creator:
                creatorId,
              status:
                "completed",
              $or: [
                {
                  purchaseType:
                    "SUBSCRIPTION",
                  expiresAt:
                    {
                      $gt: now,
                    },
                },
                {
                  purchaseType:
                    "PPV",
                  createdAt:
                    {
                      $gt: twentyFourHoursAgo,
                    },
                },
                {
                  purchaseType:
                    {
                      $in: [
                        "CHAT_BUNDLE",
                        "MESSAGE_BUNDLE",
                      ],
                    },
                },
              ],
            },
          );

        if (
          !validAccess
        ) {
          return res
            .status(
              403,
            )
            .json(
              {
                message:
                  "Access Denied. You must have an active subscription, purchased a PPV in the last 24 hours, or a Chat Bundle.",
                requiresPurchase: true,
              },
            );
        }
      }
      // --- THE GATEKEEPER: CREATOR BUSINESS RULES ---
      else if (
        !actingAsFan
      ) {
        if (
          req.file
        ) {
          if (
            !req.file.mimetype.includes(
              "audio",
            )
          )
            return res
              .status(
                403,
              )
              .json(
                {
                  message:
                    "Only voice notes can be uploaded directly.",
                },
              );

          const randomName =
            crypto
              .randomBytes(
                16,
              )
              .toString(
                "hex",
              );
          fileKey = `voice-notes/${randomName}.webm`;
          fileType =
            req
              .file
              .mimetype;

          await s3Client.send(
            new PutObjectCommand(
              {
                Bucket:
                  process
                    .env
                    .S3_BUCKET_NAME,
                Key: fileKey,
                Body: req
                  .file
                  .buffer,
                ContentType:
                  fileType,
              },
            ),
          );

          let domain =
            process
              .env
              .R2_PUBLIC_DOMAIN;
          if (
            !domain.startsWith(
              "http",
            )
          )
            domain = `https://${domain}`;
          if (
            domain.endsWith(
              "/",
            )
          )
            domain =
              domain.slice(
                0,
                -1,
              );
          fileUrl = `${domain}/${fileKey}`;
        }

        if (
          fileKey
        ) {
          const vaultLink =
            isVaultLink ===
              "true" ||
            isVaultLink ===
              true;
          const isVoiceNote =
            fileType?.includes(
              "audio",
            );

          if (
            !isVoiceNote &&
            !vaultLink
          ) {
            return res
              .status(
                403,
              )
              .json(
                {
                  message:
                    "Direct media uploads are blocked. You may only send 20-second Voice Notes or attach content already uploaded to your Vault.",
                },
              );
          }
        }
      }

      if (
        !conversation
      ) {
        conversation =
          await Conversation.create(
            {
              participants:
                [
                  senderId,
                  receiverId,
                ],
              creator:
                creatorId,
              fan: fanId,
              bubblesLeft: 0,
            },
          );
      }

      const isLockedPPV =
        !actingAsFan &&
        price >
          0;
      const message =
        await Message.create(
          {
            conversationId:
              conversation._id,
            sender:
              senderId,
            receiver:
              receiverId,
            text:
              text ||
              "",
            fileKey:
              fileKey ||
              null,
            fileUrl:
              fileUrl ||
              null,
            fileType:
              fileType ||
              null,
            price:
              isLockedPPV
                ? price
                : 0,
            isRead: false,
          },
        );

      const updatePayload =
        {
          $set: {
            lastMessage:
              {
                text: isLockedPPV
                  ? "🔒 Locked Message"
                  : text ||
                    "📸 Media attachment",
                sender:
                  senderId,
                createdAt:
                  message.createdAt,
                isLockedPPV:
                  isLockedPPV,
              },
          },
        };

      if (
        actingAsFan
      )
        updatePayload.$inc =
          {
            bubblesLeft:
              -1,
          };

      const updatedConversation =
        await Conversation.findByIdAndUpdate(
          conversation._id,
          updatePayload,
          {
            new: true,
          },
        );

      req.io
        .to(
          conversation._id.toString(),
        )
        .emit(
          "receive_message",
          message,
        );

      res
        .status(
          201,
        )
        .json(
          {
            message:
              "Message sent successfully",
            data: message,
            bubblesLeft:
              updatedConversation.bubblesLeft,
          },
        );
    } catch (error) {
      console.error(
        "SendMessage Error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error sending message.",
          },
        );
    }
  };

// @desc    Verify crypto payment and credit message bubbles
// @route   POST /api/messages/buy-bundle
// @access  Private (Fan)
exports.buyMessageBundle =
  async (
    req,
    res,
  ) => {
    try {
      const {
        creatorId,
        txHash,
        amountPaid,
      } =
        req.body;
      const fanId =
        req
          .user
          ._id ||
        req
          .user
          .id;

      const creator =
        await User.findById(
          creatorId,
        );
      if (
        !creator ||
        creator.role !==
          "creator"
      )
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "Creator not found",
            },
          );

      const bundleSize =
        creator
          .monetizationSettings
          ?.messageBundleSize ||
        5;

      const purchase =
        new Purchase(
          {
            user: fanId,
            creator:
              creatorId,
            txHash,
            amountPaid,
            purchaseType:
              "MESSAGE_BUNDLE",
            status:
              "completed",
          },
        );

      await purchase.save();

      let conversation =
        await Conversation.findOne(
          {
            creator:
              creatorId,
            fan: fanId,
          },
        );
      if (
        !conversation
      ) {
        conversation =
          new Conversation(
            {
              participants:
                [
                  creatorId,
                  fanId,
                ],
              creator:
                creatorId,
              fan: fanId,
              bubblesLeft:
                bundleSize,
              lifetimeValue:
                amountPaid,
            },
          );
      } else {
        conversation.bubblesLeft +=
          bundleSize;
        conversation.lifetimeValue +=
          amountPaid;
      }
      await conversation.save();

      return res
        .status(
          200,
        )
        .json(
          {
            success: true,
            bubblesLeft:
              conversation.bubblesLeft,
            conversationId:
              conversation._id,
          },
        );
    } catch (error) {
      if (
        error.code ===
        11000
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Transaction hash already processed.",
            },
          );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to process message bundle purchase.",
          },
        );
    }
  };

// @desc    Get User's Inbox (List of Conversations)
// @route   GET /api/messages/inbox
exports.getInbox = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const conversations = await Conversation.find({ participants: userId })
      // --- IRONCLAD FIX ---
      // We MUST populate walletAddress and monetizationSettings here.
      // If we don't, the Inbox UI falls back to 5 USD pricing and crypto payments crash.
      .populate(
        "creator", 
        "username profileImage role walletAddress monetizationSettings"
      )
      .populate(
        "fan", 
        "username profileImage role walletAddress monetizationSettings"
      )
      .sort({ updatedAt: -1 })
      .lean();

      const inbox =
        await Promise.all(
          conversations.map(
            async (
              conv,
            ) => {
              const isCreator =
                userId.toString() ===
                conv.creator._id.toString();
              const otherUser =
                isCreator
                  ? conv.fan
                  : conv.creator;
              const unreadCount =
                await Message.countDocuments(
                  {
                    conversationId:
                      conv._id,
                    receiver:
                      userId,
                    isRead: false,
                  },
                );

              return {
                ...conv,
                otherUser,
                unreadCount,
              };
            },
          ),
        );

      res
        .status(
          200,
        )
        .json(
          inbox,
        );
    } catch (error) {
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error fetching inbox.",
          },
        );
    }
  };

// @desc    Get Messages for a specific Conversation
// @route   GET /api/messages/:conversationId
exports.getMessages =
  async (
    req,
    res,
  ) => {
    try {
      const userId =
        req
          .user
          ._id ||
        req
          .user
          .id;
      const {
        conversationId,
      } =
        req.params;

      // THE FIX: Enforce Hybrid Strategy for DM Quotes
      const viewerCurrencyPref =
        req
          .user
          ?.preferredCurrency ||
        req
          .user
          ?.country ||
        "USD";

      const conversation =
        await Conversation.findById(
          conversationId,
        )
          .populate(
            "creator",
            "username profileImage walletAddress monetizationSettings preferredCurrency",
          )
          .lean();

      if (
        !conversation
      )
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "Conversation not found.",
            },
          );

      const isParticipant =
        conversation.participants.some(
          (
            participant,
          ) =>
            participant.toString() ===
            userId.toString(),
        );
      if (
        !isParticipant
      )
        return res
          .status(
            403,
          )
          .json(
            {
              message:
                "Unauthorized to view these messages.",
            },
          );

      await Message.updateMany(
        {
          conversationId:
            conversationId,
          receiver:
            userId,
          isRead: false,
        },
        {
          $set: {
            isRead: true,
          },
        },
      );

      const messages =
        await Message.find(
          {
            conversationId,
          },
        )
          .sort(
            {
              createdAt: 1,
            },
          )
          .lean();

      const creatorSettings =
        conversation
          .creator
          .monetizationSettings ||
        {};
      const baseBundlePriceNGN =
        creatorSettings.messageBundlePrice ||
        0;

      // THE FIX: Cleanly convert and round using user preference
      const bundlePricing =
        await convertAndRoundPrice(
          baseBundlePriceNGN,
          viewerCurrencyPref,
        );

      res
        .status(
          200,
        )
        .json(
          {
            conversation,
            messages,
            chatInfo:
              {
                bundleSize:
                  creatorSettings.messageBundleSize ||
                  5,
                bundleDisplayPrice:
                  bundlePricing.displayPrice,
                bundleDisplayCurrency:
                  bundlePricing.displayCurrency,
                bundlePaystackNGN:
                  bundlePricing.paystackNGNAmount,
              },
          },
        );
    } catch (error) {
      console.error(
        "GetMessages Error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error fetching messages.",
          },
        );
    }
  };

// @desc    Verify USDT payment for a locked DM and grant access
// @route   POST /api/messages/unlock
exports.verifyMessagePayment =
  async (
    req,
    res,
  ) => {
    try {
      const {
        messageId,
        txHash,
      } =
        req.body;
      const fanId =
        req
          .user
          ._id ||
        req
          .user
          .id;

      const existingPurchase =
        await Purchase.findOne(
          {
            txHash,
          },
        );
      if (
        existingPurchase
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Fraud detected: Transaction hash already used.",
            },
          );

      const message =
        await Message.findById(
          messageId,
        ).populate(
          "sender",
        );
      if (
        !message
      )
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "Message not found.",
            },
          );
      if (
        message.price <=
        0
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "This message is already free.",
            },
          );

      const creator =
        message.sender;
      const expectedPrice =
        message.price;
      const expectedWallet =
        creator.walletAddress?.toLowerCase();

      if (
        !expectedWallet
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Creator payout address not configured.",
            },
          );

      const provider =
        new ethers.JsonRpcProvider(
          "https://polygon-rpc.com",
        );
      const tx =
        await provider.getTransaction(
          txHash,
        );
      const receipt =
        await provider.getTransactionReceipt(
          txHash,
        );

      if (
        !tx ||
        !receipt ||
        receipt.status !==
          1
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Transaction failed or not found on network.",
            },
          );

      const USDT_ADDRESS =
        "0xc2132D05D31c914a87C6611C10748AEb04B58e8F".toLowerCase();
      if (
        tx.to.toLowerCase() !==
        USDT_ADDRESS
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Fraud: Transaction was not sent to the USDT contract.",
            },
          );

      const iface =
        new ethers.Interface(
          [
            "function transfer(address to, uint256 amount)",
          ],
        );
      const decoded =
        iface.parseTransaction(
          {
            data: tx.data,
          },
        );

      const actualRecipient =
        decoded.args[0].toLowerCase();
      const actualAmount =
        ethers.formatUnits(
          decoded
            .args[1],
          6,
        );

      if (
        actualRecipient !==
        expectedWallet
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Fraud: Funds sent to wrong wallet.",
            },
          );

      // We leave this expectedPrice check as-is for now, but note it might require an update
      // once purchaseController.js is fully migrated to the new quote validation system.
      if (
        Number(
          actualAmount,
        ) <
        expectedPrice
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Fraud: Insufficient funds sent.",
            },
          );

      const purchase =
        await Purchase.create(
          {
            user: fanId,
            creator:
              creator._id,
            message:
              message._id,
            txHash,
            amountPaid:
              Number(
                actualAmount,
              ),
            purchaseType:
              "DM_UNLOCK",
            status:
              "completed",
          },
        );

      const PLATFORM_FEE = 0.2;
      const creatorEarnings =
        Number(
          (
            Number(
              actualAmount,
            ) *
            (1 -
              PLATFORM_FEE)
          ).toFixed(
            4,
          ),
        );

      await Wallet.findOneAndUpdate(
        {
          creator:
            creator._id,
        },
        {
          $inc: {
            balanceUSDT:
              creatorEarnings,
            totalEarnedUSDT:
              creatorEarnings,
          },
        },
        {
          upsert: true,
          returnDocument:
            "after",
        },
      );

      res
        .status(
          200,
        )
        .json(
          {
            message:
              "Message unlocked successfully!",
            purchase,
          },
        );
    } catch (error) {
      console.error(
        "Message Payment Verification Error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error verifying payment.",
          },
        );
    }
  };

// @desc    Get secure 5-minute streaming URL for a DM attachment
// @route   GET /api/messages/:messageId/stream
exports.getSecureMessageMedia = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id || req.user.id;

    // THE FIX: Populate sender so we can check their NSFW status for the Age Gate
    const message = await Message.findById(messageId).populate("sender");
    if (!message || !message.fileKey) {
      return res.status(404).json({ message: "Media not found." });
    }

    // Safely check isCreator whether sender was populated or not
    const isCreator = message.sender._id 
      ? message.sender._id.toString() === userId.toString()
      : message.sender.toString() === userId.toString();

    // =================================================================
    // 1. SECURITY CHECK: THE AGE VERIFICATION GATE
    // =================================================================
    const isNsfw = message.isNsfw === true || message.sender.willingNsfw === true;
    if (!isCreator && isNsfw && req.user.isAgeVerified !== true) {
      return res.status(403).json({
        error: "SECURITY BLOCK: Age verification required for this explicit content.",
        isAgeRestricted: true
      });
    }
    // =================================================================

    const isFree = message.price === 0;

    // 2. PAYMENT CHECK: Ensure they bought it if it isn't free
    if (!isCreator && !isFree) {
      const validPurchase = await Purchase.findOne({
        user: userId,
        message: messageId,
        purchaseType: "DM_UNLOCK",
        status: "completed",
      });

      if (!validPurchase) {
        return res.status(403).json({
          message: "Access denied. You must purchase this message to view the media.",
        });
      }
    }

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: message.fileKey,
    });
    
    // THE FIX: Dropped to 300 seconds (5 mins) to prevent link sharing piracy
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300, 
    });

    res.status(200).json({
      streamUrl: signedUrl,
      fileType: message.fileType,
    });
  } catch (error) {
    console.error("Message Media Access Error:", error);
    res.status(500).json({
      message: "Server error generating media stream.",
    });
  }
};

// @desc    Get total unread messages count for the layout badge
// @route   GET /api/messages/unread-count
exports.getUnreadCount =
  async (
    req,
    res,
  ) => {
    try {
      const userId =
        req
          .user
          ._id ||
        req
          .user
          .id;
      const unreadCount =
        await Message.countDocuments(
          {
            receiver:
              userId,
            isRead: false,
          },
        );
      res
        .status(
          200,
        )
        .json(
          {
            unreadCount,
          },
        );
    } catch (error) {
      console.error(
        "GetUnreadCount Error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error fetching unread count.",
          },
        );
    }
  };
