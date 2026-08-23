// server/models/ClearingRequest.js
const mongoose = require("mongoose");

const ClearingRequestSchema =
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
      wallet:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "Wallet",
          required: true,
        },
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
      direction:
        {
          type: String,
          enum: [
            "USDT_TO_NGN",
            "NGN_TO_USDT",
          ],
          required: true,
        },
      payoutMethod:
        {
          type: String,
          enum: [
            "bank",
            "crypto",
          ],
          required: true,
        },
      payoutAddress:
        {
          type: String,
        }, // Stores wallet address or bank info snapshot
      status:
        {
          type: String,
          enum: [
            "PENDING_APPROVAL",
            "APPROVED",
            "REJECTED",
          ],
          default:
            "PENDING_APPROVAL",
        },
      initiatedBy:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "User",
          required: true,
        },
      approvedBy:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "User",
        },
      adminNotes:
        {
          type: String,
        },
      depositConfirmedByAdmin:
        {
          type: Boolean,
          required: true,
          default: false,
        },
    },
    {
      timestamps: true,
    },
  );

module.exports =
  mongoose.model(
    "ClearingRequest",
    ClearingRequestSchema,
  );
