const Content = require("../models/Content");
const User = require("../models/User");
const Purchase = require("../models/Purchase");
const Notification = require("../models/Notification");
const {
  deleteFromCloudflare,
} = require("../utils/cloudflare");
const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const {
  getSignedUrl,
} = require("@aws-sdk/s3-request-presigner");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const Conversation = require("../models/Conversation");
const Stream = require("../models/Stream");
const sharp = require("sharp");
const {
  convertAndRoundPrice,
} = require("../utils/currencyConversion");

const s3 =
  new S3Client(
    {
      region:
        "auto",
      endpoint: `https://${process.env.S3_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials:
        {
          accessKeyId:
            process
              .env
              .S3_ACCESS_KEY,
          secretAccessKey:
            process
              .env
              .S3_SECRET_KEY,
        },
    },
  );

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
        price,
        isNsfw,
      } =
        req.body;
      const file =
        req.file;

      if (
        !title ||
        price ===
          undefined ||
        !file
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Missing required paywall fields or media file.",
            },
          );
      }

      const originalPath =
        file.path;
      const uniqueId =
        Date.now().toString();
      const cleanFileName =
        file.originalname.replace(
          /[^a-zA-Z0-9.]/g,
          "_",
        );
      const originalFileKey = `raw_${uniqueId}_${cleanFileName}`;

      const isImage =
        file.mimetype.startsWith(
          "image/",
        );
      const teaserExt =
        isImage
          ? ".jpg"
          : ".mp4";
      const teaserFileKey = `teaser_${uniqueId}${teaserExt}`;
      const teaserPath =
        path.join(
          __dirname,
          `../uploads/${teaserFileKey}`,
        );
      const isContentNsfw =
        isNsfw ===
          "true" ||
        isNsfw ===
          true;

      if (
        isImage
      ) {
        await sharp(
          originalPath,
        )
          .resize(
            {
              width: 400,
            },
          )
          .blur(
            isContentNsfw
              ? 40
              : 15,
          )
          .jpeg(
            {
              quality: 40,
            },
          )
          .toFile(
            teaserPath,
          );
      } else {
        await new Promise(
          (
            resolve,
            reject,
          ) => {
            ffmpeg(
              originalPath,
            )
              .setDuration(
                15,
              )
              .noAudio()
              .fps(
                15,
              )
              .size(
                "?x240",
              )
              .videoCodec(
                "libx264",
              )
              .addOptions(
                [
                  "-crf 35",
                  "-preset ultrafast",
                ],
              )
              .output(
                teaserPath,
              )
              .on(
                "end",
                resolve,
              )
              .on(
                "error",
                reject,
              )
              .run();
          },
        );
      }

      const rawFileStream =
        fs.createReadStream(
          originalPath,
        );
      await s3.send(
        new PutObjectCommand(
          {
            Bucket:
              process
                .env
                .S3_BUCKET_NAME,
            Key: originalFileKey,
            Body: rawFileStream,
            ContentType:
              file.mimetype,
          },
        ),
      );

      const teaserFileStream =
        fs.createReadStream(
          teaserPath,
        );
      const teaserContentType =
        isImage
          ? "image/jpeg"
          : "video/mp4";
      await s3.send(
        new PutObjectCommand(
          {
            Bucket:
              process
                .env
                .S3_BUCKET_NAME,
            Key: teaserFileKey,
            Body: teaserFileStream,
            ContentType:
              teaserContentType,
          },
        ),
      );

      const creatorId =
        req
          .user
          ._id ||
        req
          .user
          .id;
      const rawPrice =
        parseFloat(
          price ||
            0,
        );
      const savedPrice =
        !isNaN(
          rawPrice,
        ) &&
        rawPrice >
          0
          ? rawPrice
          : 0;

      const newContent =
        await Content.create(
          {
            creator:
              creatorId,
            title,
            description,
            price:
              savedPrice, // Raw base price stored safely
            fileKey:
              originalFileKey,
            teaserKey:
              teaserFileKey,
            fileType:
              file.mimetype,
            isNsfw:
              isContentNsfw,
          },
        );

      if (
        fs.existsSync(
          originalPath,
        )
      )
        fs.unlinkSync(
          originalPath,
        );
      if (
        fs.existsSync(
          teaserPath,
        )
      )
        fs.unlinkSync(
          teaserPath,
        );

      try {
        const followers =
          await User.find(
            {
              following:
                creatorId,
            },
          ).select(
            "_id",
          );
        if (
          followers.length >
          0
        ) {
          const isFreePost =
            savedPrice ===
            0;
          const contentTypeStr =
            isImage
              ? "photo"
              : "video";
          const notifications =
            followers.map(
              (
                fan,
              ) => ({
                recipient:
                  fan._id,
                type: "NEW_CONTENT",
                title:
                  isFreePost
                    ? `New Free ${contentTypeStr}!`
                    : "New Exclusive Content",
                message: `${req.user.username || "A creator you follow"} just dropped a new ${contentTypeStr}: "${title}". Go check it out!`,
                actionUrl: `/creator/${creatorId}`,
                sender:
                  creatorId,
                relatedContent:
                  newContent._id,
              }),
            );
          await Notification.insertMany(
            notifications,
          );
        }
      } catch (notifError) {
        console.error(
          "Failed to send notifications:",
          notifError,
        );
      }

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
      if (
        req.file &&
        fs.existsSync(
          req
            .file
            .path,
        )
      )
        fs.unlinkSync(
          req
            .file
            .path,
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
    const viewerWallet = req.user.walletAddress ? req.user.walletAddress.toLowerCase() : null;

    const posts =
      await Content.find()
        .populate(
          "creator",
          "username monetizationSettings profileImage walletAddress isLive currentStreamId",
        )
        .populate(
          "comments.user",
          "username",
        )
        .sort(
          {
            createdAt:
              -1,
          },
        )
        .lean();

    const activeStreams =
      await Stream.find(
        {
          status:
            "LIVE",
        },
      )
        .populate(
          "creatorId",
          "username profileImage walletAddress monetizationSettings",
        )
        .lean();

    const userPurchases = await Purchase.find({ user: viewerId })
      .select("content creator purchaseType createdAt expiresAt status")
      .lean();

    const viewer = await User.findById(viewerId).select("bookmarks following").lean();

    const unlockedContentMap = new Map();
    const subPurchasesByCreator = new Map();
    const subscribedCreatorMap = new Map();
    const bookmarkedSet = new Set(viewer?.bookmarks?.map((id) => id.toString()) || []);
    const followingSet = new Set(viewer?.following?.map((id) => id.toString()) || []);
    const now = new Date().getTime();

    // 1. Group all purchases
    userPurchases.forEach((p) => {
      const isCompleted = !p.status || p.status === "completed";
      if (p.purchaseType === "PPV" && p.content && isCompleted) {
        unlockedContentMap.set(p.content.toString(), new Date(p.createdAt).getTime());
      }
      if (p.purchaseType === "SUBSCRIPTION" && p.creator && isCompleted) {
        const cId = p.creator.toString();
        if (!subPurchasesByCreator.has(cId)) subPurchasesByCreator.set(cId, []);
        subPurchasesByCreator.get(cId).push(p);
      }
    });

    // 2. Calculate Unbroken Streak per Creator
    subPurchasesByCreator.forEach((subs, creatorId) => {
      subs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (subs.length > 0) {
        const latestSub = subs[0];
        const latestExp = latestSub.expiresAt ? new Date(latestSub.expiresAt).getTime() : Infinity;
        
        if (latestExp > now) {
          let streakStart = new Date(latestSub.createdAt).getTime();
          for (let i = 1; i < subs.length; i++) {
            const prevSub = subs[i];
            const prevExp = prevSub.expiresAt ? new Date(prevSub.expiresAt).getTime() : 0;
            const prevStart = new Date(prevSub.createdAt).getTime();
            
            const gap = streakStart - prevExp;
            if (gap <= 172800000) { // 48-hour grace period for auto-renews
              streakStart = prevStart;
            } else {
              break;
            }
          }
          subscribedCreatorMap.set(creatorId, streakStart);
        }
      }
    });

    const secureFeed = [];

    for (const post of posts) {
      const settings = post.creator?.monetizationSettings || {};
      const globalPPV = settings.defaultPPVPrice || 0;
      const creatorCurrency = settings.priceCurrency || settings.baseCurrency || "USD";

      let rawBasePrice = 0;
      if (post.price !== undefined && post.price !== null) {
        rawBasePrice = post.price;
      } else if (post.priceInUSDT !== undefined && post.priceInUSDT !== null) {
        rawBasePrice = post.priceInUSDT;
      } else {
        rawBasePrice = globalPPV;
      }

      const isFree = rawBasePrice <= 0;
      const isCreator = post.creator?._id.toString() === viewerId.toString();

      const ppvDate = unlockedContentMap.get(post._id.toString());
      const streakStartDate = subscribedCreatorMap.get(post.creator?._id.toString());
      const hasPurchasedFiatPPV = !!ppvDate;
      const hasActiveSub = !!streakStartDate;

      let hasPurchasedCrypto = false;
      if (viewerWallet && post.unlockedFor && post.unlockedFor.length > 0) {
        hasPurchasedCrypto = post.unlockedFor.some(
          (address) => address.toLowerCase() === viewerWallet
        );
      }

      const hasAccess = isCreator || isFree || hasPurchasedFiatPPV || hasPurchasedCrypto || hasActiveSub;

      // --- THE LIFETIME SUNSET ENGINE (WITH SUBSCRIBER GRACE PERIOD) ---
      if (post.status === "sunset") {
        let isGrandfathered = false;
        if (isCreator) {
          isGrandfathered = true;
        } else {
          // 1. Lifetime access strictly granted to direct PPV buyers
          if (hasPurchasedFiatPPV) isGrandfathered = true;
          if (hasPurchasedCrypto) isGrandfathered = true;

          // 2. Active Subscriber Grace Period
          const sunsetTime = post.sunsetAt ? new Date(post.sunsetAt).getTime() : 0;
          if (hasActiveSub && streakStartDate && streakStartDate < sunsetTime) {
            isGrandfathered = true;
          }
        }

        if (!isGrandfathered) continue;
      }

      post.teaserUrl = post.teaserKey
        ? `https://${process.env.R2_PUBLIC_DOMAIN}/${post.teaserKey}`
        : "https://placehold.co/600x400/111111/555555?text=Locked";

      if (!hasAccess) {
        delete post.fileKey;
        post.mediaUrl = null;
        delete post.hiddenText;
        post.isLocked = true;
      } else {
        try {
          const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: post.fileKey,
          });
          post.mediaUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
          post.isLocked = false;
          delete post.fileKey;
        } catch (err) {
          post.mediaUrl = null;
          post.isLocked = true;
        }
      }

      const likesArray =
        post.likes ||
        [];
      secureFeed.push(
        {
          ...post,
          type: "POST",
          hasActiveSub,
          creator:
            {
              ...post.creator,
              isFollowed:
                followingSet.has(
                  post.creator?._id.toString(),
                ),
            },
          actualPrice:
            rawBasePrice,
          priceCurrency:
            creatorCurrency,
          isPaywalled:
            !isFree,
          isLiked:
            likesArray.some(
              (
                id,
              ) =>
                id.toString() ===
                viewerId.toString(),
            ),
          isBookmarked:
            bookmarkedSet.has(
              post._id.toString(),
            ),
          likesCount:
            likesArray.length,
          commentsCount:
            post.comments
              ? post
                  .comments
                  .length
              : 0,
        },
      );
    }

    res.status(200).json(secureFeed);
  } catch (error) {
    console.error("Feed Error:", error);
    res.status(500).json({ message: "Failed to load feed" });
  }
};

// GET /api/content/vault
exports.getCreatorVault =
  async (
    req,
    res,
  ) => {
    try {
      const vaultItems =
        await Content.find(
          {
            creator:
              req
                .user
                ._id,
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
      res
        .status(
          200,
        )
        .json(
          vaultItems,
        );
    } catch (error) {
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to load Creator Vault posts.",
          },
        );
    }
  };

// PUT /api/content/:id
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
        price,
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
      )
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
      if (
        post.creator.toString() !==
        req.user._id.toString()
      )
        return res
          .status(
            403,
          )
          .json(
            {
              message:
                "Unauthorized.",
            },
          );

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
        price !==
        undefined
      ) {
        const parsed =
          parseFloat(
            price,
          );
        post.price =
          !isNaN(
            parsed,
          ) &&
          parsed >
            0
            ? parsed
            : 0;
      }

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

// DELETE /api/content/:id
exports.deleteContentPost =
  async (
    req,
    res,
  ) => {
    try {
      const {
        id,
      } =
        req.params;
      const creatorId =
        req
          .user
          ._id;

      const post =
        await Content.findById(
          id,
        );
      if (
        !post
      )
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
      if (
        post.creator.toString() !==
        creatorId.toString()
      )
        return res
          .status(
            403,
          )
          .json(
            {
              message:
                "Unauthorized.",
            },
          );

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

      if (
        !hasActiveBuyers
      ) {
        if (
          post.fileKey
        )
          await deleteFromCloudflare(
            post.fileKey,
          );
        await Content.findByIdAndDelete(
          id,
        );
        return res
          .status(
            200,
          )
          .json(
            {
              message:
                "Post permanently deleted.",
              deletedId:
                id,
            },
          );
      }

      post.status =
        "sunset";
      post.sunsetAt =
        Date.now();
      await post.save();

      res
        .status(
          200,
        )
        .json(
          {
            message:
              "Post removed from public feed. Grandfathered.",
            deletedId:
              id,
          },
        );
    } catch (error) {
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to delete content post.",
          },
        );
    }
  };

// POST /api/content/:id/view
exports.recordView =
  async (
    req,
    res,
  ) => {
    try {
      await Content.findByIdAndUpdate(
        req
          .params
          .id,
        {
          $inc: {
            viewsCount: 1,
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
              "View recorded",
          },
        );
    } catch (error) {
      res
        .status(
          200,
        )
        .json(
          {
            message:
              "View ignored due to error",
          },
        );
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

      if (
        user.bookmarks.includes(
          contentId,
        )
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
      const {
        text,
      } =
        req.body;
      if (
        !text ||
        text.trim() ===
          ""
      )
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

      const content =
        await Content.findByIdAndUpdate(
          req
            .params
            .id,
          {
            $push:
              {
                comments:
                  {
                    user:
                      req
                        .user
                        ._id ||
                      req
                        .user
                        .id,
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

      res
        .status(
          201,
        )
        .json(
          {
            message:
              "Comment added",
            comment:
              content
                .comments[
                content
                  .comments
                  .length -
                  1
              ],
          },
        );
    } catch (error) {
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
    const viewerWallet = req.user.walletAddress ? req.user.walletAddress.toLowerCase() : null;
    
    const viewer = await User.findById(viewerId).select("bookmarks following").lean();

    if (!viewer || !viewer.bookmarks || viewer.bookmarks.length === 0) {
      return res.status(200).json([]);
    }

    const bookmarkedPosts =
      await Content.find(
        {
          _id: {
            $in: viewer.bookmarks,
          },
        },
      )
        .populate(
          "creator",
          "username monetizationSettings profileImage walletAddress isLive currentStreamId",
        )
        .populate(
          "comments.user",
          "username",
        )
        .sort(
          {
            createdAt:
              -1,
          },
        )
        .lean();

    const userPurchases = await Purchase.find({ user: viewerId })
      .select("content creator purchaseType createdAt expiresAt status")
      .lean();
      
    const unlockedContentMap = new Map();
    const subPurchasesByCreator = new Map();
    const subscribedCreatorMap = new Map();
    const followingSet = new Set(viewer.following?.map((id) => id.toString()) || []);
    const now = new Date().getTime();

    // 1. Group all purchases
    userPurchases.forEach((p) => {
      const isCompleted = !p.status || p.status === "completed";
      if (p.purchaseType === "PPV" && p.content && isCompleted) {
        unlockedContentMap.set(p.content.toString(), new Date(p.createdAt).getTime());
      }
      if (p.purchaseType === "SUBSCRIPTION" && p.creator && isCompleted) {
        const cId = p.creator.toString();
        if (!subPurchasesByCreator.has(cId)) subPurchasesByCreator.set(cId, []);
        subPurchasesByCreator.get(cId).push(p);
      }
    });

    // 2. Calculate Unbroken Streak per Creator
    subPurchasesByCreator.forEach((subs, creatorId) => {
      subs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (subs.length > 0) {
        const latestSub = subs[0];
        const latestExp = latestSub.expiresAt ? new Date(latestSub.expiresAt).getTime() : Infinity;
        
        if (latestExp > now) {
          let streakStart = new Date(latestSub.createdAt).getTime();
          for (let i = 1; i < subs.length; i++) {
            const prevSub = subs[i];
            const prevExp = prevSub.expiresAt ? new Date(prevSub.expiresAt).getTime() : 0;
            const prevStart = new Date(prevSub.createdAt).getTime();
            
            const gap = streakStart - prevExp;
            if (gap <= 172800000) { // 48-hour grace period for auto-renews
              streakStart = prevStart;
            } else {
              break;
            }
          }
          subscribedCreatorMap.set(creatorId, streakStart);
        }
      }
    });

    const secureBookmarks = [];

    for (const post of bookmarkedPosts) {
      const settings = post.creator?.monetizationSettings || {};
      const globalPPV = settings.defaultPPVPrice || 0;
      const creatorCurrency = settings.priceCurrency || settings.baseCurrency || "USD";

      let rawBasePrice = 0;
      if (post.price !== undefined && post.price !== null) {
        rawBasePrice = post.price;
      } else if (post.priceInUSDT !== undefined && post.priceInUSDT !== null) {
        rawBasePrice = post.priceInUSDT;
      } else {
        rawBasePrice = globalPPV;
      }

      const isFree = rawBasePrice <= 0;
      const isCreator = post.creator?._id.toString() === viewerId.toString();

      const ppvDate = unlockedContentMap.get(post._id.toString());
      const streakStartDate = subscribedCreatorMap.get(post.creator?._id.toString());
      const hasPurchasedFiatPPV = !!ppvDate;
      const hasActiveSub = !!streakStartDate;

      let hasPurchasedCrypto = false;
      if (viewerWallet && post.unlockedFor && post.unlockedFor.length > 0) {
        hasPurchasedCrypto = post.unlockedFor.some(
          (address) => address.toLowerCase() === viewerWallet
        );
      }

      const hasAccess = isCreator || isFree || hasPurchasedFiatPPV || hasPurchasedCrypto || hasActiveSub;

      // --- THE LIFETIME SUNSET ENGINE (WITH SUBSCRIBER GRACE PERIOD) ---
      if (post.status === "sunset") {
        let isGrandfathered = false;
        if (isCreator) {
          isGrandfathered = true;
        } else {
          // 1. Lifetime access strictly granted to direct PPV buyers
          if (hasPurchasedFiatPPV) isGrandfathered = true;
          if (hasPurchasedCrypto) isGrandfathered = true;

          // 2. Active Subscriber Grace Period
          const sunsetTime = post.sunsetAt ? new Date(post.sunsetAt).getTime() : 0;
          if (hasActiveSub && streakStartDate && streakStartDate < sunsetTime) {
            isGrandfathered = true;
          }
        }

        if (!isGrandfathered) continue;
      }

      post.teaserUrl = post.teaserKey
        ? `https://${process.env.R2_PUBLIC_DOMAIN}/${post.teaserKey}`
        : "https://placehold.co/600x400/111111/555555?text=Locked";

      if (!hasAccess) {
        delete post.fileKey;
        post.mediaUrl = null;
        post.isLocked = true;
      } else {
        try {
          const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: post.fileKey,
          });
          post.mediaUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
          post.isLocked = false;
          delete post.fileKey;
        } catch (err) {
          post.mediaUrl = null;
          post.isLocked = true;
        }
      }

      const likesArray =
        post.likes ||
        [];
      secureBookmarks.push(
        {
          ...post,
          hasActiveSub,
          creator:
            {
              ...post.creator,
              isFollowed:
                followingSet.has(
                  post.creator?._id.toString(),
                ),
            },
          actualPrice:
            rawBasePrice,
          priceCurrency:
            creatorCurrency,
          isPaywalled:
            !isFree,
          isLiked:
            likesArray.some(
              (
                id,
              ) =>
                id.toString() ===
                viewerId.toString(),
            ),
          isBookmarked: true,
          likesCount:
            likesArray.length,
          commentsCount:
            post.comments
              ? post
                  .comments
                  .length
              : 0,
        },
      );
    }
    
    res.status(200).json(secureBookmarks);
  } catch (error) {
    console.error("Bookmarks Feed Error:", error);
    res.status(500).json({ message: "Failed to load bookmarks" });
  }
};

// GET /api/content/creator/:id 
exports.getCreatorPublicProfile = async (req, res) => {
  try {
    const creatorId =
      req
        .params
        .id;
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

    const creator =
      await User.findById(
        creatorId,
      )
        .select(
          "username profileImage bannerImage monetizationSettings walletAddress isLive currentStreamId",
        )
        .lean();

    if (
      !creator
    )
      return res
        .status(
          404,
        )
        .json(
          {
            message:
              "Creator not found",
          },
        );

    const creatorContent =
      await Content.find(
        {
          creator:
            creatorId,
          status:
            {
              $in: [
                "active",
                "sunset",
              ],
            },
        },
      )
        .populate(
          "comments.user",
          "username",
        )
        .sort(
          {
            createdAt:
              -1,
          },
        )
        .lean();

    const viewer =
      await User.findById(
        viewerId,
      )
        .select(
          "following",
        )
        .lean();
    const viewerPurchases =
      await Purchase.find(
        {
          user: viewerId,
          creator:
            creatorId,
        },
      ).lean();

    const isFollowed =
      viewer?.following
        ?.map(
          (
            id,
          ) =>
            id.toString(),
        )
        .includes(
          creatorId.toString(),
        ) ||
      false;

    let hasActiveSub = false;
    let streakStartDate = 0; // The correct variable is now declared
    const unlockedPPV =
      new Set();
    const now =
      new Date().getTime();

    // 1. Separate and sort subscriptions newest to oldest
    const subPurchases =
      viewerPurchases
        .filter(
          (
            p,
          ) =>
            p.purchaseType ===
              "SUBSCRIPTION" &&
            p.status ===
              "completed",
        )
        .sort(
          (
            a,
            b,
          ) =>
            new Date(
              b.createdAt,
            ).getTime() -
            new Date(
              a.createdAt,
            ).getTime(),
        );

    // 2. Calculate the Unbroken Streak
    if (
      subPurchases.length >
      0
    ) {
      const latestSub =
        subPurchases[0];
      const latestExp =
        latestSub.expiresAt
          ? new Date(
              latestSub.expiresAt,
            ).getTime()
          : Infinity;

      if (
        latestExp >
        now
      ) {
        hasActiveSub = true;
        streakStartDate =
          new Date(
            latestSub.createdAt,
          ).getTime();

        // Walk backwards to find the true origin of this continuous streak
        for (
          let i = 1;
          i <
          subPurchases.length;
          i++
        ) {
          const prevSub =
            subPurchases[
              i
            ];
          const prevExp =
            prevSub.expiresAt
              ? new Date(
                  prevSub.expiresAt,
                ).getTime()
              : 0;
          const prevStart =
            new Date(
              prevSub.createdAt,
            ).getTime();

          const gap =
            streakStartDate -
            prevExp;
          if (
            gap <=
            172800000
          ) {
            streakStartDate =
              prevStart;
          } else {
            break;
          }
        }
      }
    }

    // 3. Process PPV (The duplicate subscription loop is truly dead)
    viewerPurchases.forEach(
      (
        p,
      ) => {
        if (
          p.purchaseType ===
            "PPV" &&
          p.content &&
          p.status ===
            "completed"
        ) {
          unlockedPPV.add(
            p.content.toString(),
          );
        }
      },
    );

    const chatRecord =
      await Conversation.findOne(
        {
          fan: viewerId,
          creator:
            creatorId,
        },
      )
        .select(
          "bubblesLeft",
        )
        .lean();

    const chatBubblesLeft =
      chatRecord
        ? chatRecord.bubblesLeft
        : 0;
    const hasActiveChat =
      chatBubblesLeft >
      0;

    const secureContentRaw =
      await Promise.all(
        creatorContent.map(
          async (
            post,
          ) => {
            const settings =
              creator.monetizationSettings ||
              {};
            const globalPPV =
              settings.defaultPPVPrice ||
              0;
            const creatorCurrency =
              settings.priceCurrency ||
              settings.baseCurrency ||
              "USD";

            let rawBasePrice = 0;
            if (
              post.price !==
                undefined &&
              post.price !==
                null
            ) {
              rawBasePrice =
                post.price;
            } else if (
              post.priceInUSDT !==
                undefined &&
              post.priceInUSDT !==
                null
            ) {
              rawBasePrice =
                post.priceInUSDT;
            } else {
              rawBasePrice =
                globalPPV;
            }

            const isCreator =
              creatorId ===
              viewerId.toString();
            const isFree =
              rawBasePrice <=
              0;
            const hasPurchasedFiatPPV =
              unlockedPPV.has(
                post._id.toString(),
              );

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

            const hasAccess =
              isCreator ||
              isFree ||
              hasPurchasedFiatPPV ||
              hasPurchasedCrypto ||
              hasActiveSub;

            // --- THE LIFETIME SUNSET ENGINE (WITH SUBSCRIBER GRACE PERIOD) ---
            if (
              post.status ===
              "sunset"
            ) {
              let isGrandfathered = false;

              if (
                isCreator
              ) {
                isGrandfathered = true;
              } else {
                // 1. Lifetime access strictly granted to direct PPV buyers
                if (
                  hasPurchasedFiatPPV
                )
                  isGrandfathered = true;
                if (
                  hasPurchasedCrypto
                )
                  isGrandfathered = true;

                // 2. Active Subscriber Grace Period
                const sunsetTime =
                  post.sunsetAt
                    ? new Date(
                        post.sunsetAt,
                      ).getTime()
                    : 0;
                if (
                  hasActiveSub &&
                  streakStartDate &&
                  streakStartDate <
                    sunsetTime
                ) {
                  isGrandfathered = true;
                }
              }

              // Filter out the post completely if they are not grandfathered
              if (
                !isGrandfathered
              )
                return null;
            }

            post.teaserUrl =
              post.teaserKey
                ? `https://${process.env.R2_PUBLIC_DOMAIN}/${post.teaserKey}`
                : "https://placehold.co/600x400/111111/555555?text=Locked";

            if (
              !hasAccess
            ) {
              delete post.fileKey;
              post.mediaUrl =
                null;
              post.isLocked = true;
            } else {
              try {
                const command =
                  new GetObjectCommand(
                    {
                      Bucket:
                        process
                          .env
                          .S3_BUCKET_NAME,
                      Key: post.fileKey,
                    },
                  );
                post.mediaUrl =
                  await getSignedUrl(
                    s3,
                    command,
                    {
                      expiresIn: 3600,
                    },
                  );
                post.isLocked = false;
                delete post.fileKey;
              } catch (err) {
                post.mediaUrl =
                  null;
                post.isLocked = true;
              }
            }

            const likesArray =
              post.likes ||
              [];
            return {
              ...post,
              actualPrice:
                rawBasePrice,
              priceCurrency:
                creatorCurrency,
              isPaywalled:
                !isFree,
              isLiked:
                likesArray.some(
                  (
                    id,
                  ) =>
                    id.toString() ===
                    viewerId.toString(),
                ),
              likesCount:
                likesArray.length,
              commentsCount:
                post.comments
                  ? post
                      .comments
                      .length
                  : 0,
            };
          },
        ),
      );

    // Strip out the nulls (hidden sunset posts)
    const secureContent =
      secureContentRaw.filter(
        (
          post,
        ) =>
          post !==
          null,
      );

    res
      .status(
        200,
      )
      .json(
        {
          creator,
          isSubscribed:
            hasActiveSub,
          chatBubblesLeft,
          hasActiveChat,
          isFollowed,
          content:
            secureContent,
        },
      );
  } catch (error) {
    res.status(500).json({ message: "Failed to load creator profile" });
  }
};
