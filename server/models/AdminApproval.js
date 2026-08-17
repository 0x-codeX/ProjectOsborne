// models/AdminApproval.js
const mongoose = require("mongoose");

const adminApprovalSchema =
  new mongoose.Schema(
    {
      targetUser:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "User",
          required: true,
        },
      item: {
        type: mongoose
          .Schema
          .Types
          .ObjectId,
        ref: "Content",
        required: true,
      },
      requestedBy:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "User", // The Moderate Admin
          required: true,
        },
      accessType:
        {
          type: String,
          enum: [
            "PPV",
            "SUB",
          ],
          default:
            "PPV",
        },
      justification:
        {
          type: String,
          required: true,
        },
      status:
        {
          type: String,
          enum: [
            "PENDING",
            "APPROVED",
            "REJECTED",
          ],
          default:
            "PENDING",
        },
      processedBy:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "User", // The Super Admin who clicked approve/reject
        },
      processedAt:
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
    "AdminApproval",
    adminApprovalSchema,
  );
