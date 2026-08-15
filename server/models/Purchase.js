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
          enum: [
            "SUBSCRIPTION",
            "PPV",
            "DM_UNLOCK",
            "CHAT_BUNDLE",
          ],
          required: true,
        },
      txHash:
        {
          type: String,
          sparse: true, // Crucial for Web3, optional for Fiat
          unique: true,
        },
      fiatReference:
        {
          type: String,
          sparse: true, // Crucial for Fiat, optional for Web3
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
