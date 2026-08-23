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
  getExchangeRates,
} = require("../utils/currencyConversion");
const {
  generateLiquidationQuote,
} = require("../utils/p2pLiquidity");



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
exports.verifyPayment =
  async (
    req,
    res,
  ) => {
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
        streamId,
        // THE FIX: The Dual Ledger Payload
        chargeAmount,
        chargeCurrency,
        rawAmount,
        rawCurrency,
      } =
        req.body;

      const buyerId =
        req
          .user
          ._id;
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

      // 2. SECURITY CHECK: Fetch DB Truth for Base Price
      let creator =
        await User.findById(
          creatorId,
        );
      let content =
        null;
      let dbBasePrice = 0; // The true, untampered base price from the database

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
          dbBasePrice =
            creator
              .monetizationSettings
              ?.weeklySubscription ||
            0;
        } else if (
          subscriptionTier ===
          "Monthly"
        ) {
          dbBasePrice =
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
          dbBasePrice =
            creator
              .monetizationSettings
              ?.multiMonthPrice ||
            0;
        }

        if (
          dbBasePrice <=
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

        // If bundle logic sends multiplied rawAmount, we must account for bundle quantity
        const bundleQuantity =
          req
            .body
            .bubbles
            ? req
                .body
                .bubbles /
              (creator
                .monetizationSettings
                ?.messageBundleSize ||
                5)
            : 1;
        const baseBundlePrice =
          creator
            .monetizationSettings
            ?.messageBundlePrice ||
          0;
        dbBasePrice =
          baseBundlePrice *
          bundleQuantity;

        if (
          dbBasePrice <=
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
        // Bulletproof raw price extraction (checking old and new fields)
        dbBasePrice =
          content.price !==
          undefined
            ? content.price
            : content.priceInUSDT ||
              creator
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
        dbBasePrice =
          content.price ||
          0;
      } else if (
        normalizedPurchaseType ===
        "LIVE_GIFT"
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
                  "creatorId is required for gifts.",
              },
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
        dbBasePrice =
          Number(
            rawAmount,
          ) ||
          0;
        if (
          dbBasePrice <=
          0
        )
          return res
            .status(
              400,
            )
            .json(
              {
                message:
                  "Invalid gift amount.",
              },
            );
      }

      // =================================================================
      // 2.5 SECURITY CHECK: THE AGE VERIFICATION ENFORCER
      // =================================================================
      // We pull a fresh copy of the fan from the DB to prevent stale JWT token bypasses
      const fan =
        await User.findById(
          buyerId,
        ).select(
          "isAgeVerified",
        );

      let requiresAgeCheck = false;
      if (
        normalizedPurchaseType ===
          "PPV" ||
        normalizedPurchaseType ===
          "DM_UNLOCK"
      ) {
        // For individual items, check the item first. If undefined, fallback to the creator's general setting.
        requiresAgeCheck =
          content.isNsfw ===
            true ||
          creator.willingNsfw ===
            true;
      } else if (
        normalizedPurchaseType ===
          "SUBSCRIPTION" ||
        normalizedPurchaseType ===
          "CHAT_BUNDLE"
      ) {
        // For broad access items, check if the creator is known to produce NSFW content.
        requiresAgeCheck =
          creator.willingNsfw ===
          true;
      }

      if (
        requiresAgeCheck &&
        !fan.isAgeVerified
      ) {
        return res
          .status(
            403,
          )
          .json(
            {
              message:
                "SECURITY BLOCK: Age verification required. Explicit content cannot be unlocked without a verified ID.",
            },
          );
      }
      // =================================================================

      // FRAUD CHECK: Ensure the rawAmount provided by the frontend matches the actual DB base price
      // We allow a tiny 2% margin of error for floating point calculations.
      if (
        Number(
          rawAmount,
        ) <
        dbBasePrice *
          0.98
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Fraud detected: Base price mismatch.",
            },
          );
      }

      // 3. WEB2 / WEB3 GATEWAY VERIFICATION
      let actualPaidAmount = 0;

      if (
        paymentMethod ===
        "FIAT"
      ) {
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

        const paystackAmount =
          paymentData.amount /
          100; // Paystack returns subunits

        // Ensure Paystack charged the expected fan currency and amount
        if (
          paystackAmount <
            Number(
              chargeAmount,
            ) *
              0.95 ||
          paymentData.currency !==
            chargeCurrency
        ) {
          return res
            .status(
              400,
            )
            .json(
              {
                message:
                  "Fraud: Insufficient payment amount or currency mismatch.",
              },
            );
        }

        actualPaidAmount =
          paystackAmount;
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

        // Retry mechanism for RPC indexing delays
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

        // THE FIX: Update the signature to match our new Profit Skim architecture (5 arguments)
        const iface =
          new ethers.Interface(
            [
              "function purchaseWithERC20(address token, address creator, bytes32 contentId, uint256 rawBasePrice, uint256 chargeAmount)",
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

        // THE FIX: Extract the amount from args[4] (the 5th parameter: chargeAmount)
        const transferredUSDT =
          Number(
            ethers.formatUnits(
              decoded
                .args[4],
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

        if (
          transferredUSDT <
          dbBasePrice *
            0.95
        ) {
          return res
            .status(
              400,
            )
            .json(
              {
                message: `Fraud: Insufficient payment. Transferred ${transferredUSDT} USDT, base price is ${dbBasePrice}.`,
              },
            );
        }

        actualPaidAmount =
          transferredUSDT;
      }

      // 4. CREATE DUAL-LEDGER PURCHASE RECORD
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

          // Dual Ledger Save
          amountPaid:
            actualPaidAmount, // Exact amount Fan Paid
          currency:
            paymentMethod ===
            "CRYPTO"
              ? "USDT"
              : chargeCurrency,
          basePriceNGN:
            rawAmount, // Saving the Creator's Raw DB Base price here for historical split reference

          purchaseType:
            normalizedPurchaseType,
          expiresAt,
          paymentMethod,
          status:
            "completed",
        };

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
        throw dbError;
      }

      // 5. FULFILLMENT: UNLOCK CONTENT/MESSAGE
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
            ?.messageBundleSize ||
          5;
        const bundleQuantity =
          req
            .body
            .bubbles
            ? req
                .body
                .bubbles /
              bundleSize
            : 1;
        const bubblesToCredit =
          bundleQuantity *
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
                actualPaidAmount,
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

      // 6. CREATOR WALLET SPLIT (THE SKIM ARCHITECTURE)
      // The creator gets exactly 80% of their BASE PRICE (rawAmount), regardless of how bloated the fan price was.
      const PLATFORM_FEE = 0.2;
      const creatorEarnings =
        Number(
          (
            Number(
              rawAmount,
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

      // 7. NOTIFICATIONS
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
        let fanNotifMessage = `Your payment of ${chargeCurrency} ${Number(chargeAmount).toFixed(2)} was successful.`;
        let fanActionUrl = `/creator/${creatorIdStr}`;

        let creatorNotifTitle =
          "New Sale!";
        let creatorNotifMessage = `${fanName} purchased your content.`;
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
        } else if (
          normalizedPurchaseType ===
          "LIVE_GIFT"
        ) {
          fanNotifType =
            "GIFT_SENT";
          fanNotifTitle =
            "Gift Sent!";
          fanNotifMessage = `You successfully gifted ${creatorName} ${chargeCurrency} ${Number(chargeAmount).toFixed(2)}.`;
          creatorNotifTitle =
            "New Live Gift! 🎁";
          creatorNotifMessage = `${fanName} just sent you a gift!`;

          if (
            req.io
          ) {
            req.io.emit(
              "live_gift_received",
              {
                creatorId:
                  creatorIdStr,
                streamId:
                  streamId ||
                  null,
                fanName:
                  fanName,
                amount:
                  Number(
                    chargeAmount,
                  ),
                currency:
                  chargeCurrency,
                message: `🔥 ${fanName} just sent a gift!`,
              },
            );
          }
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
      console.error(
        "Verification error:",
        error,
      );
      return res
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

// GET /api/purchases/dashboard
exports.getFanDashboard =
  async (
    req,
    res,
  ) => {
    try {
      const userId =
        req
          .user
          ._id;
      const page =
        parseInt(
          req
            .query
            .page,
        ) ||
        1;
      const limit =
        parseInt(
          req
            .query
            .limit,
        ) ||
        10;
      const skip =
        (page -
          1) *
        limit;

      const subPurchases =
        await Purchase.find(
          {
            user: userId,
            status:
              "completed",
            purchaseType:
              "SUBSCRIPTION",
          },
        )
          .populate(
            "creator",
            "username profileImage",
          )
          .sort(
            {
              createdAt:
                -1,
            },
          )
          .lean();

      const subscriptions =
        [];
      const subbedCreators =
        new Set();

      subPurchases.forEach(
        (
          p,
        ) => {
          if (
            p.creator
          ) {
            const creatorId =
              p.creator._id.toString();
            if (
              !subbedCreators.has(
                creatorId,
              )
            ) {
              subbedCreators.add(
                creatorId,
              );
              subscriptions.push(
                p,
              );
            }
          }
        },
      );

      const ppvRaw =
        await Purchase.find(
          {
            user: userId,
            status:
              "completed",
            purchaseType:
              "PPV",
          },
        )
          .populate(
            "content",
            "title description fileKey fileType",
          )
          .sort(
            {
              createdAt:
                -1,
            },
          )
          .skip(
            skip,
          )
          .limit(
            limit,
          )
          .lean();

      const totalPPVs =
        await Purchase.countDocuments(
          {
            user: userId,
            status:
              "completed",
            purchaseType:
              "PPV",
          },
        );

      const ppv =
        await Promise.all(
          ppvRaw.map(
            async (
              p,
            ) => {
              try {
                if (
                  !p.content ||
                  !p
                    .content
                    .fileKey
                )
                  return p;
                const command =
                  new GetObjectCommand(
                    {
                      Bucket:
                        process
                          .env
                          .S3_BUCKET_NAME,
                      Key: p
                        .content
                        .fileKey,
                    },
                  );
                const secureUrl =
                  await getSignedUrl(
                    s3,
                    command,
                    {
                      expiresIn: 600,
                    },
                  );
                return {
                  ...p,
                  content:
                    {
                      ...p.content,
                      mediaUrl:
                        secureUrl,
                    },
                };
              } catch (err) {
                console.error(
                  "Failed to sign URL for dashboard PPV:",
                  p._id,
                  err,
                );
                return p;
              }
            },
          ),
        );

      res
        .status(
          200,
        )
        .json(
          {
            subscriptions,
            ppv,
            pagination:
              {
                currentPage:
                  page,
                totalPages:
                  Math.ceil(
                    totalPPVs /
                      limit,
                  ),
                hasMore:
                  page *
                    limit <
                  totalPPVs,
                totalItems:
                  totalPPVs,
              },
          },
        );
    } catch (error) {
      console.error(
        "Dashboard error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to load dashboard data",
          },
        );
    }
  };

let cachedUsdtRate =
  null;
let rateTimestamp = 0;
const CACHE_TTL_MS =
  60 *
  1000;

// POST /api/purchases/crypto-quote
exports.getCryptoQuote =
  async (
    req,
    res,
  ) => {
    try {
      // THE FIX: We now accept BOTH the Fan's bloated price and the Creator's true base price
      const {
        amountUSD,
        rawAmountUSD,
      } =
        req.body;

      if (
        !amountUSD ||
        amountUSD <=
          0
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Valid USD amount required.",
            },
          );
      }

      const now =
        Date.now();

      if (
        !cachedUsdtRate ||
        now -
          rateTimestamp >
          CACHE_TTL_MS
      ) {
        try {
          const response =
            await axios.get(
              "https://api.bybit.com/v5/market/tickers?category=spot&symbol=USDTUSD",
            );
          if (
            response
              .data
              ?.result
              ?.list
              ?.length >
            0
          ) {
            cachedUsdtRate =
              parseFloat(
                response
                  .data
                  .result
                  .list[0]
                  .lastPrice,
              );
            rateTimestamp =
              now;
          } else {
            throw new Error(
              "Malformed Bybit response structure",
            );
          }
        } catch (apiError) {
          console.error(
            "Bybit API failed, engaging 1:1 fallback:",
            apiError.message,
          );
          cachedUsdtRate = 1.0;
          rateTimestamp =
            now;
        }
      }

      // Convert both prices to USDT
      const requiredUSDT =
        amountUSD /
        cachedUsdtRate;
      const rawUSDT =
        (rawAmountUSD ||
          amountUSD) /
        cachedUsdtRate;

      // Ceil to 4 decimal places for precision
      const formattedRequiredUSDT =
        Math.ceil(
          requiredUSDT *
            10000,
        ) /
        10000;
      const formattedRawUSDT =
        Math.ceil(
          rawUSDT *
            10000,
        ) /
        10000;

      res
        .status(
          200,
        )
        .json(
          {
            quoteId: `quote_${now}`,
            amountUSD:
              amountUSD,
            requiredUSDT:
              formattedRequiredUSDT, // e.g., 3.50 (Fan pays this)
            rawUSDT:
              formattedRawUSDT, // e.g., 3.33 (Smart contract uses this for the 80% split)
            rateUsed:
              cachedUsdtRate,
            expiresAt:
              now +
              10 *
                60 *
                1000,
          },
        );
    } catch (error) {
      console.error(
        "Crypto Quote Error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to generate crypto payment quote.",
          },
        );
    }
  };

// GET /api/exchange-rates
exports.getLiveExchangeRates =
  async (
    req,
    res,
  ) => {
    try {
      const rates =
        await getExchangeRates();
      res
        .status(
          200,
        )
        .json(
          rates,
        );
    } catch (error) {
      console.error(
        "Failed to fetch rates:",
        error,
      );
      // Ultimate backend fallback
      res
        .status(
          500,
        )
        .json(
          {
            USD: 1,
            NGN: 1500,
            EUR: 0.92,
            GBP: 0.79,
          },
        );
    }
  };


exports.getLiquidationQuote = async (req, res) => {
  try {
    const { amount, direction } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount." });
    }

    // Generate the quote with a 3% protective spread
    const quote = await generateLiquidationQuote(amount, direction, 0.03);

    res.status(200).json(quote);
  } catch (error) {
    console.error("Quote Error:", error);
    res.status(500).json({ message: "Failed to generate execution quote." });
  }
};
