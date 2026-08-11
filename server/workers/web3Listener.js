// workers/web3Listener.js
const {
  ethers,
} = require("ethers");
const mongoose = require("mongoose");
const Content = require("../models/Content");
const User = require("../models/User");
const Purchase = require("../models/Purchase");
const Wallet = require("../models/Wallet");
const Notification = require("../models/Notification");

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
 * FULL Idempotent Fulfillment Engine
 * Executed whenever a raw blockchain purchase is detected by WebSocket or Sweep.
 */
async function processPurchaseEvent(
  buyerWallet,
  creatorWallet,
  contentIdBytes32,
  rawPrice,
  txHash,
) {
  try {
    // 1. Guard against Subscriptions (Handle via separate pipeline if needed)
    if (
      contentIdBytes32 ===
      ethers.ZeroHash
    ) {
      console.log(
        `[!] Subscription detected from ${buyerWallet} | Tx: ${txHash}. Skipping PPV flow.`,
      );
      return;
    }

    // 2. IDEMPOTENCY CHECK: Has this transaction already been processed by the API or Listener?
    const existingPurchase =
      await Purchase.findOne(
        {
          txHash,
        },
      );
    if (
      existingPurchase
    ) {
      console.log(
        `[i] Transaction ${txHash} already fulfilled. Skipping listener processing.`,
      );
      return;
    }

    // 3. Resolve Content & Mongo IDs
    const extractedMongoId =
      contentIdBytes32.slice(
        -24,
      );
    if (
      !mongoose.Types.ObjectId.isValid(
        extractedMongoId,
      )
    ) {
      console.error(
        `[-] Invalid Mongo ObjectId derived from bytes32: ${extractedMongoId}`,
      );
      return;
    }

    const content =
      await Content.findById(
        extractedMongoId,
      ).populate(
        "creator",
      );
    if (
      !content
    ) {
      console.error(
        `[-] Content ${extractedMongoId} not found for tx ${txHash}`,
      );
      return;
    }

    const creator =
      content.creator;
    const amountPaid =
      Number(
        ethers.formatUnits(
          rawPrice,
          6,
        ),
      ); // USDT standard = 6 decimals

    // 4. Resolve Fan User Account via Wallet Address
    const fanUser =
      await User.findOne(
        {
          walletAddress:
            {
              $regex:
                new RegExp(
                  `^${buyerWallet}$`,
                  "i",
                ),
            },
        },
      );

    const buyerId =
      fanUser
        ? fanUser._id
        : null;

    // 5. UNLOCK CONTENT
    await Content.findByIdAndUpdate(
      content._id,
      {
        $addToSet:
          {
            unlockedFor:
              buyerWallet.toLowerCase(),
          },
        $push:
          {
            processedTxHashes:
              txHash,
          },
      },
    );

    // 6. CREATE PURCHASE RECORD
    const purchase =
      await Purchase.create(
        {
          user: buyerId,
          content:
            content._id,
          creator:
            creator._id ||
            creator,
          txHash,
          amountPaid,
          purchaseType:
            "PPV",
          status:
            "completed",
        },
      );

    // 7. CREDIT CREATOR WALLET (20% Platform Fee Split)
    const PLATFORM_FEE = 0.2;
    const creatorEarnings =
      Number(
        (
          amountPaid *
          (1 -
            PLATFORM_FEE)
        ).toFixed(
          4,
        ),
      );

    await Wallet.findOneAndUpdate(
      {
        creator:
          creator._id ||
          creator,
      },
      {
        $inc: {
          balanceUSDT:
            creatorEarnings,
          totalEarnedUSDT:
            creatorEarnings,
        },
      },
      {
        upsert: true,
        returnDocument:
          "after",
      },
    );

    // 8. DISPATCH DUAL NOTIFICATIONS (Fan + Creator)
    const creatorIdStr =
      creator._id
        ? creator._id.toString()
        : creator.toString();
    const fanName =
      fanUser?.username ||
      "A fan";

    const notifications =
      [
        {
          recipient:
            creator._id ||
            creator,
          sender:
            buyerId,
          type: "PAYMENT_SUCCESS",
          title:
            "PPV Unlocked!",
          message: `${fanName} unlocked your PPV post! You earned $${creatorEarnings} USDT.`,
          actionUrl:
            "/fan/dashboard",
          relatedContent:
            content._id,
        },
      ];

    if (
      buyerId
    ) {
      notifications.push(
        {
          recipient:
            buyerId,
          sender:
            creator._id ||
            creator,
          type: "PPV_UNLOCK",
          title:
            "PPV Unlocked!",
          message: `You successfully unlocked exclusive content from ${creator.username || "a creator"}.`,
          actionUrl: `/creator/${creatorIdStr}`,
          relatedContent:
            content._id,
        },
      );
    }

    await Notification.insertMany(
      notifications,
    );

    console.log(
      `[+] SUCCESS: Full fulfillment completed via Listener for Content ${extractedMongoId} | Tx: ${txHash}`,
    );
  } catch (error) {
    console.error(
      `[-] ERROR in listener fulfillment for tx ${txHash}:`,
      error,
    );
  }
}

/**
 * Web3 Event Listener Initialization
 */
async function startListener() {
  console.log(
    "Initializing Web3 Event Listener...",
  );

  if (
    !RPC_HTTP_URL ||
    !RPC_WSS_URL ||
    !GATEWAY_ADDRESS
  ) {
    console.error(
      "CRITICAL: Missing Web3 URLs or Gateway Address in env vars!",
    );
    return;
  }

  // PHASE 1: Gentle Catch-Up Sweep
  try {
    const httpProvider =
      new ethers.JsonRpcProvider(
        RPC_HTTP_URL,
      );
    const httpContract =
      new ethers.Contract(
        GATEWAY_ADDRESS,
        GATEWAY_ABI,
        httpProvider,
      );

    const currentBlock =
      await httpProvider.getBlockNumber();
    const lookbackBlocks = 500; // Reduced from 2000 to prevent RPC rate-limiting
    const fromBlock =
      Math.max(
        0,
        currentBlock -
          lookbackBlocks,
      );
    const maxBlockRange = 9;

    console.log(
      `Sweeping blocks ${fromBlock} to ${currentBlock}...`,
    );

    for (
      let start =
        fromBlock;
      start <=
      currentBlock;
      start +=
        maxBlockRange +
        1
    ) {
      const end =
        Math.min(
          start +
            maxBlockRange,
          currentBlock,
        );
      try {
        const pastEvents =
          await httpContract.queryFilter(
            "ContentPurchased",
            start,
            end,
          );
        for (const event of pastEvents) {
          await processPurchaseEvent(
            event
              .args[0], // buyer
            event
              .args[1], // creator
            event
              .args[2], // contentId
            event
              .args[4], // price
            event.transactionHash,
          );
        }
      } catch (chunkError) {
        console.warn(
          `[WARN] Chunk ${start}-${end} sweep skipped due to RPC limit.`,
        );
      }
      await new Promise(
        (
          resolve,
        ) =>
          setTimeout(
            resolve,
            300,
          ),
      ); // Throttling delay
    }
  } catch (error) {
    console.error(
      "[-] Catch-up sweep skipped. Reason:",
      error.message,
    );
  }

  // PHASE 2: Live WebSocket Listener
  try {
    const wssProvider =
      new ethers.WebSocketProvider(
        RPC_WSS_URL,
      );
    const wssContract =
      new ethers.Contract(
        GATEWAY_ADDRESS,
        GATEWAY_ABI,
        wssProvider,
      );

    console.log(
      `Live listener active on ${GATEWAY_ADDRESS}...`,
    );

    wssContract.on(
      "ContentPurchased",
      async (
        buyer,
        creator,
        contentIdBytes32,
        token,
        price,
        creatorCut,
        treasuryCut,
        event,
      ) => {
        console.log(
          `\n--- Live Purchase Detected ---`,
        );
        await processPurchaseEvent(
          buyer,
          creator,
          contentIdBytes32,
          price,
          event
            .log
            .transactionHash,
        );
      },
    );

    wssProvider.on(
      "error",
      (
        error,
      ) => {
        console.error(
          "WebSocket Connection Error:",
          error,
        );
      },
    );
  } catch (error) {
    console.error(
      "[-] CRITICAL: WebSocket listener failure:",
      error.message,
    );
  }
}

startListener();
