const mongoose = require("mongoose");

const contentSchema =
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
      title:
        {
          type: String,
          required: true,
          trim: true,
          maxLength: 100,
        },
      description:
        {
          type: String,
          maxLength: 500,
        },
      priceInUSDT:
        {
          type: Number,
          required: true,
          min: [
            0,
            "Price cannot be negative",
          ], // 0 means free/teaser
        },
      fileKey:
        {
          type: String,
          required: true,
          unique: true, // No two posts can share the exact same R2 file key
        },
      fileType:
        {
          type: String,
          required: true, // 'video/mp4', 'image/jpeg', etc.
        },
      isActive:
        {
          type: Boolean,
          default: true,
        },
    },
    {
      timestamps: true,
    },
  );

module.exports =
  mongoose.model(
    "Content",
    contentSchema,
  );
