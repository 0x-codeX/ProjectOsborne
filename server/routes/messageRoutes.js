const express = require("express");
const router =
  express.Router();
const {
  sendMessage,
  getInbox,
  getMessages,
  verifyMessagePayment,
  getSecureMessageMedia,
} = require("../controllers/messageController");
const {
  requireAuth,
} = require("../middleware/authMiddleware"); // Or whatever your auth middleware is named

router.post(
  "/send",
  requireAuth,
  sendMessage,
);
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
