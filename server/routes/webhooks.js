// server/routes/webhooks.js
const express = require("express");
const crypto = require("crypto");
const router =
  express.Router();
const User = require("../models/User");
const Withdrawal = require("../models/Withdrawal");

// Paystack sends data as JSON. Ensure your server uses express.json()
router.post(
  "/paystack",
  async (
    req,
    res,
  ) => {
    try {
      // 1. RUTHLESS VERIFICATION: Validate Paystack Signature
      const secret =
        process
          .env
          .PAYSTACK_SECRET_KEY;
      const hash =
        crypto
          .createHmac(
            "sha512",
            secret,
          )
          .update(
            JSON.stringify(
              req.body,
            ),
          )
          .digest(
            "hex",
          );

      if (
        hash !==
        req
          .headers[
          "x-paystack-signature"
        ]
      ) {
        console.error(
          "🚨 ALERT: Forged Paystack Webhook Attempted!",
        );
        return res
          .status(
            401,
          )
          .send(
            "Unauthorized",
          );
      }

      const event =
        req.body;

      // 2. HANDLE TRANSFER SUCCESS
      if (
        event.event ===
        "transfer.success"
      ) {
        const transferData =
          event.data;
        const withdrawalReference =
          transferData.reference; // Your internal DB ID

        // Mark the locked withdrawal as COMPLETED.
        // Do NOT deduct balance here. It was already deducted when they clicked 'Withdraw'.
        await Withdrawal.findOneAndUpdate(
          {
            reference:
              withdrawalReference,
          },
          {
            status:
              "COMPLETED",
            completedAt:
              Date.now(),
          },
        );
      }

      // 3. HANDLE TRANSFER FAILURE (THE REFUND)
      if (
        event.event ===
          "transfer.failed" ||
        event.event ===
          "transfer.reversed"
      ) {
        const transferData =
          event.data;
        const withdrawalReference =
          transferData.reference;

        const failedWithdrawal =
          await Withdrawal.findOne(
            {
              reference:
                withdrawalReference,
            },
          );

        if (
          failedWithdrawal &&
          failedWithdrawal.status !==
            "FAILED"
        ) {
          // Refund the creator because the bank rejected it
          await User.findByIdAndUpdate(
            failedWithdrawal.userId,
            {
              $inc: {
                usdtBalance:
                  failedWithdrawal.amount,
              },
            },
          );

          // Mark as failed so it doesn't process again
          failedWithdrawal.status =
            "FAILED";
          failedWithdrawal.failureReason =
            transferData.reason ||
            "Bank rejection";
          await failedWithdrawal.save();
        }
      }

      // Always return 200 OK immediately so Paystack doesn't keep retrying
      res
        .status(
          200,
        )
        .send(
          "Webhook received",
        );
    } catch (error) {
      console.error(
        "Webhook Error:",
        error,
      );
      res
        .status(
          500,
        )
        .send(
          "Internal Server Error",
        );
    }
  },
);

module.exports =
  router;
