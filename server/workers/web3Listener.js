// workers/web3Listener.js
const {
  ethers,
} = require("ethers");
const mongoose = require("mongoose");
const Content = require("../models/Content");

// Load both HTTP (for catch-up) and WSS (for live listening) URLs
const RPC_HTTP_URL =
  process
    .env
    .POLYGON_RPC_URL;
const RPC_WSS_URL =
  process
    .env
    .POLYGON_AMOY_WSS_URL;
const GATEWAY_ADDRESS =
  process
    .env
    .NIPPY_GATEWAY_ADDRESS;

const GATEWAY_ABI =
  [
    "event ContentPurchased(address indexed buyer, address indexed creator, bytes32 indexed contentId, address token, uint256 price, uint256 creatorCut, uint256 treasuryCut)",
  ];

/**
 * Core business logic for unlocking content.
 * Abstracted so both the Catch-Up script and the Live Listener can use it.
 */
async function processPurchaseEvent(
  buyer,
  contentIdBytes32,
  price,
  txHash,
) {
  try {
    // 1. Guard against Subscriptions
    // If the ID is completely empty, it means this was a channel subscription, not a PPV.
    if (
      contentIdBytes32 ===
      ethers.ZeroHash
    ) {
      console.log(
        `[!] Subscription detected from ${buyer} | Tx: ${txHash}. Skipping PPV unlock.`,
      );
      // TODO: Route to your subscription unlocking logic here.
      return;
    }

    // 2. Extract the actual Mongo ID from the RIGHT side of the padded string
    const extractedMongoId =
      contentIdBytes32.slice(
        -24,
      );

    const filter =
      {
        _id: new mongoose.Types.ObjectId(
          extractedMongoId,
        ),
        processedTxHashes:
          {
            $ne: txHash,
          }, // Idempotency check
      };

    const update =
      {
        $push:
          {
            unlockedFor:
              buyer,
            processedTxHashes:
              txHash,
          },
      };

    const updatedDoc =
      await Content.findOneAndUpdate(
        filter,
        update,
        {
          returnDocument:
            "after",
        },
      );

    if (
      updatedDoc
    ) {
      console.log(
        `[+] SUCCESS: Unlocked content ${extractedMongoId} for ${buyer} | Tx: ${txHash}`,
      );
    } else {
      console.log(
        `[!] WARNING: Valid transaction, but content ${extractedMongoId} not found or already unlocked.`,
      );
    }
  } catch (error) {
    console.error(
      `[-] ERROR processing tx ${txHash}:`,
      error.message,
    );
  }
}

/**
 * Sweeps historical blocks and opens live WebSocket connection.
 * Built with fault isolation: if the HTTP sweep fails, the WSS listener still boots.
 */
async function startListener() {
  console.log("Initializing Web3 Event Listener...");

  if (!RPC_HTTP_URL || !RPC_WSS_URL || !GATEWAY_ADDRESS) {
    console.error("CRITICAL: Missing Web3 URLs or Gateway Address in env vars!");
    return;
  }

  // ---------------------------------------------------------
  // PHASE 1: The Catch-Up Sweep (HTTP) - ISOLATED
  // ---------------------------------------------------------
  try {
    const httpProvider = new ethers.JsonRpcProvider(RPC_HTTP_URL);
    const httpContract = new ethers.Contract(GATEWAY_ADDRESS, GATEWAY_ABI, httpProvider);

    const currentBlock = await httpProvider.getBlockNumber();
    // Reduced to 50 blocks (~2 minutes of downtime) to prevent free-tier abuse
    const lookbackBlocks = 2000; 
    const fromBlock = currentBlock - lookbackBlocks;
    const maxBlockRange = 9; // Forced by your specific RPC's strict free tier

    console.log(`Sweeping historical blocks ${fromBlock} to ${currentBlock} in chunks of ${maxBlockRange}...`);

    for (let start = fromBlock; start <= currentBlock; start += maxBlockRange + 1) {
      const end = Math.min(start + maxBlockRange, currentBlock);
      
      try {
        const pastEvents = await httpContract.queryFilter("ContentPurchased", start, end);
        if (pastEvents.length > 0) {
          for (const event of pastEvents) {
            await processPurchaseEvent(event.args[0], event.args[2], event.args[4], event.transactionHash);
          }
        }
      } catch (chunkError) {
    console.error(
        `Chunk ${start}-${end} failed`
    );

    console.error(chunkError);
}
      
      // 200ms artificial delay to prevent rate-limiting bans
      await new Promise(resolve => setTimeout(resolve, 200)); 
    }
  } catch (error) {
    // If HTTP fails, we log it and SURVIVE. We do not crash the app.
    console.error("[-] Catch-up sweep failed (RPC limits). Proceeding to live listener. Error:", error.message);
  }

  // ---------------------------------------------------------
  // PHASE 2: The Live Listener (WebSocket) - GUARANTEED TO RUN
  // ---------------------------------------------------------
  try {
    const wssProvider = new ethers.WebSocketProvider(RPC_WSS_URL);
    const wssContract = new ethers.Contract(GATEWAY_ADDRESS, GATEWAY_ABI, wssProvider);

    console.log(`Live listener active on ${GATEWAY_ADDRESS}...`);

    wssContract.on(
      "ContentPurchased",
      async (buyer, creator, contentIdBytes32, token, price, creatorCut, treasuryCut, event) => {
        console.log(`\n--- Live Purchase Detected ---`);
        await processPurchaseEvent(buyer, contentIdBytes32, price, event.log.transactionHash);
      }
    );

    wssProvider.on("error", (error) => {
      console.error("WebSocket Error (Connection dropped):", error);
    });
  } catch (error) {
    console.error("[-] CRITICAL: Failed to start live WebSocket listener:", error.message);
  }
}

startListener();
