const mongoose = require("mongoose");

const messageSchema =
  new mongoose.Schema(
    {
      conversationId:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "Conversation",
          required: true,
          index: true,
        },
      sender:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "User",
          required: true,
        },
      receiver:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "User",
          required: true,
        },

      // The actual content
      text: {
        type: String,
        default:
          "",
      },
      fileKey:
        {
          type: String,
          default:
            null,
        }, // Cloudflare R2 path for photos/videos
      fileType:
        {
          type: String,
          default:
            null,
        }, // 'image/png', 'video/mp4', etc.
      fileUrl:
        {
          type: String,
        },
      unlockedFor:
        [
          {
            type: String,
            lowercase: true,
          },
        ],

      // Monetization Engine
      price:
        {
          type: Number,
          min: 0,
          default: 0,
        }, // If > 0, the message is locked
      // IRONCLAD FIX: Added isRead tracker
      isRead:
        {
          type: Boolean,
          default: false,
        },

      // For later: allows creators to blast a PPV message to ALL subscribers at once
      isMassMessage:
        {
          type: Boolean,
          default: false,
        },
    },
    {
      timestamps: true,
    },
  );

// Optimize for sorting messages chronologically inside a chat window
messageSchema.index(
  {
    conversationId: 1,
    createdAt: 1,
  },
);

module.exports =
  mongoose.model(
    "Message",
    messageSchema,
  );
