// models/SystemLog.js
const mongoose = require("mongoose");

const systemLogSchema =
  new mongoose.Schema(
    {
      admin:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "User",
          required: true,
        }, // The staff member who performed the action
      action:
        {
          type: String,
          required: true,
        }, // e.g., 'APPROVED_MANUAL_UNLOCK', 'SUSPENDED_USER', 'PROCESSED_PAYOUT'
      targetUser:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "User",
        }, // The user affected by the action (optional)
      details:
        {
          type: String,
        }, // Context, e.g., "Unlocked Content ID: 12345"
    },
    {
      timestamps: true,
    },
  );

module.exports =
  mongoose.model(
    "SystemLog",
    systemLogSchema,
  );
