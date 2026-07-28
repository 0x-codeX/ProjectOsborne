// server/models/Wallet.js
const mongoose = require("mongoose");

const walletSchema =
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
          unique: true,
        },
      balanceUSDT:
        {
          type: Number,
          default: 0,
        },
      totalEarnedUSDT:
        {
          type: Number,
          default: 0,
        },
    },
    {
      timestamps: true,
    },
  );

module.exports =
  mongoose.model(
    "Wallet",
    walletSchema,
  );
