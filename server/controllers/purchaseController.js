const {
  ethers,
} = require("ethers");
const Purchase = require("../models/Purchase");
const Content = require("../models/Content");
const User = require("../models/User");
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
        ) {
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
        }
        creator =
          await User.findById(
            creatorId,
          );
        if (
          !creator
        ) {
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
        }
        expectedPrice =
          creator
            .monetizationSettings
            ?.monthlySubscription ||
          0;
      } else {
        // PPV Purchase
        if (
          !contentId
        ) {
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
        }
        content =
          await Content.findById(
            contentId,
          ).populate(
            "creator",
          );
        if (
          !content
        ) {
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
        }
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
      const provider =
        new ethers.JsonRpcProvider(
          "https://polygon-rpc.com",
        );

      // 4. Fetch Blockchain Transaction & Receipt
      const tx =
        await provider.getTransaction(
          txHash,
        );
      if (
        !tx
      ) {
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
      }

      const receipt =
        await provider.getTransactionReceipt(
          txHash,
        );
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
                "Transaction failed/reverted.",
            },
          );
      }

      // 5. Verify Contract (Must be Polygon USDT)
      const USDT_ADDRESS =
        "0xc2132D05D31c914a87C6611C10748AEb04B58e8F".toLowerCase();
      if (
        tx.to.toLowerCase() !==
        USDT_ADDRESS
      ) {
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
      }

      // 6. Decode Input Data
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
        ); // 6 decimals for USDT

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
                "Fraud: Funds sent to wrong wallet.",
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
          ); // Sets expiration to 30 days from now
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
            expiresAt, // <-- SAVES EXPIRATION DATE
            status:
              "completed", // <-- MARKED AS COMPLETED
          },
        );

      // 8. Automate Creator Ledger Split (Atomic)
      const PLATFORM_FEE = 0.2; // 20%
      const actualPrice =
        Number(
          actualAmount,
        );
      const creatorEarnings =
        Number(
          (
            actualPrice *
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
              "Payment verified and content unlocked.",
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
exports.getFanDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch all purchases by this fan, populating the creator and content details
    const purchases = await Purchase.find({ user: userId })
      .populate("creator", "username profileImage")
      .populate("content", "title description fileKey") // Bring in the video details
      .sort({ createdAt: -1 })
      .lean();

    const subscriptions = [];
    const ppv = [];
    const subbedCreators = new Set(); // To prevent showing the same creator twice if they renewed

    purchases.forEach((p) => {
      if (p.purchaseType === "SUBSCRIPTION" && p.creator) {
        const creatorId = p.creator._id.toString();
        // Only push unique active subscriptions
        if (!subbedCreators.has(creatorId)) {
          subbedCreators.add(creatorId);
          subscriptions.push(p);
        }
      } else if (p.purchaseType === "PPV" && p.content) {
        ppv.push(p);
      }
    });

    res.status(200).json({ subscriptions, ppv });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ message: "Failed to load dashboard data" });
  }
};