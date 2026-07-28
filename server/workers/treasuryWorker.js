require("dotenv").config();
const mongoose = require("mongoose");
const {
  ethers,
} = require("ethers");
// New (since it lives in server/workers/)
const Withdrawal = require("../models/Withdrawal");

// Polygon USDT Contract Address
// const USDT_ADDRESS =
//   "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
// New (Standard Mock ERC20 Token on Amoy Testnet)
// Your custom Mock USDT on Amoy
const USDT_ADDRESS = "0x0f03F5e5755139537cF115c808ca4339f26515B3";
const ERC20_ABI =
  [
    "function transfer(address to, uint256 amount) returns (bool)",
  ];

async function processPayouts() {
  console.log(
    "Starting Treasury Worker...",
  );

  // SAFETY CHECK
  if (
    !process
      .env
      .TREASURY_PRIVATE_KEY ||
    process
      .env
      .TREASURY_PRIVATE_KEY
      .length <
      60
  ) {
    console.error(
      "CRITICAL ERROR: TREASURY_PRIVATE_KEY is missing or invalid in .env file.",
    );
    process.exit(
      1,
    );
  }
  if (
    !process
      .env
      .POLYGON_RPC_URL
  ) {
    console.error(
      "CRITICAL ERROR: POLYGON_RPC_URL is missing in .env file.",
    );
    process.exit(
      1,
    );
  }

  try {
    // 1. Connect to Database
    await mongoose.connect(
      process
        .env
        .MONGO_URI,
    );
    console.log(
      "Connected to Internal Ledger.",
    );

    // 2. Connect to Blockchain & Treasury Wallet
    const provider =
      new ethers.JsonRpcProvider(
        process
          .env
          .POLYGON_RPC_URL,
      );
    const wallet =
      new ethers.Wallet(
        process
          .env
          .TREASURY_PRIVATE_KEY,
        provider,
      );
    const usdtContract =
      new ethers.Contract(
        USDT_ADDRESS,
        ERC20_ABI,
        wallet,
      );

    // 3. Fetch PENDING Requests
    const pendingRequests =
      await Withdrawal.find(
        {
          status:
            "PENDING",
        },
      );

    if (
      pendingRequests.length ===
      0
    ) {
      console.log(
        "No pending withdrawals. Exiting.",
      );
      process.exit(
        0,
      );
    }

    console.log(
      `Found ${pendingRequests.length} pending payouts. Processing...`,
    );

    // 4. Process Synchronously (Crucial for Nonce Management)
    for (const request of pendingRequests) {
      console.log(
        `Processing ${request.amount} USDT to ${request.payoutAddress}`,
      );

      // LOCK THE DATABASE ROW FIRST
      request.status =
        "PROCESSING";
      await request.save();

      try {
        // Convert human amount to blockchain units (6 decimals for USDT)
        const parsedAmount =
          ethers.parseUnits(
            request.amount.toString(),
            6,
          );

        // --- NEW GAS LOGIC ---
        // 1. Fetch current network conditions
        const feeData =
          await provider.getFeeData();

        // 2. Pad the gas fees by 20% to guarantee immediate mining (Ethers v6 uses BigInt)
        const buffer =
          120n; // 120%
        const divisor =
          100n;

        const paddedMaxFee =
          (feeData.maxFeePerGas *
            buffer) /
          divisor;
        const paddedPriorityFee =
          (feeData.maxPriorityFeePerGas *
            buffer) /
          divisor;

        console.log(
          `Bribing miners: MaxFee ${ethers.formatUnits(paddedMaxFee, "gwei")} gwei`,
        );

        // 3. Execute with Overrides
        const tx =
          await usdtContract.transfer(
            request.payoutAddress,
            parsedAmount,
            {
              maxFeePerGas:
                paddedMaxFee,
              maxPriorityFeePerGas:
                paddedPriorityFee,
            },
          );

        console.log(
          `Tx sent: ${tx.hash}. Waiting for confirmation...`,
        );

        // Wait for 1 block confirmation to guarantee it didn't revert
        const receipt =
          await tx.wait(
            1,
          );

        if (
          receipt.status ===
          1
        ) {
          request.status =
            "COMPLETED";
          request.txHash =
            tx.hash;
          await request.save();
          console.log(
            `✅ Payout successful!`,
          );
        } else {
          throw new Error(
            "Transaction reverted on-chain.",
          );
        }
      } catch (error) {
        console.error(
          `❌ Failed to process request ${request._id}:`,
          error.message,
        );

        request.status =
          "FAILED";
        await request.save();
      }
    }

    console.log(
      "Batch complete. Disconnecting.",
    );
    process.exit(
      0,
    );
  } catch (error) {
    console.error(
      "Critical Worker Error:",
      error,
    );
    process.exit(
      1,
    );
  }
}

processPayouts();
