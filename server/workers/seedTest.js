require("dotenv").config();
const mongoose = require("mongoose");
const Withdrawal = require("../models/Withdrawal");

async function seed() {
  try {
    await mongoose.connect(
      process
        .env
        .MONGO_URI,
    );
    console.log(
      "Connected to DB...",
    );

    // Create a fake withdrawal request
    const mockWithdrawal =
      await Withdrawal.create(
        {
          creator:
            new mongoose.Types.ObjectId(), // Generates a random valid ID
          amount: 25, // Trying to withdraw 25 USDT
          payoutAddress:
            "0x000000000000000000000000000000000000dEaD",
          status:
            "PENDING",
        },
      );

    console.log(
      `✅ Seeded PENDING withdrawal: ${mockWithdrawal._id}`,
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

seed();
