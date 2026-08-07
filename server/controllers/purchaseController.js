const {
  ethers,
} = require("ethers");
const Purchase = require("../models/Purchase");
const Content = require("../models/Content");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
// ⚠️ MENTOR NOTE: Don't forget to import your chat balance model!
const Conversation = require("../models/Conversation");

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
                  "creatorId is required for subscriptions.",
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
      }
      // ⚠️ MENTOR NOTE: Added the CHAT_BUNDLE branch here
      else if (
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
                  "creatorId is required for chat bundles.",
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

        // Expected price is the cost of at least ONE bundle
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
      } else {
        // PPV Purchase
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
                  "contentId is required for PPV purchases.",
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
      // const provider =
      //   new ethers.JsonRpcProvider(
      //     "https://rpc-amoy.polygon.technology/",
      //   );
      const rpcUrl =
        process
          .env
          .POLYGON_RPC_URL; // Make sure this matches the variable name in your .env file

      if (
        !rpcUrl
      ) {
        throw new Error(
          "Missing ALCHEMY_AMOY_URL in .env file",
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

      // 5. Verify Contract (Must be the Nippy Gateway Contract from .env!)
      const GATEWAY_ADDRESS =
        process.env.NIPPY_GATEWAY_ADDRESS?.toLowerCase();
      const USDT_ADDRESS =
        process.env.MOCK_USDT_ADDRESS?.toLowerCase();

      // Safety Check: Fails securely if your .env file is misconfigured
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

      // 6. Decode Input Data (Using the Gateway's ABI, NOT standard ERC20)
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

      // Map the decoded arguments from purchaseWithERC20
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

      // Security Check A: Did they actually pay with our approved USDT?
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

      // Security Check B: Did the money go to the right creator?
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

      // Security Check C: Did they pay enough?
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

      // 7. Calculate Subscription Expiration & Save Purchase
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
              content
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

      // // ==========================================
      // 7.5. THE CHAT BUNDLE MATH & FULFILLMENT
      // ==========================================
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

        // Calculate how many total bundles they can afford
        const bundlesPurchased =
          Math.floor(
            amountPaid /
              bundlePrice,
          );
        const bubblesToCredit =
          bundlesPurchased *
          bundleSize;

        // Ironclad atomic update using your Conversation model
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
                amountPaid, // Instantly updates their LTV!
            },
            $setOnInsert:
              {
                participants:
                  [
                    creator._id,
                    buyerId,
                  ], // Required by your schema if it's a new chat
              },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          },
        );
      }
      // ==========================================
      // ==========================================

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
