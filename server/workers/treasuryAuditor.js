const cron = require("node-cron");
const {
  ethers,
} = require("ethers");
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const ClearingRequest = require("../models/ClearingRequest");
const SystemState = require("../models/SystemState");
const SystemLog = require("../models/SystemLog");

// Initialize RPC
const provider =
  new ethers.JsonRpcProvider(
    process
      .env
      .POLYGON_RPC_URL,
  );
const usdtContract =
  new ethers.Contract(
    process
      .env
      .MOCK_USDT_ADDRESS,
    [
      "function balanceOf(address) view returns (uint256)",
    ],
    provider,
  );

/**
 * DAILY 3:00 PM WAT RECONCILIATION & ROLLOVER PROTOCOL
 */
const runReconciliation =
  async () => {
    console.log(
      "=== INITIATING 3:00 PM TREASURY RECONCILIATION ===",
    );
    try {
      // 1. Fetch the master state
      let state =
        await SystemState.findOne(
          {
            key: "MASTER_STATE",
          },
        );
      if (
        !state
      ) {
        state =
          await SystemState.create(
            {
              key: "MASTER_STATE",
            },
          );
      }

      if (
        state.payoutsLocked
      ) {
        console.log(
          "[!] System is currently locked. Skipping reconciliation to preserve forensic state.",
        );
        return;
      }

      // 2. Calculate Expected Unclaimed Liability
      const outstandingClaims =
        await Transaction.aggregate(
          [
            {
              $match:
                {
                  status:
                    "PENDING_CLAIM",
                  currency:
                    "USDT",
                },
            },
            {
              $group:
                {
                  _id: null,
                  totalLocked:
                    {
                      $sum: "$amount",
                    },
                },
            },
          ],
        );
      const expectedLiability =
        outstandingClaims.length >
        0
          ? outstandingClaims[0]
              .totalLocked
          : 0;

      // 3. Fetch Actual On-Chain Balance
      const rawBalance =
        await usdtContract.balanceOf(
          process
            .env
            .NIPPY_TREASURY_PAYOUT,
        );
      const actualBalanceUSDT =
        Number(
          ethers.formatUnits(
            rawBalance,
            6,
          ),
        );

      console.log(
        `Expected Liability: ${expectedLiability} USDT`,
      );
      console.log(
        `Actual On-Chain Balance: ${actualBalanceUSDT} USDT`,
      );

      // 4. THE BREACH CHECK (The Shield)
      if (
        actualBalanceUSDT <
        expectedLiability
      ) {
        console.error(
          "CRITICAL ALARM: ACTUAL BALANCE IS LESS THAN EXPECTED LIABILITY. BREACH DETECTED.",
        );

        // TRIGGER KILL SWITCH
        state.payoutsLocked = true;
        state.lastReconciliationStatus =
          "FAIL_BREACH";
        state.breachDetails = `Expected: ${expectedLiability}, Actual: ${actualBalanceUSDT}. Missing: ${expectedLiability - actualBalanceUSDT} USDT`;
        await state.save();

        await SystemLog.create(
          {
            adminId:
              null,
            action:
              "AUTOMATED_TREASURY_LOCKDOWN",
            details:
              state.breachDetails,
          },
        );

        // TODO: Implement an emergency email/SMS dispatch to founders here
        return;
      }

      // 5. IF SAFE: EXECUTE VOUCHER ROLLOVER (3:05 PM Logic)
      // Find vouchers created more than 23 hours ago
      const twentyThreeHoursAgo =
        new Date(
          Date.now() -
            23 *
              60 *
              60 *
              1000,
        );

      const expiredTransactions =
        await Transaction.find(
          {
            status:
              "PENDING_CLAIM",
            currency:
              "USDT",
            createdAt:
              {
                $lt: twentyThreeHoursAgo,
              },
          },
        );

      if (
        expiredTransactions.length >
        0
      ) {
        console.log(
          `Rolling over ${expiredTransactions.length} expired vouchers...`,
        );

        for (const tx of expiredTransactions) {
          // Void the transaction
          tx.status =
            "REJECTED";
          tx.metadata =
            {
              ...tx.metadata,
              voidReason:
                "24H_TIMEOUT_ROLLOVER",
            };
          await tx.save();

          // Push the Clearing Request back to the queue for the God Admin to re-approve
          await ClearingRequest.findByIdAndUpdate(
            tx.clearingRequestId,
            {
              status:
                "PENDING_APPROVAL",
              approvedBy:
                null,
            },
          );
        }
      }

      // 6. Log Success
      state.lastReconciliationStatus =
        "PASS";
      state.lastReconciliationRun =
        new Date();
      await state.save();

      console.log(
        "=== RECONCILIATION COMPLETE: SYSTEM SECURE ===",
      );
    } catch (error) {
      console.error(
        "Reconciliation execution failed:",
        error,
      );
    }
  };

// Schedule for 3:00 PM every day.
// Note: Node servers default to UTC. 3:00 PM WAT (UTC+1) is 2:00 PM UTC.
// To ensure it runs on Nigerian time precisely, pass the timezone parameter.
cron.schedule(
  "0 15 * * *",
  runReconciliation,
  {
    scheduled: true,
    timezone:
      "Africa/Lagos",
  },
);

module.exports =
  {
    runReconciliation,
  };
