const {
  ethers,
} = require("ethers");
const Purchase = require("../models/Purchase");
const User = require("../models/User");
const Content = require("../models/Content");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Wallet = require("../models/Wallet");

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
        purchaseType,
        messageId,
      } =
        req.body;
      const buyerId =
        req
          .user
          ._id;

      // 1. Replay Attack Check
      const existingPurchase =
        await Purchase.findOne(
          {
            txHash,
          },
        );
      if (
        existingPurchase
      ) {
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
      }

      // 2. Branch Logic: Fetch Creator & Determine Expected Price
      let creator;
      let content =
        null;
      let expectedPrice = 0;

      if (
        purchaseType ===
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
        expectedPrice =
          creator
            .monetizationSettings
            ?.monthlySubscription ||
          0;
      } else if (
        purchaseType ===
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
        expectedPrice =
          creator
            .monetizationSettings
            ?.messageBundlePrice ||
          0;
        if (
          expectedPrice ===
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
        purchaseType ===
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
        expectedPrice =
          content.priceInUSDT !==
          null
            ? content.priceInUSDT
            : creator
                .monetizationSettings
                ?.defaultPPVPrice ||
              0;
      } else if (
        purchaseType ===
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
        expectedPrice =
          content.priceInUSDT ||
          0;
      }

      if (
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

      // 3. Connect to Polygon RPC
      const rpcUrl =
        process
          .env
          .POLYGON_RPC_URL;
      if (
        !rpcUrl
      ) {
        throw new Error(
          "Missing POLYGON_RPC_URL in .env file",
        );
      }
      const provider =
        new ethers.JsonRpcProvider(
          rpcUrl,
        );

      // 4. Fetch Blockchain Transaction & Receipt
      const tx =
        await provider.getTransaction(
          txHash,
        );
      if (
        !tx
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Transaction not found on network.",
            },
          );

      const receipt =
        await provider.getTransactionReceipt(
          txHash,
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
                "Transaction failed/reverted.",
            },
          );

      // 5. Verify Contract
      const GATEWAY_ADDRESS =
        process.env.NIPPY_GATEWAY_ADDRESS?.toLowerCase();
      const USDT_ADDRESS =
        process.env.MOCK_USDT_ADDRESS?.toLowerCase();

      if (
        !GATEWAY_ADDRESS ||
        !USDT_ADDRESS
      ) {
        console.error(
          "CRITICAL: Missing contract addresses in .env file.",
        );
        return res
          .status(
            500,
          )
          .json(
            {
              message:
                "Server configuration error.",
            },
          );
      }

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
                "Fraud: Transaction was not sent to the official Gateway contract.",
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
        ); // USDT has 6 decimals

      // Security Checks
      if (
        actualToken !==
        USDT_ADDRESS
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Fraud: Incorrect token used for payment.",
            },
          );
      }
      if (
        actualRecipient !==
        expectedWallet
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Fraud: Funds assigned to wrong wallet.",
            },
          );
      }
      if (
        Number(
          actualAmount,
        ) <
        expectedPrice
      ) {
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
      }

      // --- THE FIX: YOU MUST ACTUALLY CREATE THE PURCHASE RECORD ---
      let expiresAt =
        null;
      if (
        purchaseType ===
        "SUBSCRIPTION"
      ) {
        const now =
          new Date();
        expiresAt =
          new Date(
            now.setDate(
              now.getDate() +
                30,
            ),
          );
      }

      const purchase =
        await Purchase.create(
          {
            user: buyerId,
            content:
              purchaseType ===
              "PPV"
                ? content._id
                : null,
            message:
              purchaseType ===
              "DM_UNLOCK"
                ? content._id
                : null,
            creator:
              creator._id,
            txHash,
            amountPaid:
              Number(
                actualAmount,
              ),
            purchaseType,
            expiresAt,
            status:
              "completed",
          },
        );

      // Fulfill DM Unlock
      if (
        purchaseType ===
        "DM_UNLOCK"
      ) {
        const fanUser =
          await User.findById(
            buyerId,
          );
        if (
          fanUser.walletAddress
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

      // 7.5. THE CHAT BUNDLE MATH & FULFILLMENT
      if (
        purchaseType ===
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
              creator._id,
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

      // 8. Automate Creator Ledger Split (Atomic)
      const PLATFORM_FEE = 0.2; // 20%
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
              "Payment verified successfully.",
            purchase,
          },
        );
    } catch (error) {
      console.error(
        "Verification error:",
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

      // Fetch all purchases by this fan, populating the creator and content details
      const purchases =
        await Purchase.find(
          {
            user: userId,
          },
        )
          .populate(
            "creator",
            "username profileImage",
          )
          .populate(
            "content",
            "title description fileKey",
          ) // Bring in the video details
          .sort(
            {
              createdAt:
                -1,
            },
          )
          .lean();

      const subscriptions =
        [];
      const ppv =
        [];
      const subbedCreators =
        new Set(); // To prevent showing the same creator twice if they renewed

      purchases.forEach(
        (
          p,
        ) => {
          if (
            p.purchaseType ===
              "SUBSCRIPTION" &&
            p.creator
          ) {
            const creatorId =
              p.creator._id.toString();
            // Only push unique active subscriptions
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
          } else if (
            p.purchaseType ===
              "PPV" &&
            p.content
          ) {
            ppv.push(
              p,
            );
          }
        },
      );

      res
        .status(
          200,
        )
        .json(
          {
            subscriptions,
            ppv,
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
