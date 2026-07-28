const express = require("express");
const router =
  express.Router();
const {
  generateUploadTicket,
  getSecureStreamUrl,
} = require("../controllers/mediaController");
const {
  requireAuth,
  //requireVerifiedCreator,
} = require("../middleware/authMiddleware");

// The Vault Door: Must be logged in AND have passed KYC
router.post(
  "/upload-ticket",
  requireAuth,
  //requireVerifiedCreator,
  generateUploadTicket,
);

router.get(
  "/stream/:contentId",
  requireAuth,
  getSecureStreamUrl,
);

module.exports =
  router;
