const express = require("express");
const crypto = require("crypto");
const Transaction = require("../models/Transaction");
const router =
  express.Router();

router.post(
  "/paystack",
  async (
    req,
    res,
  ) => {
    // 1. Verify Paystack Signature for Security
    const hash =
      crypto
        .createHmac(
          "sha512",
          process
            .env
            .PAYSTACK_SECRET_KEY,
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
      return res
        .status(
          401,
        )
        .send(
          "Unauthorized Webhook",
        );
    }

    const event =
      req
        .body
        .event;
    const data =
      req
        .body
        .data;

    try {
      // 2. Handle Transfer Lifecycle Events
      if (
        event ===
        "transfer.success"
      ) {
        // Find the exact transaction using the unique reference we sent
        await Transaction.findOneAndUpdate(
          {
            reference:
              data.reference,
          },
          {
            $set: {
              status:
                "COMPLETED",
              "metadata.paystackTransferCode":
                data.transfer_code,
            },
          },
        );
        console.log(
          `[+] Paystack Transfer Success: ${data.reference}`,
        );
      } else if (
        event ===
          "transfer.failed" ||
        event ===
          "transfer.reversed"
      ) {
        await Transaction.findOneAndUpdate(
          {
            reference:
              data.reference,
          },
          {
            $set: {
              status:
                "FAILED",
              "metadata.failureReason":
                data.reason ||
                "Bank rejection",
            },
          },
        );
        console.error(
          `[-] Paystack Transfer Failed/Reversed: ${data.reference}`,
        );

        // NOTE: You would typically write logic here to refund the user's
        // floating balance in your DB so they can attempt withdrawal again.
      }
    } catch (error) {
      console.error(
        "Webhook processing error:",
        error,
      );
    }

    // Paystack requires a 200 OK response quickly, otherwise they retry the webhook
    res.sendStatus(
      200,
    );
  },
);

module.exports =
  router;
