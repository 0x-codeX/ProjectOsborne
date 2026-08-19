const mongoose = require("mongoose");

const purchaseSchema =
  new mongoose.Schema(
    {
      user: {
        type: mongoose
          .Schema
          .Types
          .ObjectId,
        ref: "User",
        required: true,
      },
      content:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "Content",
          required: false,
        },
      // ADDED: Track which live stream a gift was sent to
      stream:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "Stream",
          default:
            null,
        },
      expiresAt:
        {
          type: Date,
          required:
            function () {
              return (
                this
                  .purchaseType ===
                "SUBSCRIPTION"
              );
            },
        },
      status:
        {
          type: String,
          enum: [
            "pending",
            "completed",
            "failed",
          ],
          default:
            "completed",
        },
      creator:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "User",
          required: true,
        },
      message:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "Message",
          default:
            null,
        },
      purchaseType:
        {
          type: String,
          // CRITICAL FIX: Added LIVE_GIFT so the database doesn't reject gift payments
          enum: [
            "SUBSCRIPTION",
            "PPV",
            "DM_UNLOCK",
            "CHAT_BUNDLE",
            "LIVE_GIFT",
          ],
          required: true,
        },
      txHash:
        {
          type: String,
          sparse: true,
          unique: true,
        },
      fiatReference:
        {
          type: String,
          sparse: true,
          unique: true,
        },
      amountPaid:
        {
          type: Number,
          required: true,
        },
      paymentMethod:
        {
          type: String,
          enum: [
            "CRYPTO",
            "FIAT",
            "MANUAL",
          ],
          default:
            "CRYPTO",
        },
    },
    {
      timestamps: true,
    },
  );

module.exports =
  mongoose.model(
    "Purchase",
    purchaseSchema,
  );
