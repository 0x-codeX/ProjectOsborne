const mongoose = require("mongoose");

const ticketSchema =
  new mongoose.Schema(
    {
      userId:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "User",
          required: true,
        },
      subject:
        {
          type: String,
          required: true,
        },
      message:
        {
          type: String,
          required: true,
        },
      status:
        {
          type: String,
          enum: [
            "OPEN",
            "IN_PROGRESS",
            "RESOLVED",
          ],
          default:
            "OPEN",
        },
      // Tracks which Admin handled the complaint
      resolvedBy:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "User",
        },
      resolvedAt:
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
    "Ticket",
    ticketSchema,
  );
