const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Purchase = require("../models/Purchase");
const User = require("../models/User");
const {
  ethers,
} = require("ethers");
const Wallet = require("../models/Wallet");
const {
  S3Client,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const {
  getSignedUrl,
} = require("@aws-sdk/s3-request-presigner");



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

// @desc    Send a message (Enforces 24-hr PPV rule & Subscriptions)
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
      const {
        receiverId,
        text,
        fileKey,
        fileType,
        priceInUSDT,
      } =
        req.body;

      if (
        !receiverId
      ) {
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
      }

      if (
        !text &&
        !fileKey
      ) {
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
      }

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
      ) {
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
      }

      let creatorId,
        fanId;

      // --- THE GATEKEEPER ---
      // If the sender is a fan, they must pass the authorization check.
      if (
        sender.role ===
        "fan"
      ) {
        creatorId =
          receiverId;
        fanId =
          senderId;

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

        // We run ONE highly optimized query to check both conditions simultaneously
        const validAccess =
          await Purchase.findOne(
            {
              user: fanId,
              creator:
                creatorId,
              status:
                "completed",
              $or: [
                // Condition 1: Active Subscription (Expires in the future)
                {
                  purchaseType:
                    "SUBSCRIPTION",
                  expiresAt:
                    {
                      $gt: now,
                    },
                },
                // Condition 2: PPV bought within the last 24 hours
                {
                  purchaseType:
                    "PPV",
                  createdAt:
                    {
                      $gt: twentyFourHoursAgo,
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
                  "Access Denied. You must have an active subscription or have purchased a PPV in the last 24 hours to message this creator.",
                requiresPurchase: true,
              },
            );
        }
      } else {
        // If the sender is the creator, they can always message their fans
        creatorId =
          senderId;
        fanId =
          receiverId;
      }

      // 1. Find or Create the Conversation
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
            },
          );
      }

      // 2. Create the Message
      const isLockedPPV =
        sender.role ===
          "creator" &&
        priceInUSDT >
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
            fileType:
              fileType ||
              null,
            priceInUSDT:
              isLockedPPV
                ? priceInUSDT
                : 0,
          },
        );

      // 3. Update Conversation's Last Message for the Inbox view
      conversation.lastMessage =
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
        };
      await conversation.save();

      res
        .status(
          201,
        )
        .json(
          {
            message:
              "Message sent successfully",
            data: message,
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

// @desc    Get User's Inbox (List of Conversations)
// @route   GET /api/messages/inbox
exports.getInbox =
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

      // Fetch all conversations, sorted by most recently updated
      const conversations =
        await Conversation.find(
          {
            participants:
              userId,
          },
        )
          .populate(
            "creator",
            "username profileImage role",
          )
          .populate(
            "fan",
            "username profileImage role",
          )
          .sort(
            {
              updatedAt:
                -1,
            },
          )
          .lean();

      // Map the response so the frontend knows who the "other" person is easily
      const inbox =
        conversations.map(
          (
            conv,
          ) => {
            const isCreator =
              userId.toString() ===
              conv.creator._id.toString();
            const otherUser =
              isCreator
                ? conv.fan
                : conv.creator;

            return {
              _id: conv._id,
              otherUser,
              lastMessage:
                conv.lastMessage,
              updatedAt:
                conv.updatedAt,
            };
          },
        );

      res
        .status(
          200,
        )
        .json(
          inbox,
        );
    } catch (error) {
      console.error(
        "GetInbox Error:",
        error,
      );
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

      // 1. Verify the user is actually part of this conversation (Security)
      const conversation =
        await Conversation.findById(
          conversationId,
        );
      if (
        !conversation
      ) {
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
      }

      if (
        !conversation.participants.includes(
          userId,
        )
      ) {
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
      }

      // 2. Fetch the messages in chronological order
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

      // NOTE: If a message is a PPV message, your frontend will need to verify
      // if the user has purchased it before showing the clear Cloudflare URL.
      // We will build that unlock route next.

      res
        .status(
          200,
        )
        .json(
          messages,
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
exports.verifyMessagePayment = async (req, res) => {
  try {
    const { messageId, txHash } = req.body;
    const fanId = req.user._id || req.user.id;

    // 1. Replay Attack Check
    const existingPurchase = await Purchase.findOne({ txHash });
    if (existingPurchase) {
      return res.status(400).json({ message: "Fraud detected: Transaction hash already used." });
    }

    // 2. Fetch the Message & Creator
    const message = await Message.findById(messageId).populate("sender");
    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }
    if (message.priceInUSDT <= 0) {
      return res.status(400).json({ message: "This message is already free." });
    }

    const creator = message.sender;
    const expectedPrice = message.priceInUSDT;
    const expectedWallet = creator.walletAddress?.toLowerCase();

    if (!expectedWallet) {
      return res.status(400).json({ message: "Creator payout address not configured." });
    }

    // 3. Connect to Polygon & Verify On-Chain
    const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
    const tx = await provider.getTransaction(txHash);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!tx || !receipt || receipt.status !== 1) {
      return res.status(400).json({ message: "Transaction failed or not found on network." });
    }

    // 4. Verify USDT Contract & Decoding
    const USDT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F".toLowerCase();
    if (tx.to.toLowerCase() !== USDT_ADDRESS) {
      return res.status(400).json({ message: "Fraud: Transaction was not sent to the USDT contract." });
    }

    const iface = new ethers.Interface(["function transfer(address to, uint256 amount)"]);
    const decoded = iface.parseTransaction({ data: tx.data });
    
    const actualRecipient = decoded.args[0].toLowerCase();
    const actualAmount = ethers.formatUnits(decoded.args[1], 6); // 6 decimals for USDT

    if (actualRecipient !== expectedWallet) {
      return res.status(400).json({ message: "Fraud: Funds sent to wrong wallet." });
    }
    if (Number(actualAmount) < expectedPrice) {
      return res.status(400).json({ message: "Fraud: Insufficient funds sent." });
    }

    // 5. Save the Purchase Record
    const purchase = await Purchase.create({
      user: fanId,
      creator: creator._id,
      message: message._id, // LINKED TO THE MESSAGE!
      txHash,
      amountPaid: Number(actualAmount),
      purchaseType: "DM_UNLOCK",
      status: "completed"
    });

    // 6. Split Fee & Atomic Ledger Update (80% Creator / 20% Platform)
    const PLATFORM_FEE = 0.2;
    const creatorEarnings = Number((Number(actualAmount) * (1 - PLATFORM_FEE)).toFixed(4));

    await Wallet.findOneAndUpdate(
      { creator: creator._id },
      {
        $inc: {
          balanceUSDT: creatorEarnings,
          totalEarnedUSDT: creatorEarnings
        }
      },
      { upsert: true, returnDocument: "after" }
    );

    res.status(200).json({ message: "Message unlocked successfully!", purchase });
  } catch (error) {
    console.error("Message Payment Verification Error:", error);
    res.status(500).json({ message: "Server error verifying payment." });
  }
};

// @desc    Get secure 15-minute streaming URL for a DM attachment
// @route   GET /api/messages/:messageId/stream
exports.getSecureMessageMedia = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id || req.user.id;

    // 1. Fetch Message
    const message = await Message.findById(messageId);
    if (!message || !message.fileKey) {
      return res.status(404).json({ message: "Media not found." });
    }

    // 2. Zero-Trust Access Check
    const isCreator = message.sender.toString() === userId.toString();
    const isFree = message.priceInUSDT === 0;

    if (!isCreator && !isFree) {
      // If it's a locked message and they aren't the creator, verify they bought it
      const validPurchase = await Purchase.findOne({
        user: userId,
        message: messageId,
        purchaseType: "DM_UNLOCK",
        status: "completed"
      });

      if (!validPurchase) {
        return res.status(403).json({ message: "Access denied. You must purchase this message to view the media." });
      }
    }

    // 3. Generate 15-Minute Self-Destructing Cloudflare URL
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: message.fileKey,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    res.status(200).json({ streamUrl: signedUrl, fileType: message.fileType });
  } catch (error) {
    console.error("Message Media Access Error:", error);
    res.status(500).json({ message: "Server error generating media stream." });
  }
};
