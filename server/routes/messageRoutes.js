const express = require("express");
const router =
  express.Router();
const multer = require("multer");
const {
  requireAuth,
  requireAgeVerified,
} = require("../middleware/authMiddleware");
const {
  sendMessage,
  getInbox,
  getMessages,
  verifyMessagePayment,
  getSecureMessageMedia,
  buyMessageBundle,
  getUnreadCount,
} = require("../controllers/messageController");

// Use memory storage so we don't write files to your server disk
const upload =
  multer({
    storage:
      multer.memoryStorage(),
  });

// --- MESSAGE ROUTES ---

// 1. THE FIXED /send ROUTE: Chained correctly (Auth -> Parse Form Data -> Controller)
router.post(
  "/send",
  requireAuth,
  upload.single(
    "media",
  ),
  sendMessage,
);

router.post(
  "/buy-bundle",
  requireAuth,
  buyMessageBundle,
);

router.get(
  "/inbox",
  requireAuth,
  getInbox,
);

router.get(
  "/unread-count",
  requireAuth,
  getUnreadCount,
);

router.get(
  "/:conversationId",
  requireAuth,
  getMessages,
);

router.post(
  "/unlock",
  requireAuth,
  verifyMessagePayment,
);

router.get(
  "/:messageId/stream",
  requireAuth,
  getSecureMessageMedia,
);

module.exports =
  router;
