// server/workers/fiatBatchProcessor.js
const cron = require("node-cron");
const axios = require("axios");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const SystemLog = require("../models/SystemLog");

const PAYSTACK_SECRET =
  process
    .env
    .PAYSTACK_SECRET_KEY;
const PAYSTACK_API =
  "https://api.paystack.co";

const axiosConfig =
  {
    headers:
      {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type":
          "application/json",
      },
  };

/**
 * Creates a Paystack Transfer Recipient if one doesn't exist.
 */
async function getOrCreateRecipient(
  user,
) {
  try {
    // If we already saved it during KYC/Settings, return it.
    if (
      user.paystackRecipientCode
    )
      return user.paystackRecipientCode;

    const payload =
      {
        type: "nuban", // Represents Nigerian bank accounts
        name: user.accountName,
        account_number:
          user.accountNumber,
        bank_code:
          user.bankCode,
        currency:
          "NGN",
      };

    const res =
      await axios.post(
        `${PAYSTACK_API}/transferrecipient`,
        payload,
        axiosConfig,
      );
    const recipientCode =
      res
        .data
        .data
        .recipient_code;

    // Save for future use to save API calls
    user.paystackRecipientCode =
      recipientCode;
    await user.save();

    return recipientCode;
  } catch (error) {
    console.error(
      `Failed to create recipient for ${user.username}:`,
      error
        .response
        ?.data ||
        error.message,
    );
    return null;
  }
}

/**
 * 5:00 PM DAILY FIAT BATCH DISPATCHER
 */
const runFiatBatchTransfer =
  async () => {
    console.log(
      "=== INITIATING 5:00 PM FIAT BULK TRANSFER ===",
    );
    try {
      // 1. Fetch all fiat transactions waiting for payout
      const pendingFiatTxns =
        await Transaction.find(
          {
            status:
              "PENDING", // Set by the Admin Controller for Fiat
            type: "LIQUIDATION",
            currency:
              "NGN",
          },
        ).populate(
          "user",
        );

      if (
        pendingFiatTxns.length ===
        0
      ) {
        console.log(
          "[i] No pending fiat payouts today.",
        );
        return;
      }

      console.log(
        `[i] Found ${pendingFiatTxns.length} pending fiat payouts. Processing recipients...`,
      );

      const transferPayloads =
        [];

      // 2. Build the Paystack Transfer Array
      for (const tx of pendingFiatTxns) {
        const recipient_code =
          await getOrCreateRecipient(
            tx.user,
          );

        if (
          !recipient_code
        ) {
          console.warn(
            `[!] Skipping TX ${tx.reference} due to invalid bank details.`,
          );
          continue;
        }

        transferPayloads.push(
          {
            amount:
              Math.round(
                tx.amount *
                  100,
              ), // Paystack requires amount in kobo (lowest denomination)
            reference:
              tx.reference, // Your unique DB transaction reference
            reason:
              "Nippy Creator Earnings Payout",
            recipient:
              recipient_code,
          },
        );
      }

      if (
        transferPayloads.length ===
        0
      )
        return;

      // 3. Chunk into batches of 100 to respect Paystack rate limits
      const chunkSize = 100;
      for (
        let i = 0;
        i <
        transferPayloads.length;
        i +=
          chunkSize
      ) {
        const batch =
          transferPayloads.slice(
            i,
            i +
              chunkSize,
          );

        try {
          const payload =
            {
              currency:
                "NGN",
              source:
                "balance", // Must be "balance" to pull from your Paystack funds
              transfers:
                batch,
            };

          const res =
            await axios.post(
              `${PAYSTACK_API}/transfer/bulk`,
              payload,
              axiosConfig,
            );

          // 4. Update Database Status to PROCESSING
          const referencesInBatch =
            batch.map(
              (
                b,
              ) =>
                b.reference,
            );
          await Transaction.updateMany(
            {
              reference:
                {
                  $in: referencesInBatch,
                },
            },
            {
              $set: {
                status:
                  "PROCESSING",
              },
            },
          );

          console.log(
            `[+] Dispatched batch of ${batch.length} transfers successfully.`,
          );

          // Paystack requires a 5-second delay between bulk batches
          if (
            i +
              chunkSize <
            transferPayloads.length
          ) {
            await new Promise(
              (
                resolve,
              ) =>
                setTimeout(
                  resolve,
                  5000,
                ),
            );
          }
        } catch (batchError) {
          console.error(
            "[-] Bulk Transfer Batch Failed:",
            batchError
              .response
              ?.data ||
              batchError.message,
          );
        }
      }

      await SystemLog.create(
        {
          adminId:
            null,
          action:
            "FIAT_BULK_TRANSFER_DISPATCHED",
          details: `Dispatched ${transferPayloads.length} transfers to Paystack.`,
        },
      );

      console.log(
        "=== FIAT BATCH TRANSFER COMPLETE ===",
      );
    } catch (error) {
      console.error(
        "[-] Critical error in fiat batch processor:",
        error,
      );
    }
  };

// Schedule for 5:00 PM WAT daily
cron.schedule(
  "0 15 * * 5",
  runFiatBatchTransfer,
  {
    scheduled: true,
    timezone:
      "Africa/Lagos",
  },
);

module.exports =
  {
    runFiatBatchTransfer,
  };
