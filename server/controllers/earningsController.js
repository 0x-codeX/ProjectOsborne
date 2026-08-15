const Wallet = require("../models/Wallet");
const Withdrawal = require("../models/Withdrawal");
const Purchase = require("../models/Purchase");

exports.getDashboard =
  async (
    req,
    res,
  ) => {
    try {
      const creatorId =
        req
          .user
          ._id;

      let wallet =
        await Wallet.findOne(
          {
            creator:
              creatorId,
          },
        ).lean();
      if (
        !wallet
      ) {
        wallet =
          {
            fiatBalances:
              {},
            fiatTotalEarned:
              {},
            lifetimeWeb3EarnedUSDT: 0,
          };
      }

      const withdrawals =
        await Withdrawal.find(
          {
            creator:
              creatorId,
          },
        )
          .sort(
            {
              createdAt:
                -1,
            },
          )
          .limit(
            10,
          )
          .lean();

      const recentSales =
        await Purchase.find(
          {
            creator:
              creatorId,
            status:
              "completed",
          },
        )
          .populate(
            "user",
            "username profileImage",
          )
          .populate(
            "content",
            "title",
          )
          .sort(
            {
              createdAt:
                -1,
            },
          )
          .limit(
            10,
          )
          .lean();

      const activeSubscribers =
        await Purchase.countDocuments(
          {
            creator:
              creatorId,
            purchaseType:
              "SUBSCRIPTION",
            status:
              "completed",
            expiresAt:
              {
                $gt: new Date(),
              },
          },
        );

      const ppvSalesCount =
        await Purchase.countDocuments(
          {
            creator:
              creatorId,
            purchaseType:
              "PPV",
            status:
              "completed",
          },
        );

      res
        .status(
          200,
        )
        .json(
          {
            wallet,
            withdrawals,
            recentTransactions:
              recentSales,
            activeSubscribers,
            ppvSalesCount,
          },
        );
    } catch (error) {
      console.error(
        "Dashboard Error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to load dashboard",
          },
        );
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
