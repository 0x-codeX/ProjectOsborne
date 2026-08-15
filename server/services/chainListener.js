// server/services/chainListener.js
const {
  ethers,
} = require("ethers");
const User = require("../models/User");
const Content = require("../models/Content");

const provider =
  new ethers.JsonRpcProvider(
    process
      .env
      .POLYGON_RPC_URL,
  );
const contract =
  new ethers.Contract(
    GATEWAY_ADDRESS,
    ABI,
    provider,
  );

contract.on(
  "ContentPurchased",
  async (
    buyer,
    creator,
    contentId,
    token,
    price,
    creatorCut,
    treasuryCut,
  ) => {
    try {
      // Convert bytes32 contentId back to a readable string/object ID
      const contentIdStr =
        ethers.decodeBytes32String(
          contentId,
        );

      // Look up who owns this content
      const content =
        await Content.findById(
          contentIdStr,
        ).populate(
          "creator",
        );
      if (
        !content
      )
        return;

      // Check if the creator received funds directly or if it routed to Treasury
      if (
        creator ===
        ethers.ZeroAddress
      ) {
        // Creator had no crypto address connected!
        // Treasury received 100% on-chain.
        // Credit 80% (creatorCut) to creator's off-chain DB balance:
        const creatorCutInUSDT =
          parseFloat(
            ethers.formatUnits(
              creatorCut,
              6,
            ),
          ); // Assuming 6 decimals for USDT

        await User.findByIdAndUpdate(
          content
            .creator
            ._id,
          {
            $inc: {
              usdtBalance:
                creatorCutInUSDT,
              totalEarnedUSDT:
                creatorCutInUSDT,
            },
          },
        );

        console.log(
          `Fallback Credit: Added $${creatorCutInUSDT} to Creator ${content.creator.username}`,
        );
      }
    } catch (err) {
      console.error(
        "Chain Event Processing Error:",
        err,
      );
    }
  },
);
