const Wallet = require("../models/Wallet");
const Withdrawal = require("../models/Withdrawal");
const Purchase = require("../models/Purchase");
const {
  getLiveP2PRates,
  generateLiquidationQuote,
} = require("../utils/p2pLiquidity");



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

// GET /api/earnings/p2p-rate (Dashboard Preview - Uses Cache)
exports.getP2PRatePreview = async (req, res) => {
  try {
    const rates = await getLiveP2PRates(false); 
    res.status(200).json(rates);
  } catch (error) {
    console.error("P2P Preview Error:", error);
    res
      .status(
        500,
      )
      .json(
        {
          USD: {
            buy: 1,
            sell: 1,
            mid: 1,
          },
        },
      );
  }
};

// POST /api/earnings/quote (JIT Quote Generator - Live Rate)
exports.getLiquidationQuote = async (req, res) => {
  try {
    const { amount, direction } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount requested." });
    }

    // Generate the quote with a 3% protective spread
    const quote = await generateLiquidationQuote(amount, direction, 0.03);
    res.status(200).json(quote);
  } catch (error) {
    console.error("Quote Error:", error);
    res.status(500).json({ message: "Failed to generate execution quote." });
  }
};

// POST /api/earnings/liquidate (Execution Engine)
exports.executeLiquidation = async (req, res) => {
  try {
    const {
      amount,
      quote,
    } =
      req.body;
    const creatorId =
      req
        .user
        ._id;

    if (
      !amount ||
      !quote
    ) {
      return res
        .status(
          400,
        )
        .json(
          {
            message:
              "Missing liquidation payload.",
          },
        );
    }

    // SECURITY CHECK 1: Expiration
    if (
      Date.now() >
      quote.quoteExpiresAt
    ) {
      return res
        .status(
          400,
        )
        .json(
          {
            message:
              "Quote expired. Please close and request a new quote.",
          },
        );
    }

    // Fetch the dedicated Wallet document
    const wallet =
      await Wallet.findOne(
        {
          creator:
            creatorId,
        },
      );
    if (
      !wallet
    )
      return res
        .status(
          404,
        )
        .json(
          {
            message:
              "Wallet not found.",
          },
        );

    // Initialize nested objects if they don't exist to prevent crashes
    if (
      !wallet.fiatBalances
    )
      wallet.fiatBalances =
        {};
    if (
      !wallet
        .fiatBalances
        .floating
    )
      wallet.fiatBalances.floating =
        {};
    if (
      !wallet
        .fiatBalances
        .withdrawable
    )
      wallet.fiatBalances.withdrawable =
        {};

    // --- DYNAMIC MULTI-CURRENCY LIQUIDATION LOGIC ---
    const [
      fromCurr,
      toCurr,
    ] =
      quote.direction.split(
        "_TO_",
      );

    if (
      fromCurr ===
      "USDT"
    ) {
      // Selling USDT for Creator's Preferred Fiat (e.g. USDT -> GHS, USDT -> NGN)
      const currentUSDT =
        wallet
          .fiatBalances
          .withdrawable
          .USDT ||
        0;

      if (
        currentUSDT <
        amount
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Insufficient USDT balance.",
            },
          );
      }

      wallet.fiatBalances.withdrawable.USDT -=
        amount;
      const currentFloating =
        wallet
          .fiatBalances
          .floating[
          toCurr
        ] ||
        0;
      wallet.fiatBalances.floating[
        toCurr
      ] =
        currentFloating +
        quote.estimatedPayout;
    } else if (
      toCurr ===
      "USDT"
    ) {
      // Selling Fiat for USDT (e.g. GHS -> USDT, NGN -> USDT)
      const currentFiat =
        wallet
          .fiatBalances
          .withdrawable[
          fromCurr
        ] ||
        0;

      if (
        currentFiat <
        amount
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message: `Insufficient ${fromCurr} balance.`,
            },
          );
      }

      wallet.fiatBalances.withdrawable[
        fromCurr
      ] -=
        amount;
      const currentFloatingUSDT =
        wallet
          .fiatBalances
          .floating
          .USDT ||
        0;
      wallet.fiatBalances.floating.USDT =
        currentFloatingUSDT +
        quote.estimatedPayout;
    } else {
      return res
        .status(
          400,
        )
        .json(
          {
            message:
              "Invalid liquidation direction.",
          },
        );
    }

    // Save the updated balances atomically
    await wallet.save();

    res
      .status(
        200,
      )
      .json(
        {
          message:
            "Liquidation executed successfully.",
          wallet:
            wallet,
        },
      );
  } catch (error) {
    console.error("Liquidation Execution Error:", error);
    res.status(500).json({ message: "Failed to process liquidation." });
  }
};
