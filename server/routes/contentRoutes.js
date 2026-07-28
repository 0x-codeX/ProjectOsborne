const express = require("express");
const router =
  express.Router();
const {
  requireAuth,
} = require("../middleware/authMiddleware"); // Adjust path if needed
const {
  createContentPost,
} = require("../controllers/contentController");

// POST /api/content/create
router.post(
  "/create",
  requireAuth,
  createContentPost,
);

module.exports =
  router;
