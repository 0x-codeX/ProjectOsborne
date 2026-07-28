const Content = require("../models/Content");
const User = require("../models/User");
const Purchase = require("../models/Purchase");

exports.createContentPost =
  async (
    req,
    res,
  ) => {
    try {
      const {
        title,
        description,
        priceInUSDT,
        fileKey,
        fileType,
      } =
        req.body;

      // 1. Validate inputs
      if (
        !title ||
        priceInUSDT ===
          undefined ||
        !fileKey ||
        !fileType
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Missing required paywall fields.",
            },
          );
      }

      // 2. Mint the post in MongoDB attached to the logged-in creator
      const newContent =
        await Content.create(
          {
            creator:
              req
                .user
                ._id, // Comes from your protect middleware
            title,
            description,
            priceInUSDT,
            fileKey,
            fileType,
          },
        );

      res
        .status(
          201,
        )
        .json(
          {
            message:
              "Content successfully paywalled.",
            content:
              newContent,
          },
        );
    } catch (error) {
      console.error(
        "Content Creation Error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to create content post.",
          },
        );
    }
  };

// GET /api/content/feed
exports.getFeed = async (req, res) => {
    try {
        const viewerId = req.user._id;

        // 1. Fetch Feed (using .lean() for massive performance gains)
        const posts = await Content.find()
            .populate('creator', 'username monetizationSettings')
            .sort({ createdAt: -1 })
            .lean();

        // 2. Fetch User's Valid Purchases in ONE lightweight query
        const userPurchases = await Purchase.find({ user: viewerId })
            .select('content creator purchaseType')
            .lean();

        // 3. Map out access rights into Sets for O(1) instant lookup time
        const unlockedContentIds = new Set(
            userPurchases
                .filter(p => p.purchaseType === 'PPV' && p.content)
                .map(p => p.content.toString())
        );
        
        const subscribedCreatorIds = new Set(
            userPurchases
                .filter(p => p.purchaseType === 'SUBSCRIPTION')
                .map(p => p.creator.toString())
        );

        // 4. Evaluate access for every single post
        const secureFeed = posts.map(post => {
            // Determine Post Price
            const globalPPV = post.creator.monetizationSettings?.defaultPPVPrice || 0;
            const actualPrice = post.priceInUSDT !== null ? post.priceInUSDT : globalPPV;

            // Logic Checks
            const isCreator = post.creator._id.toString() === viewerId.toString();
            const isFree = actualPrice === 0 && post.creator.monetizationSettings?.monthlySubscription === 0;
            
            // Check our mapped Sets
            const hasPurchasedPPV = unlockedContentIds.has(post._id.toString());
            const hasActiveSub = subscribedCreatorIds.has(post.creator._id.toString());

            const hasAccess = isCreator || isFree || hasPurchasedPPV || hasActiveSub;

            // 5. THE BOUNCER: Enforce the Zero-Trust rule
            if (!hasAccess) {
                delete post.fileKey; 
                post.isLocked = true;
            } else {
                post.isLocked = false;
            }

            return {
                ...post,
                actualPrice 
            };
        });

        res.status(200).json(secureFeed);
    } catch (error) {
        console.error("Feed error:", error);
        res.status(500).json({ message: 'Failed to load feed' });
    }
};
