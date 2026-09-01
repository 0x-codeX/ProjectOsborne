// server/models/Stream.js
const mongoose = require("mongoose");

const StreamSchema =
  new mongoose.Schema(
    {
      creatorId:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "User",
          required: true,
          index: true,
        },
      title:
        {
          type: String,
          required: true,
          trim: true,
        },
      priceNGN:
        {
          type: Number,
          default: 0, // 0 = Free for followers/subscribers
        },
      isPaywalled:
        {
          type: Boolean,
          default: false,
        },
      status:
        {
          type: String,
          enum: [
            "OFFLINE",
            "LIVE",
            "ENDED",
          ],
          default:
            "OFFLINE",
          index: true,
        },
      isLive:
        {
          type: Boolean,
          default: false,
        },
      startedAt:
        {
          type: Date,
        },
      endedAt:
        {
          type: Date,
        },
    },
    {
      timestamps: true,
    },
  );

module.exports =
  mongoose.model(
    "Stream",
    StreamSchema,
  );
