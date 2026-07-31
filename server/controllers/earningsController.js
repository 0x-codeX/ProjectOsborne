const Wallet = require("../models/Wallet");
const Withdrawal = require("../models/Withdrawal");
const Purchase = require("../models/Purchase");

// GET /api/earnings/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const creatorId = req.user._id;

    // 1. Fetch Wallet (Your existing O(1) fast-read logic)
    let wallet = await Wallet.findOne({ creator: creatorId }).lean();
    if (!wallet) {
      wallet = { balanceUSDT: 0, totalEarnedUSDT: 0 };
    }

    // 2. Fetch Recent Withdrawals (Your existing logic)
    const withdrawals = await Withdrawal.find({ creator: creatorId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // 3. Fetch Recent Sales (Your existing logic, enhanced slightly for safety)
    const recentSales = await Purchase.find({ creator: creatorId, status: "completed" })
      .populate("user", "username profileImage") // Grab profileImage for the UI avatars!
      .populate("content", "title")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // 4. NEW: Count Active Subscribers (Only counting unexpired subs!)
    const activeSubscribers = await Purchase.countDocuments({
      creator: creatorId,
      purchaseType: "SUBSCRIPTION",
      status: "completed",
      expiresAt: { $gt: new Date() } // Strict check: Must not be expired
    });

    // 5. NEW: Count Total PPV Unlocks
    const ppvSalesCount = await Purchase.countDocuments({
      creator: creatorId,
      purchaseType: "PPV",
      status: "completed"
    });

    // Send it all back
    res.status(200).json({
      wallet,
      withdrawals,
      recentTransactions: recentSales, // Renamed key so our UI map() works instantly
      activeSubscribers,
      ppvSalesCount
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ message: "Failed to load dashboard" });
  }
};

// POST /api/earnings/withdraw
exports.requestWithdrawal =
  async (
    req,
    res,
  ) => {
    try {
      const creatorId =
        req
          .user
          ._id;
      const {
        amount,
        payoutAddress,
      } =
        req.body;

      if (
        amount <
        10
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Minimum withdrawal is 10 USDT",
            },
          );
      }

      // ATOMIC UPDATE: Prevents race conditions / double-spend attacks
      const updatedWallet =
        await Wallet.findOneAndUpdate(
          {
            creator:
              creatorId,
            balanceUSDT:
              {
                $gte: amount,
              },
          },
          {
            $inc: {
              balanceUSDT:
                -amount,
            },
          },
          {
            returnDocument:
              "after",
          },
        );

      if (
        !updatedWallet
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Insufficient funds or wallet not found",
            },
          );
      }

      // Create the PENDING withdrawal request
      const withdrawal =
        await Withdrawal.create(
          {
            creator:
              creatorId,
            amount,
            payoutAddress,
            status:
              "PENDING",
          },
        );

      res
        .status(
          200,
        )
        .json(
          {
            message:
              "Withdrawal requested successfully",
            withdrawal,
          },
        );
    } catch (error) {
      console.error(
        "Withdrawal error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to process withdrawal",
          },
        );
    }
  };
