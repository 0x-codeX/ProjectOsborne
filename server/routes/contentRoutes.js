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
} = require("../controllers/contentController");



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
router.put("/:id", requireAuth, updateContentPost);
router.delete("/:id", requireAuth, deleteContentPost);

// Interaction Routes
router.post("/:id/like", requireAuth, toggleLike);
router.post("/:id/bookmark", requireAuth, toggleBookmark);
router.post("/:id/comment", requireAuth, addComment);

module.exports =
  router;
