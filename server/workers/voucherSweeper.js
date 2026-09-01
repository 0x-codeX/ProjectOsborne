const cron = require("node-cron");
const Transaction = require("../models/Transaction");
const Wallet = require("../models/Wallet");

const sweepExpiredVouchers =
  async () => {
    try {
      const nowUnix =
        Math.floor(
          Date.now() /
            1000,
        );

      // Find vouchers that breached the 23-hour time-bomb
      const expiredTxns =
        await Transaction.find(
          {
            status:
              "PENDING_CLAIM",
            "metadata.deadline":
              {
                $lt: nowUnix,
              },
          },
        );

      for (const tx of expiredTxns) {
        // 1. Invalidate the transaction
        tx.status =
          "EXPIRED";
        await tx.save();

        // 2. Safely refund the destroyed ledger balance
        await Wallet.findOneAndUpdate(
          {
            _id: tx.wallet,
          },
          {
            $inc: {
              "fiatBalances.withdrawable.USDT":
                tx.amount,
            },
          },
        );
        console.log(
          `Refunded expired voucher: ${tx._id}`,
        );
      }
    } catch (err) {
      console.error(
        "Voucher sweeper failed:",
        err,
      );
    }
  };

// Run every 15 minutes
cron.schedule(
  "*/15 * * * *",
  sweepExpiredVouchers,
);

module.exports =
  {
    sweepExpiredVouchers,
  };