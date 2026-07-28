// server/models/Withdrawal.js
const mongoose = require("mongoose");

const withdrawalSchema =
  new mongoose.Schema(
    {
      creator:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "User",
          required: true,
        },
      amount:
        {
          type: Number,
          required: true,
        },
      payoutAddress:
        {
          type: String,
          required: true,
        },
      status:
        {
          type: String,
          enum: [
            "PENDING",
            "PROCESSING",
            "COMPLETED",
            "FAILED",
          ],
          default:
            "PENDING",
        },
      txHash:
        {
          type: String,
        }, // Populated once the off-chain script actually pays them
    },
    {
      timestamps: true,
    },
  );

module.exports =
  mongoose.model(
    "Withdrawal",
    withdrawalSchema,
  );
