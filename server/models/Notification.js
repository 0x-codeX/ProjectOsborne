const mongoose = require("mongoose");

const notificationSchema =
  new mongoose.Schema(
    {
      recipient:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "User",
          required: true,
        },
      type: {
        type: String,
        enum: [
          "SYSTEM",
          "NEW_CONTENT",
          "SUBSCRIPTION_RENEWAL",
          "RECOMMENDATION",
        ],
        required: true,
      },
      title:
        {
          type: String,
          required: true,
        },
      message:
        {
          type: String,
          required: true,
        },
      // Optional: Link to the creator who triggered this (for avatars)
      sender:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "User",
        },
      // Optional: Link to the specific video if it's a NEW_CONTENT alert
      relatedContent:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "Content",
        },
      isRead:
        {
          type: Boolean,
          default: false,
        },
      createdAt:
        {
          type: Date,
          default:
            Date.now,
        },
    },
  );

module.exports =
  mongoose.model(
    "Notification",
    notificationSchema,
  );

