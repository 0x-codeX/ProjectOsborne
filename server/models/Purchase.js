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
        }, // Made optional for subscriptions
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
