const mongoose = require("mongoose");

const SystemStateSchema =
  new mongoose.Schema(
    {
      key: {
        type: String,
        default:
          "MASTER_STATE",
        unique: true,
      },
      payoutsLocked:
        {
          type: Boolean,
          default: false,
        },
      lastReconciliationRun:
        {
          type: Date,
        },
      lastReconciliationStatus:
        {
          type: String,
          enum: [
            "PASS",
            "FAIL_BREACH",
            "PENDING",
          ],
          default:
            "PENDING",
        },
      breachDetails:
        {
          type: String,
          default:
            null,
        },
    },
    {
      timestamps: true,
    },
  );

module.exports =
  mongoose.model(
    "SystemState",
    SystemStateSchema,
  );
