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
          "NEW_CONTENT",
          "SYSTEM",
          "PAYMENT_SUCCESS",
          "SUBSCRIPTION_RENEWAL",
          "RECOMMENDATION",
          "GO_LIVE",
          "WELCOME_MESSAGE",
          "PPV_UNLOCK",
          "NIPPY_OFFER",
          "GIFT_SENT", // <-- ADDED
          "LIVE_GIFT", // <-- ADDED
          "FOLLOW", // <-- ADDED to prevent follow crashes!
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
      // The exact route the frontend should navigate to when clicked
      actionUrl:
        {
          type: String,
          default:
            null,
        },
      sender:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "User",
        },
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
