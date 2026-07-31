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
      // In Purchase.js, update this line:
      content:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "Content",
          required: false,
        },
      // Expiration date for subscriptions; not needed for one-time purchases
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
          ], // Crucial for Web3/Crypto txHashes
          default:
            "completed",
        },
      // Made optional for subscriptions
      creator:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "User",
          required: true,
        },
      txHash:
        {
          type: String,
          required: true,
          unique: true,
        }, // UNIQUE prevents replay attacks
      amountPaid:
        {
          type: Number,
          required: true,
        },
      purchaseType:
        {
          type: String,
          enum: [
            "PPV",
            "SUBSCRIPTION",
          ],
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
          ],
          required: true,
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
