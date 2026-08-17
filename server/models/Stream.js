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
      livepeerStreamId:
        {
          type: String,
          required: true,
          unique: true,
        },
      streamKey:
        {
          type: String,
          required: true,
          select: false, // Never expose stream key by default
        },
      playbackId:
        {
          type: String,
          required: true,
        },
      status:
        {
          type: String,
          enum: [
            "OFFLINE",
            "ACTIVE",
            "ENDED",
          ],
          default:
            "OFFLINE",
          index: true,
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
