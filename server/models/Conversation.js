const mongoose = require("mongoose");

const conversationSchema =
  new mongoose.Schema(
    {
      participants:
        [
          {
            type: mongoose
              .Schema
              .Types
              .ObjectId,
            ref: "User",
            required: true,
          },
        ],
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
      bubblesLeft:
        {
          type: Number,
          default: 0,
        },
      lifetimeValue:
        {
          type: Number,
          default: 0,
        }, // This feeds the "LTV: $450" metric we built in the UI!

      // We cache the last message here so the Inbox UI loads blazingly fast
      lastMessage:
        {
          text: {
            type: String,
          },
          sender:
            {
              type: mongoose
                .Schema
                .Types
                .ObjectId,
              ref: "User",
            },
          createdAt:
            {
              type: Date,
            },
          isLockedPPV:
            {
              type: Boolean,
              default: false,
            }, // Shows a padlock in the inbox preview
        },
    },
    {
      timestamps: true,
    },
  );

// Indexes make querying massive inboxes lightning fast
conversationSchema.index(
  {
    participants: 1,
  },
);
conversationSchema.index(
  {
    creator: 1,
    fan: 1,
  },
);
conversationSchema.index(
  {
    updatedAt:
      -1,
  },
);

module.exports =
  mongoose.model(
    "Conversation",
    conversationSchema,
  );
