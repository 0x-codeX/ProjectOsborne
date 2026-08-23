// server/models/Transaction.js
const mongoose = require("mongoose");

const TransactionSchema =
  new mongoose.Schema(
    {
      reference:
        {
          type: String,
          required: true,
          unique: true,
          default:
            () =>
              "TXN_" +
              Math.random()
                .toString(
                  36,
                )
                .substring(
                  2,
                  15,
                )
                .toUpperCase(),
        },
      user: {
        type: mongoose
          .Schema
          .Types
          .ObjectId,
        ref: "User",
        required: true,
      },
      wallet:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "Wallet",
          required: true,
        },
      type: {
        type: String,
        enum: [
          "DEPOSIT",
          "WITHDRAWAL",
          "LIQUIDATION",
          "TRANSFER",
          "FEE",
        ],
        required: true,
      },
      status:
        {
          type: String,
          enum: [
            "PENDING", // Initiated by Maker
            "PENDING_CLAIM", // Super Admin Approved, EIP-712 Voucher generated, awaiting user
            "COMPLETED", // Claimed on-chain OR fiat batch paid
            "FAILED",
            "REJECTED",
          ],
          default:
            "PENDING",
        },
      // The primary currency and amount moving
      amount:
        {
          type: Number,
          required: true,
        },
      currency:
        {
          type: String,
          enum: [
            "NGN",
            "USDT",
          ],
          required: true,
        },

      // For swaps/liquidations (e.g., USDT -> NGN)
      isSwap:
        {
          type: Boolean,
          default: false,
        },
      swapDetails:
        {
          fromCurrency:
            String,
          toCurrency:
            String,
          exchangeRate:
            Number,
          spreadFeeEarned:
            Number, // Capturing your 3% spread profit for accounting
        },

      // Audit Trail
      authorizedByAdmin:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "User",
        },
      clearingRequestId:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "ClearingRequest",
        },
      metadata:
        {
          type: mongoose
            .Schema
            .Types
            .Mixed, // Store Paystack webhooks, Polygon Tx Hashes here
        },
    },
    {
      timestamps: true,
    },
  );

// Prevent modifications to completed transactions (Immutability check)
TransactionSchema.pre(
  "save",
  function (
    next,
  ) {
    if (
      !this
        .isNew &&
      this.isModified() &&
      this
        .status ===
        "COMPLETED"
    ) {
      // Only allow status changes if it's failing/reversing, but block arbitrary data changes
      if (
        this.isModified(
          "amount",
        ) ||
        this.isModified(
          "currency",
        )
      ) {
        return next(
          new Error(
            "FATAL: Cannot modify amounts on a logged transaction.",
          ),
        );
      }
    }
    next();
  },
);

module.exports =
  mongoose.model(
    "Transaction",
    TransactionSchema,
  );
