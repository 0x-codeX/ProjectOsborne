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

// SIMPLE IN-MEMORY / MONGO BLOCK TRACKER
const SyncStateSchema =
  new mongoose.Schema(
    {
      key: {
        type: String,
        default:
          "web3_listener_last_block",
        unique: true,
      },
      lastBlock:
        {
          type: Number,
          required: true,
        },
    },
  );

const SyncState =
  mongoose
    .models
    .SyncState ||
  mongoose.model(
    "SyncState",
    SyncStateSchema,
  );

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
 */
async function processPurchaseEvent(
  buyerWallet,
  creatorWallet,
  contentIdBytes32,
  rawPrice,
  rawCreatorCut, // The exact 80% cut from the smart contract
  txHash,
) {
  try {
    // 1. Guard against Subscriptions
    if (
      contentIdBytes32 ===
      ethers.ZeroHash
    )
      return;

    // 2. IDEMPOTENCY CHECK
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
        `[i] Transaction ${txHash} already fulfilled.`,
      );
      return;
    }

    // 3. BULLETPROOF ID EXTRACTION
    let extractedMongoId =
      contentIdBytes32.slice(
        -24,
      );
    if (
      !mongoose.Types.ObjectId.isValid(
        extractedMongoId,
      )
    ) {
      extractedMongoId =
        contentIdBytes32.slice(
          2,
          26,
        );
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        extractedMongoId,
      )
    ) {
      console.error(
        `[-] Invalid Mongo ObjectId derived from bytes32: ${contentIdBytes32}`,
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
        `[-] Content ${extractedMongoId} not found.`,
      );
      return;
    }

    const creator =
      content.creator;
    const amountPaidUSDT =
      Number(
        ethers.formatUnits(
          rawPrice,
          6,
        ),
      );
    const creatorEarningsUSDT =
      Number(
        ethers.formatUnits(
          rawCreatorCut,
          6,
        ),
      );

    // 4. RESOLVE FAN USER ACCOUNT
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

    // 5. UNLOCK CONTENT IN DATABASE
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
    if (
      buyerId
    ) {
      await Purchase.create(
        {
          user: buyerId,
          content:
            content._id,
          creator:
            creator._id ||
            creator,
          txHash,
          amountPaid:
            amountPaidUSDT,
          purchaseType:
            "PPV",
          status:
            "completed",
        },
      );
    } else {
      console.warn(
        `[!] Unregistered wallet ${buyerWallet} purchased content. Unlocked, but no dashboard record created.`,
      );
    }

    // 7. CALCULATE EARNINGS & CREDIT CREATOR WALLET
    if (
      creatorWallet ===
      ethers.ZeroAddress
    ) {
      // FALLBACK ROUTE: Zero-Math Escrow
      // We save the pure USDT to their Web2 Fiat Map for Friday liquidation.
      await Wallet.findOneAndUpdate(
        {
          creator:
            creator._id ||
            creator,
        },
        {
          $inc: {
            "fiatBalances.USDT":
              creatorEarningsUSDT,
            "fiatTotalEarned.USDT":
              creatorEarningsUSDT,
          },
        },
        {
          upsert: true,
        },
      );
      console.log(
        `[+] Escrow: Saved ${creatorEarningsUSDT} USDT for off-chain fiat settlement.`,
      );
    } else {
      // DIRECT ROUTE: On-Chain Settlement.
      await Wallet.findOneAndUpdate(
        {
          creator:
            creator._id ||
            creator,
        },
        {
          $inc: {
            lifetimeWeb3EarnedUSDT:
              creatorEarningsUSDT,
          },
        },
        {
          upsert: true,
        },
      );
      console.log(
        `[i] On-Chain Settlement: Creator ${creatorWallet} already received $${creatorEarningsUSDT} USDT directly.`,
      );
    }

    // 8. DISPATCH DUAL NOTIFICATIONS
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
            buyerId ||
            null,
          type: "PAYMENT_SUCCESS",
          title:
            "PPV Unlocked!",
          message: `${fanName} unlocked your PPV post! You earned a share of the sale.`,
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
      `[+] SUCCESS: Listener fulfilled Content ${extractedMongoId} | Tx: ${txHash}`,
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

  // PHASE 1: Persistent Catch-Up Sweep
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

    let syncRecord =
      await SyncState.findOne(
        {
          key: "web3_listener_last_block",
        },
      );
    let fromBlock =
      syncRecord
        ? syncRecord.lastBlock +
          1
        : Math.max(
            0,
            currentBlock -
              2000,
          );

    if (
      fromBlock <
      currentBlock
    ) {
      console.log(
        `Sweeping blocks ${fromBlock} to ${currentBlock}...`,
      );
      const maxBlockRange = 9;

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
                .args[4], // rawPrice
              event
                .args[5], // rawCreatorCut
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
        );
      }

      await SyncState.findOneAndUpdate(
        {
          key: "web3_listener_last_block",
        },
        {
          lastBlock:
            currentBlock,
        },
        {
          upsert: true,
        },
      );
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
        const txHash =
          event
            .log
            .transactionHash;

        await processPurchaseEvent(
          buyer,
          creator,
          contentIdBytes32,
          price,
          creatorCut,
          txHash,
        );

        if (
          event
            .log
            .blockNumber
        ) {
          await SyncState.findOneAndUpdate(
            {
              key: "web3_listener_last_block",
            },
            {
              lastBlock:
                event
                  .log
                  .blockNumber,
            },
            {
              upsert: true,
            },
          );
        }
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
