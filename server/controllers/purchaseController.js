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
    const {
      contentId,
      creatorId,
      txHash,
      reference,
      paymentMethod,
      purchaseType,
      messageId,
      subscriptionTier,
    } =
      req.body;

    const buyerId =
      req
        .user
        ._id;
    const userCountry =
      req
        .user
        ?.country ||
      "United States";
    const normalizedPurchaseType =
      purchaseType
        ? purchaseType
            .trim()
            .toUpperCase()
        : "";

    // 1. IDEMPOTENCY CHECK
    const uniqueId =
      paymentMethod ===
      "FIAT"
        ? reference
        : txHash;
    if (
      !uniqueId
    ) {
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
    }

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
    if (
      existingPurchase
    ) {
      return res
        .status(
          200,
        )
        .json(
          {
            message:
              "Payment already verified and fulfilled.",
            purchase:
              existingPurchase,
          },
        );
    }

    // 2. Branch Logic: Fetch Creator & Determine Expected BASE Price (NGN)
    let creator =
      await User.findById(
        creatorId,
      );
    let content =
      null;
    let expectedBasePriceNGN = 0;

    if (
      normalizedPurchaseType ===
      "SUBSCRIPTION"
    ) {
      if (
        !creatorId
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "creatorId is required.",
            },
          );

      creator =
        await User.findById(
          creatorId,
        );
      if (
        !creator
      )
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "Creator not found.",
            },
          );

      if (
        subscriptionTier ===
        "Weekly"
      ) {
        expectedBasePriceNGN =
          creator
            .monetizationSettings
            ?.weeklySubscription ||
          0;
      } else if (
        subscriptionTier ===
        "Monthly"
      ) {
        expectedBasePriceNGN =
          creator
            .monetizationSettings
            ?.monthlySubscription ||
          0;
      } else if (
        subscriptionTier &&
        subscriptionTier.includes(
          "Bundle",
        )
      ) {
        expectedBasePriceNGN =
          creator
            .monetizationSettings
            ?.multiMonthPrice ||
          0;
      } else {
        expectedBasePriceNGN =
          creator
            .monetizationSettings
            ?.monthlySubscription ||
          0;
      }

      if (
        expectedBasePriceNGN ===
        0
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Requested subscription tier is not enabled.",
            },
          );
    } else if (
      normalizedPurchaseType ===
      "CHAT_BUNDLE"
    ) {
      if (
        !creatorId
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "creatorId is required.",
            },
          );

      creator =
        await User.findById(
          creatorId,
        );
      if (
        !creator
      )
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "Creator not found.",
            },
          );

      expectedBasePriceNGN =
        creator
          .monetizationSettings
          ?.messageBundlePrice ||
        0;
      if (
        expectedBasePriceNGN ===
        0
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Creator has not enabled chat bundles.",
            },
          );
    } else if (
      normalizedPurchaseType ===
      "PPV"
    ) {
      if (
        !contentId
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "contentId is required for PPV.",
            },
          );

      content =
        await Content.findById(
          contentId,
        ).populate(
          "creator",
        );
      if (
        !content
      )
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "Content not found.",
            },
          );

      creator =
        content.creator;
      expectedBasePriceNGN =
        content.price !=
        null
          ? content.price
          : content.priceInUSDT !=
              null
            ? content.priceInUSDT
            : creator
                .monetizationSettings
                ?.defaultPPVPrice ||
              0;
    } else if (
      normalizedPurchaseType ===
      "DM_UNLOCK"
    ) {
      if (
        !messageId
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "messageId is required for DM unlocks.",
            },
          );

      content =
        await Message.findById(
          messageId,
        ).populate(
          "sender",
        );
      if (
        !content
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

      creator =
        content.sender;
      expectedBasePriceNGN =
        content.price !=
        null
          ? content.price
          : content.priceInUSDT ||
            0;
    }

    // 3. DYNAMIC PRICING EVALUATION
    const expectedPricing =
      await convertAndRoundPrice(
        expectedBasePriceNGN,
        userCountry,
      );
    let actualAmount = 0;

    // ==========================================
    // 4. WEB2.5 BRANCHING: FIAT VS CRYPTO
    // ==========================================
    if (
      paymentMethod ===
      "FIAT"
    ) {
      // --- WEB2 (PAYSTACK) VERIFICATION ---
      const paystackRes =
        await axios.get(
          `https://api.paystack.co/transaction/verify/${reference}`,
          {
            headers:
              {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              },
          },
        );

      const paymentData =
        paystackRes
          .data
          .data;
      if (
        paymentData.status !==
        "success"
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Fiat transaction was not successful.",
            },
          );
      }

      const paystackAmountNGN =
        paymentData.amount /
        100;

      // 5% Slippage tolerance for fiat conversion fluctuations against EXPECTED NGN charge
      if (
        paystackAmountNGN <
        expectedPricing.paystackNGNAmount *
          0.95
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Fraud: Insufficient payment amount detected.",
            },
          );
      }

      // Normalize to display value so platform ledgers match what the user saw
      actualAmount =
        expectedPricing.displayPrice;
    } else {
      // --- WEB3 (POLYGON) VERIFICATION ---
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
      const provider =
        new ethers.JsonRpcProvider(
          process
            .env
            .POLYGON_RPC_URL,
        );

      let tx =
        null;
      let receipt =
        null;

      for (
        let i = 0;
        i <
        3;
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
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Transaction indexing delayed on RPC node.",
            },
          );
      if (
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
                "Transaction failed or reverted on-chain.",
            },
          );

      const GATEWAY_ADDRESS =
        process.env.NIPPY_GATEWAY_ADDRESS?.toLowerCase();
      const USDT_ADDRESS =
        process.env.MOCK_USDT_ADDRESS?.toLowerCase();

      if (
        tx.to.toLowerCase() !==
        GATEWAY_ADDRESS
      )
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
      actualAmount =
        Number(
          ethers.formatUnits(
            decoded
              .args[3],
            6,
          ),
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

      // Compare actual USDT sent against the rounded display price
      if (
        actualAmount <
        expectedPricing.displayPrice
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
    }

    // 5. CREATE PURCHASE RECORD WITH DYNAMIC EXPIRATION & PRICING AUDIT
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
        expiresAt =
          new Date(
            now.setDate(
              now.getDate() +
                30,
            ),
          );
      }
    }

    const purchasePayload =
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
        amountPaid:
          Number(
            actualAmount,
          ),
        currency:
          expectedPricing.displayCurrency,
        basePriceNGN:
          expectedPricing.basePriceNGN,
        platformMarginNGN:
          expectedPricing.paystackNGNAmount -
          expectedPricing.basePriceNGN,
        purchaseType:
          normalizedPurchaseType,
        expiresAt,
        paymentMethod,
        status:
          "completed",
      };

    // THE FIX: Bypass the MongoDB null unique index trap by guaranteeing a unique string.
    // This perfectly routes around the E11000 duplicate key error forever.
    if (
      paymentMethod ===
      "FIAT"
    ) {
      purchasePayload.fiatReference =
        reference;
      purchasePayload.txHash = `fiat_omitted_${reference}`;
    } else {
      purchasePayload.txHash =
        txHash;
      purchasePayload.fiatReference = `crypto_omitted_${txHash}`;
    }

    let purchase;
    try {
      purchase =
        await Purchase.create(
          purchasePayload,
        );
    } catch (dbError) {
      if (
        dbError.code ===
        11000
      ) {
        // RACE CONDITION RESOLVED: The background listener (or webhook) beat the frontend API to the database!
        console.log(
          `[i] Race condition handled safely: Transaction already indexed by background listener.`,
        );

        // Fetch the document the listener already saved
        purchase =
          await Purchase.findOne(
            {
              $or: [
                {
                  txHash:
                    purchasePayload.txHash,
                },
                {
                  fiatReference:
                    purchasePayload.fiatReference,
                },
              ],
            },
          );

        // The listener already did the wallet split, unlocked content, and sent notifications.
        // We safely abort the rest of this function to prevent double-crediting, and tell the frontend "Success!"
        return res
          .status(
            200,
          )
          .json(
            {
              message:
                "Payment verified successfully by background listener.",
              purchase,
            },
          );
      }
      // If it's a different database error, throw it normally
      throw dbError;
    }

    // 6. FULFILLMENT: UNLOCK CONTENT/MESSAGE
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
                  txHash ||
                  reference,
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
      const bundleSize =
        creator
          .monetizationSettings
          .messageBundleSize ||
        5;
      // We calculate bundles based on the single bundle display price paid
      const bundlesPurchased =
        Math.floor(
          Number(
            actualAmount,
          ) /
            expectedPricing.displayPrice,
        );
      const bubblesToCredit =
        (bundlesPurchased ||
          1) *
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
              Number(
                actualAmount,
              ),
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

    // 7. CREATOR WALLET SPLIT (Pays creator on base value equivalent)
    const PLATFORM_FEE = 0.2;
    // By multiplying actualAmount, you are routing 80% of the rounded amount to the creator.
    // If you wish to restrict creator strictly to 80% of BASE price, replace 'actualAmount' with the pure USD equivalent of 'expectedBasePriceNGN'.
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

    // 8. DUAL NOTIFICATION DISPATCHER
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
      let fanNotifMessage = `Your payment of ${expectedPricing.displayCurrency} ${Number(actualAmount)} was successful.`;
      let fanActionUrl = `/creator/${creatorIdStr}`;

      let creatorNotifTitle =
        "New Sale!";
      let creatorNotifMessage = `${fanName} purchased your content for ${expectedPricing.displayCurrency} ${Number(actualAmount)}!`;
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
        creatorNotifMessage = `${fanName} unlocked your PPV post!`;
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

// ==========================================
// 1-MINUTE MEMORY CACHE SETUP
// ==========================================
let cachedUsdtRate = null;
let rateTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// POST /api/purchases/crypto-quote
exports.getCryptoQuote = async (req, res) => {
  try {
    const { amountUSD } = req.body;

    if (!amountUSD || amountUSD <= 0) {
      return res.status(400).json({ message: "Valid USD amount required." });
    }

    const now = Date.now();

    // 1. Check Cache: If empty or older than 1 minute, fetch fresh rates
    if (!cachedUsdtRate || now - rateTimestamp > CACHE_TTL_MS) {
      try {
        // EXACT FIAT PAIR: Fetching the true value of USDT against fiat USD
        const response = await axios.get("https://api.bybit.com/v5/market/tickers?category=spot&symbol=USDTUSD");

        if (response.data && response.data.result && response.data.result.list.length > 0) {
          const lastPrice = parseFloat(response.data.result.list[0].lastPrice);
          cachedUsdtRate = lastPrice; 
          rateTimestamp = now;
        } else {
          throw new Error("Malformed Bybit response structure");
        }
      } catch (apiError) {
        console.error("Bybit API failed, engaging 1:1 fallback:", apiError.message);
        // FALLBACK: If the API fails, default to 1:1 so fans can still checkout seamlessly
        cachedUsdtRate = 1.00;
        rateTimestamp = now;
      }
    }

    // 2. Calculate the required USDT 
    // Example: If 1 USDT = $0.998 USD, a $5.00 purchase requires 5.0100 USDT
    const requiredUSDT = amountUSD / cachedUsdtRate;

    // 3. Round UP to 4 decimal places for smart contract precision & safety
    const formattedUSDT = Math.ceil(requiredUSDT * 10000) / 10000;

    // 4. Return the quote payload to the frontend modal
    res.status(200).json({
      quoteId: `quote_${now}`,
      amountUSD: amountUSD,
      requiredUSDT: formattedUSDT,
      rateUsed: cachedUsdtRate,
      expiresAt: now + (10 * 60 * 1000) // Valid for 10 minutes
    });

  } catch (error) {
    console.error("Crypto Quote Error:", error);
    res.status(500).json({ message: "Failed to generate crypto payment quote." });
  }
};
