const Content = require("../models/Content");
const User = require("../models/User");
const Purchase = require("../models/Purchase");
const Notification = require("../models/Notification"); // <-- IRONCLAD FIX: Added Notification Model
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
const sharp = require("sharp");
const {
  convertAndRoundPrice,
} = require("../utils/currencyConversion");

// Initialize R2 Client
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
        priceInUSDT,
        isNsfw,
      } =
        req.body;
      const file =
        req.file;

      if (
        !title ||
        priceInUSDT ===
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

      // FIX: Save exactly what the Creator typed (no rounding here).
      // This ensures their Vault displays their raw expected payout.
      const rawPrice =
        parseFloat(
          priceInUSDT ||
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
            priceInUSDT:
              savedPrice,
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
exports.getFeed =
  async (
    req,
    res,
  ) => {
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
      const userCountry =
        req
          .user
          ?.country ||
        "United States";

      const posts =
        await Content.find()
          .populate(
            "creator",
            "username monetizationSettings profileImage walletAddress",
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
      const viewer =
        await User.findById(
          viewerId,
        )
          .select(
            "bookmarks following",
          )
          .lean();

      const unlockedContentMap =
        new Map();
      const subscribedCreatorMap =
        new Map();
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
      const followingSet =
        new Set(
          viewer?.following?.map(
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
          )
            unlockedContentMap.set(
              p.content.toString(),
              new Date(
                p.createdAt,
              ).getTime(),
            );
          if (
            p.purchaseType ===
              "SUBSCRIPTION" &&
            p.creator
          )
            subscribedCreatorMap.set(
              p.creator.toString(),
              new Date(
                p.createdAt,
              ).getTime(),
            );
        },
      );

      const secureFeed =
        [];

      for (const post of posts) {
        const globalPPV =
          post
            .creator
            ?.monetizationSettings
            ?.defaultPPVPrice ||
          0;
        const rawBasePrice =
          post.price !=
          null
            ? post.price
            : post.priceInUSDT !=
                null
              ? post.priceInUSDT
              : globalPPV;

        // PLATFORM MARKUP FIX: The fan feed dynamically intercepts the creator's raw price
        // and rounds it up to the nearest 0.50 increment specifically for the fan's view.
        const fanDisplayPrice =
          rawBasePrice >
          0
            ? Math.ceil(
                rawBasePrice *
                  2,
              ) /
              2
            : 0;
        const pricing =
          await convertAndRoundPrice(
            fanDisplayPrice,
            userCountry,
          );

        const isCreator =
          post.creator?._id.toString() ===
          viewerId.toString();
        const isFree =
          rawBasePrice ===
          0;

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
          if (
            hasPurchasedCrypto
          )
            isGrandfathered = true;
          if (
            !isGrandfathered
          )
            continue;
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
          delete post.hiddenText;
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
          } catch (err) {
            post.mediaUrl =
              null;
            post.isLocked = true;
          }
        }

        const likesArray =
          post.likes ||
          [];
        secureFeed.push(
          {
            ...post,
            creator:
              {
                ...post.creator,
                isFollowed:
                  followingSet.has(
                    post.creator?._id.toString(),
                  ),
              },
            actualPrice:
              fanDisplayPrice, // Force the fan frontend to use the rounded price
            displayPrice:
              pricing.displayPrice,
            displayCurrency:
              pricing.displayCurrency,
            paystackNGNAmount:
              pricing.paystackNGNAmount,
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
      res
        .status(
          200,
        )
        .json(
          secureFeed,
        );
    } catch (error) {
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to load feed",
          },
        );
    }
  };

// GET /api/content/vault
exports.getCreatorVault =
  async (
    req,
    res,
  ) => {
    try {
      const creatorId =
        req
          .user
          ._id;
      // Vault returns the raw documents, maintaining the creator's exact typed price
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

      // FIX: Save exactly what the creator types when they edit from the Vault.
      if (
        priceInUSDT !==
        undefined
      ) {
        const parsed =
          parseFloat(
            priceInUSDT,
          );
        post.priceInUSDT =
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
      const contentId =
        req
          .params
          .id;

      // $inc is lightning fast and prevents race conditions
      await Content.findByIdAndUpdate(
        contentId,
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
      console.error(
        "View tracking error:",
        error,
      );
      // We send a 200 even on fail so the frontend doesn't panic. Analytics shouldn't break the app.
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

      // Return the newly created comment
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
exports.getBookmarks =
  async (
    req,
    res,
  ) => {
    try {
      const viewerId =
        req
          .user
          ._id;
      const userCountry =
        req
          .user
          ?.country ||
        "United States";
      const viewer =
        await User.findById(
          viewerId,
        )
          .select(
            "bookmarks following",
          )
          .lean();

      if (
        !viewer ||
        !viewer.bookmarks ||
        viewer
          .bookmarks
          .length ===
          0
      )
        return res
          .status(
            200,
          )
          .json(
            [],
          );

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
            "username monetizationSettings profileImage walletAddress",
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
      const unlockedContentMap =
        new Map();
      const subscribedCreatorMap =
        new Map();
      const followingSet =
        new Set(
          viewer.following?.map(
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
          )
            unlockedContentMap.set(
              p.content.toString(),
              new Date(
                p.createdAt,
              ).getTime(),
            );
          if (
            p.purchaseType ===
              "SUBSCRIPTION" &&
            p.creator
          )
            subscribedCreatorMap.set(
              p.creator.toString(),
              new Date(
                p.createdAt,
              ).getTime(),
            );
        },
      );

      const secureBookmarks =
        [];

      for (const post of bookmarkedPosts) {
        const globalPPV =
          post
            .creator
            ?.monetizationSettings
            ?.defaultPPVPrice ||
          0;
        const rawBasePrice =
          post.price !=
          null
            ? post.price
            : post.priceInUSDT !=
                null
              ? post.priceInUSDT
              : globalPPV;

        // DYNAMIC ROUNDING
        const fanDisplayPrice =
          rawBasePrice >
          0
            ? Math.ceil(
                rawBasePrice *
                  2,
              ) /
              2
            : 0;
        const pricing =
          await convertAndRoundPrice(
            fanDisplayPrice,
            userCountry,
          );

        const isCreator =
          post.creator?._id.toString() ===
          viewerId.toString();
        const isFree =
          rawBasePrice ===
          0;

        const ppvDate =
          unlockedContentMap.get(
            post._id.toString(),
          );
        const subDate =
          subscribedCreatorMap.get(
            post.creator?._id.toString(),
          );
        const hasPurchasedPPV =
          !!ppvDate;
        const hasActiveSub =
          !!subDate;

        const hasAccess =
          isCreator ||
          isFree ||
          hasPurchasedPPV ||
          hasActiveSub;

        if (
          post.status ===
          "sunset"
        ) {
          let isGrandfathered = false;
          if (
            isCreator
          )
            isGrandfathered = true;
          else {
            const sunsetTime =
              new Date(
                post.sunsetAt,
              ).getTime();
            if (
              hasPurchasedPPV &&
              ppvDate <
                sunsetTime
            )
              isGrandfathered = true;
            else if (
              hasActiveSub &&
              subDate <
                sunsetTime
            )
              isGrandfathered = true;
          }
          if (
            !isGrandfathered
          )
            continue;
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
          } catch (err) {
            post.mediaUrl =
              null;
            post.isLocked = true;
          }
        }

        const likesArray =
          post.likes ||
          [];
        secureBookmarks.push(
          {
            ...post,
            creator:
              {
                ...post.creator,
                isFollowed:
                  followingSet.has(
                    post.creator?._id.toString(),
                  ),
              },
            actualPrice:
              fanDisplayPrice, // DYNAMIC ROUNDING
            displayPrice:
              pricing.displayPrice,
            displayCurrency:
              pricing.displayCurrency,
            paystackNGNAmount:
              pricing.paystackNGNAmount,
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
      res
        .status(
          200,
        )
        .json(
          secureBookmarks,
        );
    } catch (error) {
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to load bookmarks",
          },
        );
    }
  };

// GET /api/content/creator/:id
exports.getCreatorPublicProfile =
  async (
    req,
    res,
  ) => {
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
      const userCountry =
        req
          .user
          ?.country ||
        "United States";

      const creator =
        await User.findById(
          creatorId,
        )
          .select(
            "username profileImage monetizationSettings walletAddress",
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
      const unlockedPPV =
        new Set();
      viewerPurchases.forEach(
        (
          p,
        ) => {
          if (
            p.purchaseType ===
            "SUBSCRIPTION"
          )
            hasActiveSub = true;
          if (
            p.purchaseType ===
              "PPV" &&
            p.content
          )
            unlockedPPV.add(
              p.content.toString(),
            );
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

      const secureContent =
        await Promise.all(
          creatorContent.map(
            async (
              post,
            ) => {
              const globalPPV =
                creator
                  .monetizationSettings
                  ?.defaultPPVPrice ||
                0;
              const rawBasePrice =
                post.price !=
                null
                  ? post.price
                  : post.priceInUSDT !=
                      null
                    ? post.priceInUSDT
                    : globalPPV;

              // DYNAMIC ROUNDING
              const fanDisplayPrice =
                rawBasePrice >
                0
                  ? Math.ceil(
                      rawBasePrice *
                        2,
                    ) /
                    2
                  : 0;
              const pricing =
                await convertAndRoundPrice(
                  fanDisplayPrice,
                  userCountry,
                );

              const isCreator =
                creatorId ===
                viewerId.toString();
              const isFree =
                rawBasePrice ===
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
                  fanDisplayPrice, // DYNAMIC ROUNDING
                displayPrice:
                  pricing.displayPrice,
                displayCurrency:
                  pricing.displayCurrency,
                paystackNGNAmount:
                  pricing.paystackNGNAmount,
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
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to load creator profile",
          },
        );
    }
  };

async function formatContentPricesForUser(
  contentItems,
  userCountry,
) {
  return await Promise.all(
    contentItems.map(
      async (
        item,
      ) => {
        const contentObj =
          item.toObject
            ? item.toObject()
            : {
                ...item,
              };

        if (
          contentObj.price &&
          contentObj.price >
            0
        ) {
          // DYNAMIC ROUNDING
          const fanDisplayPrice =
            Math.ceil(
              contentObj.price *
                2,
            ) /
            2;
          const pricing =
            await convertAndRoundPrice(
              fanDisplayPrice,
              userCountry,
            );
          contentObj.displayPrice =
            pricing.displayPrice;
          contentObj.displayCurrency =
            pricing.displayCurrency;
          contentObj.paystackNGNAmount =
            pricing.paystackNGNAmount;
        } else {
          contentObj.displayPrice = 0;
          contentObj.displayCurrency =
            "NGN";
          contentObj.paystackNGNAmount = 0;
        }
        return contentObj;
      },
    ),
  );
}

// exports.uploadVideo =
//   async (
//     req,
//     res,
//   ) => {
//     try {
//       const creatorId =
//         req
//           .user
//           ._id;

//       // 1. Handle your standard video saving logic here...
//       const newVideo =
//         await Content.create(
//           {
//             creator:
//               creatorId,
//             title:
//               req
//                 .body
//                 .title,
//             videoUrl:
//               req
//                 .body
//                 .videoUrl,
//             isFree:
//               req
//                 .body
//                 .isFree ||
//               true, // Free or PPV
//             // ... other fields
//           },
//         );

//       // 2. THE MAILMAN: Fetch all fans who follow/subscribe to this creator
//       // (Adjust the query based on your actual Follow/Subscription model schema)
//       const followers =
//         await Follower.find(
//           {
//             creator:
//               creatorId,
//           },
//         ).select(
//           "fan",
//         );

//       // 3. Build the notification payloads in memory
//       if (
//         followers.length >
//         0
//       ) {
//         const notifications =
//           followers.map(
//             (
//               follow,
//             ) => ({
//               recipient:
//                 follow.fan,
//               type: "NEW_CONTENT",
//               title:
//                 req
//                   .body
//                   .isFree
//                   ? "New Free Video!"
//                   : "New Exclusive Content",
//               message: `${req.user.username} just dropped a new video: "${req.body.title}". Go watch it now!`,
//               actionUrl: `/feed/video/${newVideo._id}`, // Make sure this matches your frontend route
//               sender:
//                 creatorId,
//               relatedContent:
//                 newVideo._id,
//             }),
//           );

//         // 4. Bulk insert into the database (Lightning Fast)
//         await Notification.insertMany(
//           notifications,
//         );

//         // Optional but recommended: If you set up Socket.io globally, you can emit an event here
//         // so online fans get the red dot instantly without waiting for the 30-second poll!
//         // req.io.to(`creator_${creatorId}_followers`).emit('new_notification');
//       }

//       // 5. Finally, return success to the creator
//       res
//         .status(
//           201,
//         )
//         .json(
//           {
//             success: true,
//             message:
//               "Video uploaded and fans notified!",
//             data: newVideo,
//           },
//         );
//     } catch (error) {
//       console.error(
//         "Upload Error:",
//         error,
//       );
//       res
//         .status(
//           500,
//         )
//         .json(
//           {
//             message:
//               "Upload failed.",
//           },
//         );
//     }
//   };
