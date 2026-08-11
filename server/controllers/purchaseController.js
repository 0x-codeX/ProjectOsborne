const {
  ethers,
} = require("ethers");
const axios = require("axios");
const Purchase = require("../models/Purchase");
const User = require("../models/User");
const Content = require("../models/Content");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Wallet = require("../models/Wallet");
const Notification = require("../models/Notification");
const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const {
  getSignedUrl,
} = require("@aws-sdk/s3-request-presigner");

// Initialize R2 Client
const s3 =
  new S3Client(
    {
      region:
        "auto",
      endpoint: `https://${process.env.S3_ACCOUNT_ID}.r2.cloudflarestorage.com`,
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

// POST /api/purchases/verify
exports.verifyPayment = async (req, res) => {
  try {
    // 1. ADDED subscriptionTier HERE
    const {
      contentId,
      creatorId,
      txHash,
      reference,
      paymentMethod,
      purchaseType,
      messageId,
      subscriptionTier 
    } = req.body;
    
    const buyerId = req.user._id;

    const normalizedPurchaseType = purchaseType ? purchaseType.trim().toUpperCase() : "";

    // 1. IDEMPOTENCY CHECK
    const uniqueId =
      paymentMethod ===
      "FIAT"
        ? reference
        : txHash;
    if (
      !uniqueId
    )
      return res
        .status(
          400,
        )
        .json(
          {
            message:
              "Transaction hash or reference required.",
          },
        );

    const existingPurchase =
      await Purchase.findOne(
        {
          $or: [
            {
              txHash:
                uniqueId,
            },
            {
              fiatReference:
                uniqueId,
            },
          ],
        },
      );
    if (existingPurchase) {
      return res.status(200).json({
        message: "Payment already verified and fulfilled.",
        purchase: existingPurchase,
      });
    }

    // 2. Branch Logic: Fetch Creator & Determine Expected Price
    let creator =
      await User.findById(
        creatorId,
      );
    let content = null;
    let expectedPrice = 0;

    if (normalizedPurchaseType === "SUBSCRIPTION") {
      if (!creatorId) return res.status(400).json({ message: "creatorId is required." });
      
      creator = await User.findById(creatorId);
      if (!creator) return res.status(404).json({ message: "Creator not found." });

      // ENTIRE TIER CHECK MUST BE INSIDE THIS SUBSCRIPTION BLOCK
      if (subscriptionTier === "Weekly") {
        expectedPrice = creator.monetizationSettings?.weeklySubscription || 0;
      } else if (subscriptionTier === "Monthly") {
        expectedPrice = creator.monetizationSettings?.monthlySubscription || 0;
      } else if (subscriptionTier && subscriptionTier.includes("Bundle")) {
        expectedPrice = creator.monetizationSettings?.multiMonthPrice || 0;
      } else {
        expectedPrice = creator.monetizationSettings?.monthlySubscription || 0;
      }

      if (expectedPrice === 0) {
        return res.status(400).json({ message: "Requested subscription tier is not enabled by creator." });
      }

    } else if (normalizedPurchaseType === "CHAT_BUNDLE") {
      if (!creatorId) return res.status(400).json({ message: "creatorId is required." });
      
      creator = await User.findById(creatorId);
      if (!creator) return res.status(404).json({ message: "Creator not found." });
      
      expectedPrice = creator.monetizationSettings?.messageBundlePrice || 0;
      if (expectedPrice === 0) return res.status(400).json({ message: "Creator has not enabled chat bundles." });

    } else if (normalizedPurchaseType === "PPV") {
      if (!contentId) return res.status(400).json({ message: "contentId is required for PPV." });
      
      content = await Content.findById(contentId).populate("creator");
      if (!content) return res.status(404).json({ message: "Content not found." });
      
      creator = content.creator;
      expectedPrice = content.priceInUSDT !== null 
        ? content.priceInUSDT 
        : creator.monetizationSettings?.defaultPPVPrice || 0;

    } else if (normalizedPurchaseType === "DM_UNLOCK") {
      if (!messageId) return res.status(400).json({ message: "messageId is required for DM unlocks." });
      
      content = await Message.findById(messageId).populate("sender");
      if (!content) return res.status(404).json({ message: "Message not found." });
      
      creator = content.sender;
      expectedPrice = content.priceInUSDT || 0;
    }

    if (
      !creator ||
      !creator.walletAddress
    ) {
      return res
        .status(
          400,
        )
        .json(
          {
            message:
              "Creator payout wallet address is not configured.",
          },
        );
    }

    const expectedWallet =
      creator.walletAddress.toLowerCase();

    // 3. Connect to RPC with Retry Mechanism
    const rpcUrl =
      process
        .env
        .POLYGON_RPC_URL;
    if (
      !rpcUrl
    )
      throw new Error(
        "Missing POLYGON_RPC_URL in .env file",
      );
    const provider =
      new ethers.JsonRpcProvider(
        rpcUrl,
      );

    // 4. Fetch Blockchain Transaction & Receipt (Retry loop prevents RPC 400 errors)
    let tx =
      null;
    let receipt =
      null;
    let retries = 3;

    for (
      let i = 0;
      i <
      retries;
      i++
    ) {
      try {
        tx =
          await provider.getTransaction(
            txHash,
          );
        if (
          tx
        ) {
          receipt =
            await provider.getTransactionReceipt(
              txHash,
            );
          if (
            receipt
          )
            break;
        }
      } catch (rpcErr) {
        console.warn(
          `[WARN] RPC poll attempt ${i + 1} failed, retrying...`,
        );
      }
      await new Promise(
        (
          resolve,
        ) =>
          setTimeout(
            resolve,
            1500,
          ),
      );
    }

    if (
      !tx ||
      !receipt
    ) {
      return res
        .status(
          400,
        )
        .json(
          {
            message:
              "Transaction indexing delayed on RPC node. Please refresh in a moment.",
          },
        );
    }

    if (
      receipt.status !==
      1
    ) {
      return res
        .status(
          400,
        )
        .json(
          {
            message:
              "Transaction failed or reverted on-chain.",
          },
        );
    }

    // 5. Verify Gateway Contract
    const GATEWAY_ADDRESS =
      process.env.NIPPY_GATEWAY_ADDRESS?.toLowerCase();
    const USDT_ADDRESS =
      process.env.MOCK_USDT_ADDRESS?.toLowerCase();

    if (
      tx.to.toLowerCase() !==
      GATEWAY_ADDRESS
    ) {
      return res
        .status(
          400,
        )
        .json(
          {
            message:
              "Fraud: Transaction was not sent to Gateway contract.",
          },
        );
    }

    // 6. Decode Input Data
    const iface =
      new ethers.Interface(
        [
          "function purchaseWithERC20(address token, address creator, bytes32 contentId, uint256 price)",
        ],
      );

    let decoded;
    try {
      decoded =
        iface.parseTransaction(
          {
            data: tx.data,
          },
        );
    } catch (err) {
      return res
        .status(
          400,
        )
        .json(
          {
            message:
              "Fraud: Invalid transaction signature.",
          },
        );
    }

    const actualToken =
      decoded.args[0].toLowerCase();
    const actualRecipient =
      decoded.args[1].toLowerCase();
    const actualAmount =
      ethers.formatUnits(
        decoded
          .args[3],
        6,
      );

    if (
      actualToken !==
      USDT_ADDRESS
    )
      return res
        .status(
          400,
        )
        .json(
          {
            message:
              "Fraud: Incorrect token used.",
          },
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
              "Fraud: Wallet mismatch.",
          },
        );
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
              "Fraud: Insufficient payment.",
          },
        );

    // 7. CREATE PURCHASE RECORD WITH DYNAMIC EXPIRATION
    let expiresAt =
      null;
    if (
      normalizedPurchaseType ===
      "SUBSCRIPTION"
    ) {
      const now =
        new Date();
      if (
        subscriptionTier ===
        "Weekly"
      ) {
        expiresAt =
          new Date(
            now.setDate(
              now.getDate() +
                7,
            ),
          );
      } else if (
        subscriptionTier &&
        subscriptionTier.includes(
          "Bundle",
        )
      ) {
        // Fallback to 3 months if not explicitly set
        const months =
          creator
            .monetizationSettings
            ?.multiMonthDuration ||
          3;
        expiresAt =
          new Date(
            now.setMonth(
              now.getMonth() +
                months,
            ),
          );
      } else {
        // Default to Monthly
        expiresAt =
          new Date(
            now.setDate(
              now.getDate() +
                30,
            ),
          );
      }
    }

    const purchase =
      await Purchase.create(
        {
          user: buyerId,
          content:
            normalizedPurchaseType ===
            "PPV"
              ? content._id
              : null,
          message:
            normalizedPurchaseType ===
            "DM_UNLOCK"
              ? content._id
              : null,
          creator:
            creator._id ||
            creator,
          txHash,
          amountPaid:
            Number(
              actualAmount,
            ),
          purchaseType:
            normalizedPurchaseType,
          expiresAt,
          status:
            "completed",
        },
      );

    // 7.5 FULFILLMENT: UNLOCK CONTENT/MESSAGE
    const fanUser =
      await User.findById(
        buyerId,
      );
    if (
      fanUser &&
      fanUser.walletAddress
    ) {
      if (
        normalizedPurchaseType ===
        "PPV"
      ) {
        await Content.findByIdAndUpdate(
          content._id,
          {
            $addToSet:
              {
                unlockedFor:
                  fanUser.walletAddress.toLowerCase(),
              },
            $push:
              {
                processedTxHashes:
                  txHash,
              },
          },
        );
      } else if (
        normalizedPurchaseType ===
        "DM_UNLOCK"
      ) {
        await Message.findByIdAndUpdate(
          content._id,
          {
            $addToSet:
              {
                unlockedFor:
                  fanUser.walletAddress.toLowerCase(),
              },
          },
        );
      }
    }

    if (
      normalizedPurchaseType ===
      "CHAT_BUNDLE"
    ) {
      const amountPaid =
        Number(
          actualAmount,
        );
      const bundlePrice =
        creator
          .monetizationSettings
          .messageBundlePrice;
      const bundleSize =
        creator
          .monetizationSettings
          .messageBundleSize;
      const bundlesPurchased =
        Math.floor(
          amountPaid /
            bundlePrice,
        );
      const bubblesToCredit =
        bundlesPurchased *
        bundleSize;

      await Conversation.findOneAndUpdate(
        {
          fan: buyerId,
          creator:
            creator._id ||
            creator,
        },
        {
          $inc: {
            bubblesLeft:
              bubblesToCredit,
            lifetimeValue:
              amountPaid,
          },
          $setOnInsert:
            {
              participants:
                [
                  creator._id ||
                    creator,
                  buyerId,
                ],
            },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );
    }

    // 8. CREATOR WALLET SPLIT
    const PLATFORM_FEE = 0.2;
    const actualPriceNum =
      Number(
        actualAmount,
      );
    const creatorEarnings =
      Number(
        (
          actualPriceNum *
          (1 -
            PLATFORM_FEE)
        ).toFixed(
          4,
        ),
      );

    await Wallet.findOneAndUpdate(
      {
        creator:
          creator._id ||
          creator,
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

    // 9. DUAL NOTIFICATION DISPATCHER
    try {
      const creatorIdStr =
        creator._id
          ? creator._id.toString()
          : creator.toString();
      const creatorName =
        creator.username ||
        "a creator";
      const fanName =
        fanUser?.username ||
        "A fan";

      let fanNotifType =
        "PAYMENT_SUCCESS";
      let fanNotifTitle =
        "Purchase Successful";
      let fanNotifMessage = `Your payment of $${actualPriceNum} USDT was successful.`;
      let fanActionUrl = `/creator/${creatorIdStr}`;

      let creatorNotifTitle =
        "New Sale!";
      let creatorNotifMessage = `${fanName} purchased your content for $${actualPriceNum} USDT!`;
      let creatorActionUrl =
        "/fan/dashboard";

      if (
        normalizedPurchaseType ===
        "PPV"
      ) {
        fanNotifType =
          "PPV_UNLOCK";
        fanNotifTitle =
          "PPV Unlocked!";
        fanNotifMessage = `You unlocked an exclusive post from ${creatorName}.`;

        creatorNotifTitle =
          "PPV Sold!";
        creatorNotifMessage = `${fanName} unlocked your PPV post! You earned $${creatorEarnings} USDT.`;
      }

      await Notification.insertMany(
        [
          {
            recipient:
              buyerId,
            sender:
              creator._id ||
              creator,
            type: fanNotifType,
            title:
              fanNotifTitle,
            message:
              fanNotifMessage,
            actionUrl:
              fanActionUrl,
            relatedContent:
              content
                ? content._id
                : null,
          },
          {
            recipient:
              creator._id ||
              creator,
            sender:
              buyerId,
            type: "PAYMENT_SUCCESS",
            title:
              creatorNotifTitle,
            message:
              creatorNotifMessage,
            actionUrl:
              creatorActionUrl,
            relatedContent:
              content
                ? content._id
                : null,
          },
        ],
      );
    } catch (notifErr) {
      console.error(
        "NOTIFICATION DISPATCH ERROR:",
        notifErr,
      );
    }

    return res
      .status(
        200,
      )
      .json(
        {
          message:
            "Payment verified successfully.",
          purchase,
        },
      );
  } catch (error) {
    console.error("Verification error:", error);
    return res.status(500).json({ message: "Server error verifying payment." });
  }
};

// GET /api/purchases/dashboard
exports.getFanDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. PAGINATION SETUP: Protect the server from memory overload
    // Default to page 1, 10 items per page
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 2. THE SUBSCRIPTION LAYER: Fetch active subs
    // We don't heavily paginate this yet, as users rarely have 100+ active creator subs
    const subPurchases = await Purchase.find({
      user: userId,
      status: "completed",
      purchaseType: "SUBSCRIPTION"
    })
      .populate("creator", "username profileImage")
      .sort({ createdAt: -1 })
      .lean();

    const subscriptions = [];
    const subbedCreators = new Set();

    // Deduplicate so we only show one active subscription card per creator
    subPurchases.forEach((p) => {
      if (p.creator) {
        const creatorId = p.creator._id.toString();
        if (!subbedCreators.has(creatorId)) {
          subbedCreators.add(creatorId);
          subscriptions.push(p);
        }
      }
    });

    // 3. THE PPV LAYER (PAGINATED): Fetch historical unlocked content safely
    // This query uses .skip() and .limit() so the database only returns the exact chunk we need
    const ppvRaw = await Purchase.find({
      user: userId,
      status: "completed",
      purchaseType: "PPV"
    })
      .populate("content", "title description fileKey fileType")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit) 
      .lean();

    // Get total count of historical PPVs so frontend knows if there is more to load
    const totalPPVs = await Purchase.countDocuments({
      user: userId,
      status: "completed",
      purchaseType: "PPV"
    });

    // 4. THE VAULT SEAL: Generate 1-hour self-destructing URLs ONLY for this page's content
    const ppv = await Promise.all(
      ppvRaw.map(async (p) => {
        try {
          // STRESS-TEST FIX: If a creator deletes the original content, handle it gracefully so the loop doesn't crash
          if (!p.content || !p.content.fileKey) return p; 

          const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: p.content.fileKey,
          });
          
          const secureUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
          
          return {
            ...p,
            content: {
              ...p.content,
              mediaUrl: secureUrl 
            }
          };
        } catch (err) {
          console.error("Failed to sign URL for dashboard PPV:", p._id, err);
          return p; 
        }
      })
    );

    // 5. SEND PAYLOAD: Now includes pagination data for the frontend
    res.status(200).json({
      subscriptions,
      ppv,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalPPVs / limit),
        hasMore: page * limit < totalPPVs,
        totalItems: totalPPVs
      }
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({
      message: "Failed to load dashboard data",
    });
  }
};
