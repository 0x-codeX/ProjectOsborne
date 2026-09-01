const express = require("express");
const router =
  express.Router();
const {
  requireAuth,
} = require("../middleware/authMiddleware");
const {
  generateUploadTicket,
  getSecureStreamUrl,
} = require("../controllers/mediaController"); // Adjust path if necessary

// 1. THE UPLOAD TICKET ROUTE (Used for avatars, banners, etc.)
// Frontend calls: POST /api/media/upload-ticket
router.post(
  "/upload-ticket",
  requireAuth,
  generateUploadTicket,
);

// 2. THE SECURE STREAMING ROUTE (Used for watching paywalled videos)
// Frontend calls: GET /api/media/stream/:contentId
router.get(
  "/stream/:contentId",
  requireAuth,
  getSecureStreamUrl,
);

module.exports =
  router;
