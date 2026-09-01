// server/models/Dispute.js
const mongoose = require("mongoose");

const DisputeSchema =
  new mongoose.Schema(
    {
      paystackDisputeId:
        {
          type: String,
          required: true,
          unique: true,
        },
      paystackReference:
        {
          type: String,
          required: true,
          index: true,
        },
      purchase:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "Purchase",
          required: true,
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
      fan: {
        type: mongoose
          .Schema
          .Types
          .ObjectId,
        ref: "User",
        required: true,
      },
      amountDisputedNGN:
        {
          type: Number,
          required: true,
        },
      creatorDebitedNGN:
        {
          type: Number,
          required: true,
        }, // The 80% cut clawed back
      status:
        {
          type: String,
          enum: [
            "AWAITING_MERCHANT_FEEDBACK",
            "RESOLVED",
            "DEFEATED",
            "LOST",
          ],
          default:
            "AWAITING_MERCHANT_FEEDBACK",
        },
      reason:
        {
          type: String,
        },
      history:
        [
          {
            action:
              String,
            timestamp:
              {
                type: Date,
                default:
                  Date.now,
              },
          },
        ],
    },
    {
      timestamps: true,
    },
  );

module.exports =
  mongoose.model(
    "Dispute",
    DisputeSchema,
  );
