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
      // Fiat held by the platform (e.g., via Paystack)
      fiatBalances: {
  // Cleared funds ready for withdrawal request
  withdrawable: {
    type: Map,
    of: Number,
    default: {}
  },
  // Pending funds awaiting Paystack bank settlement
  floating: {
    type: Map,
    of: Number,
    default: {}
  }
},
      fiatTotalEarned:
        {
          type: Map,
          of: Number,
          default:
            {},
        },
      // Crypto sent directly to their wallet via smart contract (Read-only analytics)
      lifetimeWeb3EarnedUSDT:
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
