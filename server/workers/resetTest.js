require("dotenv").config();
const mongoose = require("mongoose");
const Withdrawal = require("../models/Withdrawal");

async function reset() {
  try {
    await mongoose.connect(
      process
        .env
        .MONGO_URI,
    );
    console.log(
      "Connected to DB...",
    );

    const result =
      await Withdrawal.updateMany(
        {
          status:
            "FAILED",
        },
        {
          status:
            "PENDING",
        },
      );

    console.log(
      `✅ Reset ${result.modifiedCount} withdrawals to PENDING.`,
    );
    process.exit(
      0,
    );
  } catch (error) {
    console.error(
      error,
    );
    process.exit(
      1,
    );
  }
}

reset();
