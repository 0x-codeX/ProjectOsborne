// models/Content.js
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
          index: true, // Ensures fast querying when loading a creator's profile feed
        },
      title:
        {
          type: String,
          required: true,
          trim: true,
          maxLength: 100,
        },
      // Inside your models/Content.js schema
      status:
        {
          type: String,
          enum: [
            "active",
            "sunset",
          ],
          default:
            "active",
        },
      sunsetAt:
        {
          type: Date,
          default:
            null,
        },
      description:
        {
          type: String,
          maxLength: 500,
        },
      price:
        {
          type: Number,
          required: true,
          min: [
            0,
            "Price cannot be negative",
          ], // 0 means free/teaser
        },
      // -- WEB3 OWNERSHIP TRACKING --
      unlockedFor:
        [
          {
            type: String,
            lowercase: true, // Forces all wallet addresses to lowercase automatically
          },
        ],
      processedTxHashes:
        [
          {
            type: String,
          },
        ],

      // -- THE MEDIA VAULT --
      fileKey:
        {
          type: String,
          required: true,
          unique: true,
        },
      teaserKey:
        {
          type: String,
          // The compressed, public 15s 240p loop
        },
      fileType:
        {
          type: String,
          required: true, // e.g., 'video/mp4', 'image/jpeg'
        },

      // -- THE MISSING FEED LOGIC --
      previewKey:
        {
          type: String,
          // The public, heavily compressed/blurred thumbnail for the feed.
          // Fans see this BEFORE they pay. No presigned URL required.
        },
      isNsfw:
        {
          type: Boolean,
          default: false,
          // Mandatory for your 18 U.S.C. § 2257 UI compliance gating
        },
      isActive:
        {
          type: Boolean,
          default: true,
        },
      likes:
        [
          {
            type: mongoose
              .Schema
              .Types
              .ObjectId,
            ref: "User",
          },
        ],
      comments:
        [
          {
            user: {
              type: mongoose
                .Schema
                .Types
                .ObjectId,
              ref: "User",
            },
            text: {
              type: String,
              required: true,
            },
            createdAt:
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
    "Content",
    contentSchema,
  );
