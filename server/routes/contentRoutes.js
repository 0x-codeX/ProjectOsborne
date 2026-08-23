const express = require("express");
const router =
  express.Router();
const {
  requireAuth,
  requireAgeVerified,
} = require("../middleware/authMiddleware");
const {
  createContentPost,
  getFeed,
  getCreatorVault,
  updateContentPost,
  deleteContentPost,
} = require("../controllers/contentController");
const {
  toggleLike,
  toggleBookmark,
  addComment,
  getBookmarks,
  getCreatorPublicProfile,
  recordView,
} = require("../controllers/contentController");
const Content = require("../models/Content");
const multer = require("multer");

// Setup Multer to save temporarily in an 'uploads' folder
const upload =
  multer({
    dest: "uploads/",
  });

// POST /api/content/create
// CRUD routes
router.post(
  "/",
  requireAuth,
  createContentPost,
);
router.get(
  "/vault",
  requireAuth,
  getCreatorVault,
);
// Feed, Vault, and Bookmarks routes
router.get(
  "/feed",
  requireAuth,
  getFeed,
);
router.get(
  "/bookmarked",
  requireAuth,
  getBookmarks,
);
router.get(
  "/creator/:id",
  requireAuth,
  getCreatorPublicProfile,
);
router.put(
  "/:id",
  requireAuth,
  updateContentPost,
);
router.delete(
  "/:id",
  requireAuth,
  deleteContentPost,
);

// Interaction Routes
router.post(
  "/:id/like",
  requireAuth,
  toggleLike,
);
router.post(
  "/:id/bookmark",
  requireAuth,
  toggleBookmark,
);
router.post(
  "/:id/comment",
  requireAuth,
  addComment,
);

/**
 * SECURE MEDIA ROUTE
 * Only serves the locked payload if the user's wallet is in the unlockedFor array AND they pass the Age Gate.
 */
router.get(
  "/:id/payload",
  requireAuth,
  async (
    req,
    res,
  ) => {
    try {
      const contentId = req.params.id;
      const requestingWallet = req.user.walletAddress
        ? req.user.walletAddress.toLowerCase()
        : null;

      if (!requestingWallet) {
        return res.status(403).json({
          error: "Web3 Wallet required to access this content.",
        });
      }

      const content = await Content.findById(contentId).populate("creator");
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      // Check if the user is the creator
      const isCreator = content.creator._id 
        ? content.creator._id.toString() === req.user._id.toString()
        : content.creator.toString() === req.user._id.toString();

      // =================================================================
      // THE AGE VERIFICATION GATE (Direct Link Protector)
      // =================================================================
      // If a fan directly hits this API endpoint for an NSFW post, block them.
      const isNsfw = content.isNsfw === true || content.creator.willingNsfw === true;
      if (!isCreator && isNsfw && req.user.isAgeVerified !== true) {
        return res.status(403).json({
          error: "SECURITY BLOCK: Age verification required.",
          isAgeRestricted: true
        });
      }
      // =================================================================

      // Since we added `lowercase: true` to the schema, we can trust the DB values
      const isUnlocked = content.unlockedFor.includes(requestingWallet);

      if (!isUnlocked && !isCreator) {
        return res.status(403).json({
          error: "Payment required.",
          isLocked: true,
        });
      }

      // SUCCESS: The user paid AND is age-verified (or it's SFW). Serve the fileKey.
      return res.status(200).json({
        success: true,
        fileKey: content.fileKey,
      });
    } catch (error) {
      console.error("API Gatekeeper Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// The 'video' string must match the FormData field name from your frontend
router.post(
  "/upload",
  requireAuth,
  upload.single(
    "media",
  ),
  createContentPost,
);

router.post(
  "/:id/view",
  requireAuth,
  recordView,
);

// // Fetching a single unlocked NSFW post
// router.get(
//   "/:id",
//   requireAuth,
//   requireAgeVerified,
//   getLockedPost,
// );

module.exports =
  router;
