const express = require("express");
const router =
  express.Router();
const {
  sendMessage,
  getInbox,
  getMessages,
  verifyMessagePayment,
  getSecureMessageMedia,
  buyMessageBundle, // <-- ADDED THIS NEW CONTROLLER
} = require("../controllers/messageController");
const {
  requireAuth,
} = require("../middleware/authMiddleware");

// --- MESSAGE ROUTES ---
router.post(
  "/send",
  requireAuth,
  sendMessage,
);
router.post(
  "/buy-bundle",
  requireAuth,
  buyMessageBundle,
); // <-- ADDED THIS ROUTE
router.get(
  "/inbox",
  requireAuth,
  getInbox,
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
