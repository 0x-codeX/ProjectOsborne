const express = require("express");
const router =
  express.Router();
const {
  requireAuth,
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
} = require("../controllers/contentController");
const Content = require("../models/Content");
const multer = require("multer");




// Setup Multer to save temporarily in an 'uploads' folder
const upload = multer({ dest: "uploads/" });



// POST /api/content/create
// CRUD routes
router.post("/", requireAuth, createContentPost);
router.get(
  "/vault",
  requireAuth,
  getCreatorVault,
);
// Feed, Vault, and Bookmarks routes
router.get("/feed", requireAuth, getFeed);
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
router.put("/:id", requireAuth, updateContentPost);
router.delete("/:id", requireAuth, deleteContentPost);

// Interaction Routes
router.post("/:id/like", requireAuth, toggleLike);
router.post("/:id/bookmark", requireAuth, toggleBookmark);
router.post("/:id/comment", requireAuth, addComment);


/**
 * SECURE MEDIA ROUTE
 * Only serves the locked payload if the user's wallet is in the unlockedFor array.
 */
router.get("/:id/payload", requireAuth, async (req, res) => {
  try {
    const contentId = req.params.id;
    const requestingWallet = req.user.walletAddress ? req.user.walletAddress.toLowerCase() : null;

    if (!requestingWallet) {
      return res.status(403).json({ error: "Web3 Wallet required to access this content." });
    }

    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({ error: "Content not found" });
    }

    // Since we added `lowercase: true` to the schema, we can trust the DB values
    const isUnlocked = content.unlockedFor.includes(requestingWallet);

    // Check if the user is the creator (assuming creator is stored as an ObjectId reference)
    const isCreator = content.creator.toString() === req.user._id.toString();

    if (!isUnlocked && !isCreator) {
      return res.status(403).json({ 
        error: "Payment required.", 
        isLocked: true 
      });
    }

    // SUCCESS: The user paid (or is the creator). Serve the fileKey.
    return res.status(200).json({
      success: true,
      fileKey: content.fileKey 
    });

  } catch (error) {
    console.error("API Gatekeeper Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



// The 'video' string must match the FormData field name from your frontend
router.post("/upload", requireAuth, upload.single("video"), createContentPost);

module.exports =
  router;
