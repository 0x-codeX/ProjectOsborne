const express = require("express");
const router =
  express.Router();
const {
  getSecureStreamUrl,
} = require("../controllers/mediaController");
const {
  requireAuth,
  //requireVerifiedCreator,
} = require("../middleware/authMiddleware");



router.get(
  "/stream/:contentId",
  requireAuth,
  getSecureStreamUrl,
);

module.exports =
  router;
