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
const Transaction = require("../models/Transaction");

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
      rawAmount,
      rawCurrency,
      streamId,
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
      console.error(
        "[400 REJECTION] Missing uniqueId.",
      );
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
              "Payment already verified.",
            purchase:
              existingPurchase,
          },
        );
    }

    // 2. SECURITY CHECK: Fetch Absolute Database Truth for Base Price
    let creator =
      await User.findById(
        creatorId,
      );
    let content =
      null;
    let dbBasePrice = 0;

    if (
      normalizedPurchaseType ===
      "SUBSCRIPTION"
    ) {
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
      )
        dbBasePrice =
          creator
            .monetizationSettings
            ?.weeklySubscription ||
          0;
      else if (
        subscriptionTier ===
        "Monthly"
      )
        dbBasePrice =
          creator
            .monetizationSettings
            ?.monthlySubscription ||
          0;
      else if (
        subscriptionTier &&
        subscriptionTier.includes(
          "Bundle",
        )
      )
        dbBasePrice =
          creator
            .monetizationSettings
            ?.multiMonthPrice ||
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
                "Subscription tier not enabled.",
            },
          );
    } else if (
      normalizedPurchaseType ===
      "CHAT_BUNDLE"
    ) {
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
      dbBasePrice =
        (creator
          .monetizationSettings
          ?.messageBundlePrice ||
          0) *
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
                "Chat bundles not enabled.",
            },
          );
    } else if (
      normalizedPurchaseType ===
      "PPV"
    ) {
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
      const rawDBPrice =
        content.price;
      const rawUSDTPrice =
        content.priceInUSDT;

      if (
        rawDBPrice !==
          undefined &&
        rawDBPrice !==
          null
      )
        dbBasePrice =
          Number(
            rawDBPrice,
          );
      else if (
        rawUSDTPrice !==
          undefined &&
        rawUSDTPrice !==
          null
      )
        dbBasePrice =
          Number(
            rawUSDTPrice,
          );
      else
        dbBasePrice =
          Number(
            creator
              .monetizationSettings
              ?.defaultPPVPrice ||
              0,
          );
    } else if (
      normalizedPurchaseType ===
      "DM_UNLOCK"
    ) {
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
    }
    // We must fetch live rates early to correctly normalize Cross-Currency Live Gifts
    const rates =
      await getExchangeRates();
    const trueDbCurrency =
      creator
        .monetizationSettings
        ?.priceCurrency ||
      creator
        .monetizationSettings
        ?.baseCurrency ||
      creator.preferredCurrency ||
      "USD";

    if (
      normalizedPurchaseType ===
      "LIVE_GIFT"
    ) {
      const fanGiftRaw =
        Number(
          rawAmount,
        ) ||
        0;
      if (
        fanGiftRaw <=
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

      const creatorRate =
        rates[
          trueDbCurrency
        ] ||
        1;
      const fanRate =
        rates[
          rawCurrency
        ] ||
        1;

      // CRITICAL FIX: Convert the Fan's native gift currency into the Creator's base currency
      // Example: 10,000 NGN converted to USD equivalent for the true database price
      dbBasePrice =
        (fanGiftRaw /
          fanRate) *
        creatorRate;
    }

    // 2.5 SECURITY CHECK: AGE VERIFICATION
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
              "SECURITY BLOCK: Age verification required.",
          },
        );
    }

    // --- THE GATEWAY TRUTH ENGINE ---
    const baseRate =
      rates[
        trueDbCurrency
      ] ||
      1;

    let actualPaidAmount = 0;
    let actualPaidCurrency =
      "USD";

    // 3. WEB2 / WEB3 VERIFICATION
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
        100;
      actualPaidCurrency =
        paymentData.currency
          ? paymentData.currency.toUpperCase()
          : "NGN";
      actualPaidAmount =
        paystackAmount;

      // FRAUD CHECK: Did Paystack collect enough to cover the Creator's exact database price?
      const gatewayRate =
        rates[
          actualPaidCurrency
        ] ||
        1500;
      const requiredFiatAmount =
        (dbBasePrice /
          baseRate) *
        gatewayRate;

      // 10% tolerance for live API exchange rate flutter and Fan UI rounding up rules
      if (
        dbBasePrice >
          0 &&
        paystackAmount <
          requiredFiatAmount *
            0.9
      ) {
        console.error(
          `[FRAUD REJECTION] DB Price: ${dbBasePrice} ${trueDbCurrency}. Paystack Collected: ${paystackAmount} ${actualPaidCurrency}. Required: ~${requiredFiatAmount}`,
        );
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Fraud detected: Insufficient funds collected for creator's base price.",
            },
          );
      }
    } else {
      if (
        !creator ||
        !creator.walletAddress
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Creator payout wallet missing.",
            },
          );

      const provider =
        new ethers.JsonRpcProvider(
          process
            .env
            .POLYGON_RPC_URL,
        );
      let tx =
          null,
        receipt =
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
        } catch (rpcErr) {}
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
                "Transaction failed on-chain.",
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
                "Transaction not sent to Gateway.",
            },
          );

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
                "Invalid signature.",
            },
          );
      }

      if (
        decoded.args[0].toLowerCase() !==
          USDT_ADDRESS ||
        decoded.args[1].toLowerCase() !==
          creator.walletAddress.toLowerCase()
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Fraud: Wallet or Token mismatch.",
            },
          );
      }

      const transferredUSDT =
        Number(
          ethers.formatUnits(
            decoded
              .args[4],
            6,
          ),
        );
      actualPaidCurrency =
        "USDT";
      actualPaidAmount =
        transferredUSDT;

      // FRAUD CHECK: Did the Smart Contract collect enough USDT to cover the Creator's database price?
      const usdtRate =
        rates[
          "USDT"
        ] ||
        1;
      const requiredUSDTAmount =
        (dbBasePrice /
          baseRate) *
        usdtRate;

      if (
        dbBasePrice >
          0 &&
        transferredUSDT <
          requiredUSDTAmount *
            0.9
      ) {
        console.error(
          `[FRAUD REJECTION] DB Price: ${dbBasePrice} ${trueDbCurrency}. Contract Collected: ${transferredUSDT} USDT. Required: ~${requiredUSDTAmount}`,
        );
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Fraud detected: Insufficient USDT for creator's base price.",
            },
          );
      }
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
      const months =
        subscriptionTier?.includes(
          "Bundle",
        )
          ? creator
              .monetizationSettings
              ?.multiMonthDuration ||
            3
          : 1;
      expiresAt =
        subscriptionTier ===
        "Weekly"
          ? new Date(
              now.setDate(
                now.getDate() +
                  7,
              ),
            )
          : new Date(
              now.setMonth(
                now.getMonth() +
                  months,
              ),
            );
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
          actualPaidAmount,
        currency:
          actualPaidCurrency,
        basePriceRaw:
          dbBasePrice, // Using absolute DB truth, ignoring frontend payloads entirely
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

      // Ledger: We base earnings on the DB truth, not what the Fan actually paid
      if (
        paymentMethod ===
        "FIAT"
      ) {
        const creatorCut =
          Number(
            (
              dbBasePrice *
              0.8
            ).toFixed(
              4,
            ),
          );
        const creatorWallet =
          await Wallet.findOne(
            {
              creator:
                creator._id,
            },
          );

        if (
          creatorWallet
        ) {
          await Transaction.create(
            {
              user: creator._id,
              wallet:
                creatorWallet._id,
              type: "SALE",
              amount:
                creatorCut,
              currency:
                trueDbCurrency,
              reference:
                reference,
              status:
                "COMPLETED",
              metadata:
                {
                  fanId:
                    buyerId,
                  purchaseId:
                    purchase._id,
                  paymentMethod:
                    "FIAT",
                },
            },
          );
        }
      }
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
              bundleQuantity *
              bundleSize,
            lifetimeValue:
              actualPaidAmount,
          },
          $setOnInsert:
            {
              participants:
                [
                  creator._id,
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

    // 6. CREATOR WALLET SPLIT
    const creatorEarnings =
      Number(
        (
          dbBasePrice *
          0.8
        ).toFixed(
          4,
        ),
      ); // Base it on their requested price, absorbing frontend rounding gains to the platform
    let walletUpdate =
      {
        $inc: {},
      };

    if (
      paymentMethod ===
      "CRYPTO"
    ) {
      if (
        creator.payoutMethod ===
          "bank" ||
        !creator.walletAddress
      ) {
        walletUpdate.$inc[
          "fiatBalances.withdrawable.USDT"
        ] =
          Number(
            (
              actualPaidAmount *
              0.8
            ).toFixed(
              4,
            ),
          );
        walletUpdate.$inc[
          "fiatTotalEarned.USDT"
        ] =
          Number(
            (
              actualPaidAmount *
              0.8
            ).toFixed(
              4,
            ),
          );
      } else {
        walletUpdate.$inc[
          "lifetimeWeb3EarnedUSDT"
        ] =
          Number(
            (
              actualPaidAmount *
              0.8
            ).toFixed(
              4,
            ),
          );
      }
    } else if (
      paymentMethod ===
      "FIAT"
    ) {
      walletUpdate.$inc[
        `fiatBalances.floating.${trueDbCurrency}`
      ] =
        creatorEarnings;
      walletUpdate.$inc[
        `fiatTotalEarned.${trueDbCurrency}`
      ] =
        creatorEarnings;
    }

    await Wallet.findOneAndUpdate(
      {
        creator:
          creator._id,
      },
      walletUpdate,
      {
        upsert: true,
      },
    );

    // --- BROADCAST LIVE GIFT TO CREATOR AND FANS ---
    // This instantly updates the Creator's live session earnings and spawns the Fan bubbles
    if (
      normalizedPurchaseType ===
        "LIVE_GIFT" &&
      req.io &&
      streamId
    ) {
      req.io.emit(
        "live_gift_received",
        {
          streamId:
            streamId,
          amount:
            dbBasePrice, // Creator sees the exact base currency they earned
          rawAmount:
            rawAmount, // Fan sees the exact currency they paid
          rawCurrency:
            rawCurrency ||
            "USD",
          message: `Sent a gift!`,
          fanName:
            fanUser
              ? fanUser.username
              : "A Fan",
        },
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
                // SECURITY: Strip the raw fileKey so it never reaches the frontend
                const safeContent =
                  {
                    ...p.content,
                    mediaUrl:
                      secureUrl,
                  };
                delete safeContent.fileKey;

                return {
                  ...p,
                  content:
                    safeContent,
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
          },
        );
    }
  };

exports.getLiquidationQuote =
  async (
    req,
    res,
  ) => {
    try {
      const {
        amount,
        direction,
      } =
        req.body;

      if (
        !amount ||
        amount <=
          0
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Invalid amount.",
            },
          );
      }

      // Generate the quote with a 3% protective spread
      const quote =
        await generateLiquidationQuote(
          amount,
          direction,
          0.03,
        );

      res
        .status(
          200,
        )
        .json(
          quote,
        );
    } catch (error) {
      console.error(
        "Quote Error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to generate execution quote.",
          },
        );
    }
  };

  // POST /api/purchases/initialize-fiat
exports.initializeFiatPayment = async (req, res) => {
  try {
    const { amount, currency, email, streamId, creatorId } = req.body;
    
    if (!amount || !email) {
      return res.status(400).json({ message: "Amount and email required" });
    }

    // Call Paystack Standard Initialize
    const paystackRes = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: Math.round(amount * 100), // Convert to lowest denomination (Kobo/Pesewas)
        currency: currency || 'NGN',
        callback_url: `${process.env.FRONTEND_URL}/payment-callback`, // Fallback for mobile redirects
        metadata: { streamId, creatorId }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({
      authorization_url: paystackRes.data.data.authorization_url,
      reference: paystackRes.data.data.reference
    });

  } catch (error) {
    console.error("Paystack Init Error:", error.response?.data || error.message);
    res.status(500).json({ message: "Failed to initialize payment gateway." });
  }
};