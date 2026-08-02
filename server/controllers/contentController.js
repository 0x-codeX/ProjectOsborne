const Content = require("../models/Content");
const User = require("../models/User");
const Purchase = require("../models/Purchase");
const {
  deleteFromCloudflare,
} = require("../utils/cloudflare");

// POST /api/content
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
        isNsfw,
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
                ._id || req.user.id, // Comes from protect middleware
            title,
            description,
            priceInUSDT,
            fileKey,
            fileType,
            isNsfw:
              isNsfw ||
              false,
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
    const viewerId =
      req
        .user
        ._id;
    const viewerWallet =
      req
        .user
        .walletAddress
        ? req.user.walletAddress.toLowerCase()
        : null;

    // 1. Fetch Feed (using .lean() for massive performance gains)
    // NEW: We added populate for comments.user so the frontend can display the commenter's username
    const posts =
      await Content.find()
        .populate(
          "creator",
          "username monetizationSettings profileImage",
        )
        .populate(
          "comments.user",
          "username",
        ) // <-- CRUCIAL FOR COMMENTS OVERLAY
        .sort(
          {
            createdAt:
              -1,
          },
        )
        .lean();

    // 2. Fetch User's Valid Purchases & Bookmarks
    const userPurchases =
      await Purchase.find(
        {
          user: viewerId,
        },
      )
        .select(
          "content creator purchaseType createdAt",
        )
        .lean();

    // NEW: Fetch the viewer's profile to get their bookmarks array
    const viewer =
      await User.findById(
        viewerId,
      )
        .select(
          "bookmarks",
        )
        .lean();

    // 3. Map out access rights & interactions for O(1) lightning-fast lookups
    const unlockedContentMap =
      new Map();
    const subscribedCreatorMap =
      new Map();
    // NEW: Create a Set of bookmarked IDs so we don't have to run slow array searches in the loop
    const bookmarkedSet =
      new Set(
        viewer?.bookmarks?.map(
          (
            id,
          ) =>
            id.toString(),
        ) ||
          [],
      );

    userPurchases.forEach(
      (
        p,
      ) => {
        if (
          p.purchaseType ===
            "PPV" &&
          p.content
        ) {
          unlockedContentMap.set(
            p.content.toString(),
            new Date(
              p.createdAt,
            ).getTime(),
          );
        }
        if (
          p.purchaseType ===
            "SUBSCRIPTION" &&
          p.creator
        ) {
          subscribedCreatorMap.set(
            p.creator.toString(),
            new Date(
              p.createdAt,
            ).getTime(),
          );
        }
      },
    );

    const secureFeed =
      [];

    // 4. Evaluate access and interactions for every single post
    for (const post of posts) {
      const globalPPV =
        post
          .creator
          ?.monetizationSettings
          ?.defaultPPVPrice ||
        0;
      const actualPrice =
        post.priceInUSDT !==
        null
          ? post.priceInUSDT
          : globalPPV;

      const isCreator =
        post.creator?._id.toString() ===
        viewerId.toString();
      const isFree =
        actualPrice ===
          0 &&
        post
          .creator
          ?.monetizationSettings
          ?.monthlySubscription ===
          0;

      // Web2 (Fiat) Access Check
      const ppvDate =
        unlockedContentMap.get(
          post._id.toString(),
        );
      const subDate =
        subscribedCreatorMap.get(
          post.creator?._id.toString(),
        );
      const hasPurchasedFiatPPV =
        !!ppvDate;
      const hasActiveSub =
        !!subDate;

      // Web3 (Crypto) Access Check
      // Check if the post's unlockedFor array includes the viewer's wallet address
      let hasPurchasedCrypto = false;
      if (
        viewerWallet &&
        post.unlockedFor &&
        post
          .unlockedFor
          .length >
          0
      ) {
        hasPurchasedCrypto =
          post.unlockedFor.some(
            (
              address,
            ) =>
              address.toLowerCase() ===
              viewerWallet,
          );
      }

      // Master Access Boolean
      const hasAccess =
        isCreator ||
        isFree ||
        hasPurchasedFiatPPV ||
        hasPurchasedCrypto ||
        hasActiveSub;

      // --- THE SUNSET GATEKEEPER ---
      // (Keep your existing sunset logic here, just add hasPurchasedCrypto to the grandfathered checks)
      if (
        post.status ===
        "sunset"
      ) {
        let isGrandfathered =
          isCreator;
        const sunsetTime =
          new Date(
            post.sunsetAt,
          ).getTime();

        if (
          hasPurchasedFiatPPV &&
          ppvDate <
            sunsetTime
        )
          isGrandfathered = true;
        if (
          hasActiveSub &&
          subDate <
            sunsetTime
        )
          isGrandfathered = true;
        // Assuming if they bought it via crypto, they are grandfathered in
        if (
          hasPurchasedCrypto
        )
          isGrandfathered = true;

        if (
          !isGrandfathered
        )
          continue;
      }

      // 5. THE BOUNCER: Enforce the Zero-Trust rule for active content
      if (
        !hasAccess
      ) {
        // STOP THE LEAKS: Delete EVERYTHING sensitive.
        delete post.fileKey;
        delete post.mediaUrl;
        delete post.hiddenText;

        post.isLocked = true;
      } else {
        post.isLocked = false;
      }

      // --- NEW: SOCIAL INTERACTION INJECTION ---
      // Safely check likes array (handles older posts that might not have the array initialized)
      const likesArray =
        post.likes ||
        [];
      const isLiked =
        likesArray.some(
          (
            id,
          ) =>
            id.toString() ===
            viewerId.toString(),
        );
      const isBookmarked =
        bookmarkedSet.has(
          post._id.toString(),
        );
      const likesCount =
        likesArray.length;
      const commentsCount =
        post.comments
          ? post
              .comments
              .length
          : 0;

      secureFeed.push(
        {
          ...post,
          actualPrice,
          isLiked,
          isBookmarked,
          likesCount,
          commentsCount,
        },
      );
    }

    res
      .status(
        200,
      )
      .json(
        secureFeed,
      );
  } catch (error) {
    console.error("Feed error:", error);
    res.status(500).json({ message: "Failed to load feed" });
  }
};

// GET /api/content/vault - Fetch only logged-in creator's uploads
// GET /api/content/vault
exports.getCreatorVault = async (req, res) => {
  try {
    console.log("--- VAULT FETCH INITIATED ---");
    console.log("1. Who is asking? Creator ID:", req.user._id);
    
    const creatorId = req.user._id;
    const vaultItems =
      await Content.find(
        {
          creator:
            creatorId,
          status:
            {
              $ne: "sunset",
            },
        },
      )
        .sort(
          {
            createdAt:
              -1,
          },
        )
        .lean();
    
    console.log(`2. Database returned ${vaultItems.length} items for this creator.`);
    
    res.status(200).json(vaultItems);
  } catch (error) {
    console.error("Vault fetch error:", error);
    res.status(500).json({ message: "Failed to load Creator Vault posts." });
  }
};

// PUT /api/content/:id - Edit title, description, price, or status
exports.updateContentPost =
  async (
    req,
    res,
  ) => {
    try {
      const {
        id,
      } =
        req.params;
      const {
        title,
        description,
        priceInUSDT,
        isNsfw,
        isActive,
      } =
        req.body;

      const post =
        await Content.findById(
          id,
        );

      if (
        !post
      ) {
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "Content post not found.",
            },
          );
      }

      // Ownership Enforcement
      if (
        post.creator.toString() !==
        req.user._id.toString()
      ) {
        return res
          .status(
            403,
          )
          .json(
            {
              message:
                "Unauthorized to edit this post.",
            },
          );
      }

      if (
        title !==
        undefined
      )
        post.title =
          title;
      if (
        description !==
        undefined
      )
        post.description =
          description;
      if (
        priceInUSDT !==
        undefined
      )
        post.priceInUSDT =
          priceInUSDT;
      if (
        isNsfw !==
        undefined
      )
        post.isNsfw =
          isNsfw;
      if (
        isActive !==
        undefined
      )
        post.isActive =
          isActive;

      const updatedPost =
        await post.save();

      res
        .status(
          200,
        )
        .json(
          {
            message:
              "Post updated successfully.",
            content:
              updatedPost,
          },
        );
    } catch (error) {
      console.error(
        "Update error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to update content post.",
          },
        );
    }
  };

// DELETE /api/content/:id - Smart delete (Hard Delete vs Sunset)
exports.deleteContentPost = async (req, res) => {
  try {
    const { id } = req.params;
    const creatorId = req.user._id;

    const post = await Content.findById(id);

    if (!post) {
      return res.status(404).json({ message: "Content post not found." });
    }

    if (post.creator.toString() !== creatorId.toString()) {
      return res.status(403).json({ message: "Unauthorized to delete this post." });
    }

    // --- THE SMART ROUTER ---
    // Check if ANY user has bought this specific video, OR if ANY user is actively subscribed to this creator
    const hasActiveBuyers =
      await Purchase.exists(
        {
          $or: [
            {
              content:
                id,
              purchaseType:
                "PPV",
              status:
                "completed",
            },
            {
              creator:
                creatorId,
              purchaseType:
                "SUBSCRIPTION",
              status:
                "completed",
            },
          ],
        },
      );

    if (!hasActiveBuyers) {
      // PATH A: Zero buyers. Vaporize it instantly to save server costs.
      if (post.fileKey) {
        await deleteFromCloudflare(post.fileKey);
      }
      await Content.findByIdAndDelete(id);

      return res.status(200).json({
        message: "Post permanently deleted (No active subscribers found).",
        deletedId: id,
      });
    }

    // PATH B: Active buyers exist. Route to the 30-day Escrow (Sunset).
    post.status = "sunset";
    post.sunsetAt = Date.now();
    await post.save();

    res.status(200).json({
      message: "Post removed from public feed. Grandfathered subscribers retain access for 30 days.",
      deletedId: id,
    });

  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Failed to delete content post." });
  }
};

// POST /api/content/:id/like
exports.toggleLike =
  async (
    req,
    res,
  ) => {
    try {
      const contentId =
        req
          .params
          .id;
      const userId =
        req
          .user
          ._id ||
        req
          .user
          .id;

      const content =
        await Content.findById(
          contentId,
        );
      if (
        !content
      )
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "Content not found",
            },
          );

      const isLiked =
        content.likes.includes(
          userId,
        );

      if (
        isLiked
      ) {
        // Remove like
        await Content.findByIdAndUpdate(
          contentId,
          {
            $pull:
              {
                likes:
                  userId,
              },
          },
        );
        res
          .status(
            200,
          )
          .json(
            {
              message:
                "Unliked",
              isLiked: false,
            },
          );
      } else {
        // Add like
        await Content.findByIdAndUpdate(
          contentId,
          {
            $addToSet:
              {
                likes:
                  userId,
              },
          },
        );
        res
          .status(
            200,
          )
          .json(
            {
              message:
                "Liked",
              isLiked: true,
            },
          );
      }
    } catch (error) {
      console.error(
        "Like error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error toggling like",
          },
        );
    }
  };

// POST /api/content/:id/bookmark
exports.toggleBookmark =
  async (
    req,
    res,
  ) => {
    try {
      const contentId =
        req
          .params
          .id;
      const userId =
        req
          .user
          ._id ||
        req
          .user
          .id;

      const user =
        await User.findById(
          userId,
        );
      const isBookmarked =
        user.bookmarks.includes(
          contentId,
        );

      if (
        isBookmarked
      ) {
        await User.findByIdAndUpdate(
          userId,
          {
            $pull:
              {
                bookmarks:
                  contentId,
              },
          },
        );
        res
          .status(
            200,
          )
          .json(
            {
              message:
                "Bookmark removed",
              isBookmarked: false,
            },
          );
      } else {
        await User.findByIdAndUpdate(
          userId,
          {
            $addToSet:
              {
                bookmarks:
                  contentId,
              },
          },
        );
        res
          .status(
            200,
          )
          .json(
            {
              message:
                "Bookmarked",
              isBookmarked: true,
            },
          );
      }
    } catch (error) {
      console.error(
        "Bookmark error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error toggling bookmark",
          },
        );
    }
  };

// POST /api/content/:id/comment
exports.addComment =
  async (
    req,
    res,
  ) => {
    try {
      const contentId =
        req
          .params
          .id;
      const userId =
        req
          .user
          ._id ||
        req
          .user
          .id;
      const {
        text,
      } =
        req.body;

      if (
        !text ||
        text.trim() ===
          ""
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Comment text is required",
            },
          );
      }

      const content =
        await Content.findByIdAndUpdate(
          contentId,
          {
            $push:
              {
                comments:
                  {
                    user: userId,
                    text: text.trim(),
                  },
              },
          },
          {
            new: true,
          },
        ).populate(
          "comments.user",
          "username profileImage",
        ); // Fetch the username to send back

      if (
        !content
      )
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "Content not found",
            },
          );

      // Return the newly created comment (the last one in the array)
      const newComment =
        content
          .comments[
          content
            .comments
            .length -
            1
        ];
      res
        .status(
          201,
        )
        .json(
          {
            message:
              "Comment added",
            comment:
              newComment,
          },
        );
    } catch (error) {
      console.error(
        "Comment error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error adding comment",
          },
        );
    }
  };

  // GET /api/content/bookmarked
exports.getBookmarks = async (req, res) => {
  try {
    const viewerId = req.user._id;

    // 1. Fetch the user's bookmarked IDs
    const viewer = await User.findById(viewerId).select("bookmarks").lean();
    
    if (!viewer || !viewer.bookmarks || viewer.bookmarks.length === 0) {
      return res.status(200).json([]); // Return empty array if no bookmarks
    }

    // 2. Fetch the actual content using the $in operator
    const bookmarkedPosts = await Content.find({ _id: { $in: viewer.bookmarks } })
      .populate("creator", "username monetizationSettings profileImage")
      .populate("comments.user", "username")
      .sort({ createdAt: -1 })
      .lean();

    // 3. Fetch User's Valid Purchases to evaluate access
    const userPurchases = await Purchase.find({ user: viewerId })
      .select("content creator purchaseType createdAt")
      .lean();

    const unlockedContentMap = new Map();
    const subscribedCreatorMap = new Map();

    userPurchases.forEach((p) => {
      if (p.purchaseType === "PPV" && p.content) {
        unlockedContentMap.set(p.content.toString(), new Date(p.createdAt).getTime());
      }
      if (p.purchaseType === "SUBSCRIPTION" && p.creator) {
        subscribedCreatorMap.set(p.creator.toString(), new Date(p.createdAt).getTime());
      }
    });

    const secureBookmarks = [];

    // 4. THE BOUNCER: Evaluate access for the bookmarked posts
    for (const post of bookmarkedPosts) {
      const globalPPV = post.creator?.monetizationSettings?.defaultPPVPrice || 0;
      const actualPrice = post.priceInUSDT !== null ? post.priceInUSDT : globalPPV;

      const isCreator = post.creator?._id.toString() === viewerId.toString();
      const isFree = actualPrice === 0 && post.creator?.monetizationSettings?.monthlySubscription === 0;

      const ppvDate = unlockedContentMap.get(post._id.toString());
      const subDate = subscribedCreatorMap.get(post.creator?._id.toString());

      const hasPurchasedPPV = !!ppvDate;
      const hasActiveSub = !!subDate;

      const hasAccess = isCreator || isFree || hasPurchasedPPV || hasActiveSub;

      // Sunset Escrow Gatekeeper
      if (post.status === "sunset") {
        let isGrandfathered = false;
        if (isCreator) {
          isGrandfathered = true;
        } else {
          const sunsetTime = new Date(post.sunsetAt).getTime();
          if (hasPurchasedPPV && ppvDate < sunsetTime) isGrandfathered = true;
          else if (hasActiveSub && subDate < sunsetTime) isGrandfathered = true;
        }
        if (!isGrandfathered) continue; 
      }

      // Lock it down if they don't have access
      if (!hasAccess) {
        delete post.fileKey; 
        post.isLocked = true;
      } else {
        post.isLocked = false;
      }

      const likesArray = post.likes || [];
      
      secureBookmarks.push({
        ...post,
        actualPrice,
        isLiked: likesArray.some(id => id.toString() === viewerId.toString()),
        isBookmarked: true, // It is explicitly true because it's in their bookmarks
        likesCount: likesArray.length,
        commentsCount: post.comments ? post.comments.length : 0
      });
    }

    res.status(200).json(secureBookmarks);
  } catch (error) {
    console.error("Bookmarks error:", error);
    res.status(500).json({ message: "Failed to load bookmarks" });
  }
};

// GET /api/content/creator/:id
exports.getCreatorPublicProfile = async (req, res) => {
  try {
    const creatorId = req.params.id;
    const viewerId = req.user._id;

    // 1. Fetch the Creator's public info
    const creator = await User.findById(creatorId)
      .select("username profileImage monetizationSettings")
      .lean();

    if (!creator) {
      return res.status(404).json({ message: "Creator not found" });
    }

    // 2. Fetch all active/sunset content by this creator
    const creatorContent = await Content.find({ 
      creator: creatorId,
      status: { $in: ["active", "sunset"] } 
    })
      .populate("comments.user", "username")
      .sort({ createdAt: -1 })
      .lean();

    // 3. Fetch Viewer's purchases related ONLY to this creator
    const viewerPurchases = await Purchase.find({ 
      user: viewerId,
      creator: creatorId 
    }).lean();

    let hasActiveSub = false;
    const unlockedPPV = new Set();

    viewerPurchases.forEach((p) => {
      if (p.purchaseType === "SUBSCRIPTION") hasActiveSub = true;
      if (p.purchaseType === "PPV" && p.content) unlockedPPV.add(p.content.toString());
    });

    const secureContent = [];

    // 4. THE BOUNCER: Evaluate access
    for (const post of creatorContent) {
      const globalPPV = creator.monetizationSettings?.defaultPPVPrice || 0;
      const actualPrice = post.priceInUSDT !== null ? post.priceInUSDT : globalPPV;

      const isFree = actualPrice === 0 && creator.monetizationSettings?.monthlySubscription === 0;
      const hasPurchasedPPV = unlockedPPV.has(post._id.toString());

      let hasAccess = isFree || hasPurchasedPPV || hasActiveSub;

      // Sunset Escrow Gatekeeper (Fans can only view sunsetted content if they already bought it)
      if (post.status === "sunset") {
        if (!hasPurchasedPPV && !hasActiveSub) continue; 
      }

      // Lock it down if no access
      if (!hasAccess) {
        delete post.fileKey; 
        post.isLocked = true;
      } else {
        post.isLocked = false;
      }

      const likesArray = post.likes || [];
      secureContent.push({
        ...post,
        actualPrice,
        isLiked: likesArray.some(id => id.toString() === viewerId.toString()),
        likesCount: likesArray.length,
        commentsCount: post.comments ? post.comments.length : 0
      });
    }

    res.status(200).json({ 
      creator, 
      isSubscribed: hasActiveSub,
      content: secureContent 
    });
  } catch (error) {
    console.error("Public profile error:", error);
    res.status(500).json({ message: "Failed to load creator profile" });
  }
};