// server/controllers/webhookController.js
const crypto = require("crypto");
const Transaction = require("../models/Transaction");
const Purchase = require("../models/Purchase");
const Wallet = require("../models/Wallet");
const Dispute = require("../models/Dispute");
const Notification = require("../models/Notification");

exports.handlePaystackWebhook =
  async (
    req,
    res,
  ) => {
    // 1. Verify Paystack Signature
    const secretKey =
      process
        .env
        .PAYSTACK_SECRET_KEY ||
      process
        .env
        .PAYSTACK_WEBHOOK_SECRET;
    const hash =
      crypto
        .createHmac(
          "sha512",
          secretKey,
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

    const {
      event,
      data,
    } =
      req.body;

    try {
      // =========================================================
      // 2. TRANSFER LIFECYCLE EVENTS
      // =========================================================
      if (
        event ===
        "transfer.success"
      ) {
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
      }

      // =========================================================
      // 3. DISPUTE & CHARGEBACK LIFECYCLE EVENTS
      // =========================================================
      else if (
        event ===
        "charge.dispute.create"
      ) {
        const {
          reference,
          id: disputeId,
          amount,
          reason,
        } = data;

        // Find original purchase using Paystack fiatReference
        const purchase =
          await Purchase.findOne(
            {
              fiatReference:
                reference,
            },
          );
        if (
          !purchase
        ) {
          console.warn(
            `[!] Dispute ignored: Purchase ref ${reference} not found.`,
          );
          return res.sendStatus(
            200,
          );
        }

        const creatorId =
          purchase.creator;
        const creatorCut =
          Number(
            (
              (purchase.basePriceNGN ||
                purchase.amountPaid) *
              0.8
            ).toFixed(
              4,
            ),
          );

        // Atomic Wallet Clawback (allowing negative withdrawable balance)
        const wallet =
          await Wallet.findOneAndUpdate(
            {
              creator:
                creatorId,
            },
            {
              $inc: {
                "fiatBalances.withdrawable.NGN":
                  -creatorCut,
              },
              $set: {
                updatedAt:
                  new Date(),
              },
            },
            {
              new: true,
              upsert: true,
            },
          );

        // Create Dispute Audit Record
        await Dispute.create(
          {
            paystackDisputeId:
              String(
                disputeId,
              ),
            paystackReference:
              reference,
            purchase:
              purchase._id,
            creator:
              creatorId,
            fan: purchase.user,
            amountDisputedNGN:
              amount /
              100, // Paystack kobo conversion
            creatorDebitedNGN:
              creatorCut,
            reason:
              reason ||
              "Customer bank dispute filed",
            status:
              "AWAITING_MERCHANT_FEEDBACK",
            history:
              [
                {
                  action:
                    "DISPUTE_FILED",
                  timestamp:
                    new Date(),
                },
              ],
          },
        );

        // Log Negative Ledger Transaction
        await Transaction.create(
          {
            user: creatorId,
            wallet:
              wallet._id,
            type: "CHARGEBACK_DEBIT",
            amount:
              -creatorCut,
            currency:
              "NGN",
            reference: `DISPUTE_DEBIT_${disputeId}`,
            status:
              "COMPLETED",
            metadata:
              {
                paystackDisputeId:
                  disputeId,
                paystackReference:
                  reference,
              },
          },
        );

        // Notify Creator of Debt Hold
        await Notification.create(
          {
            recipient:
              creatorId,
            type: "PAYMENT_FAILED",
            title:
              "Bank Dispute Initiated",
            message: `A chargeback of ₦${creatorCut.toLocaleString()} was filed on reference ${reference}. Your wallet balance has been updated.`,
            actionUrl:
              "/creator/earnings",
          },
        );

        console.warn(
          `[!] Chargeback clawback applied for Creator ${creatorId}: -₦${creatorCut}`,
        );
      } else if (
        event ===
        "charge.dispute.resolve"
      ) {
        const {
          id: disputeId,
          status:
            disputeStatus,
        } =
          data;

        const dispute =
          await Dispute.findOne(
            {
              paystackDisputeId:
                String(
                  disputeId,
                ),
            },
          );
        if (
          dispute &&
          dispute.status !==
            "RESOLVED" &&
          dispute.status !==
            "DEFEATED"
        ) {
          if (
            disputeStatus ===
              "merchant-accepted" ||
            disputeStatus ===
              "lost"
          ) {
            dispute.status =
              "LOST";
            dispute.history.push(
              {
                action:
                  "DISPUTE_LOST",
                timestamp:
                  new Date(),
              },
            );
            await dispute.save();
          } else if (
            disputeStatus ===
              "reversed" ||
            disputeStatus ===
              "won"
          ) {
            // Merchant Won: Refund the Creator's Wallet
            const wallet =
              await Wallet.findOneAndUpdate(
                {
                  creator:
                    dispute.creator,
                },
                {
                  $inc: {
                    "fiatBalances.withdrawable.NGN":
                      dispute.creatorDebitedNGN,
                  },
                },
                {
                  new: true,
                },
              );

            dispute.status =
              "DEFEATED";
            dispute.history.push(
              {
                action:
                  "DISPUTE_WON_FUNDS_RESTORED",
                timestamp:
                  new Date(),
              },
            );
            await dispute.save();

            // Log Reversal Ledger Transaction
            await Transaction.create(
              {
                user: dispute.creator,
                wallet:
                  wallet._id,
                type: "CHARGEBACK_REVERSAL",
                amount:
                  dispute.creatorDebitedNGN,
                currency:
                  "NGN",
                reference: `DISPUTE_REFUND_${disputeId}`,
                status:
                  "COMPLETED",
                metadata:
                  {
                    paystackDisputeId:
                      disputeId,
                  },
              },
            );
          }
        }
      }
    } catch (error) {
      console.error(
        "Webhook controller processing error:",
        error,
      );
    }

    // Acknowledge receipt quickly to prevent Paystack retries
    res.sendStatus(
      200,
    );
  };
