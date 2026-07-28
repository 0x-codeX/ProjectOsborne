// server/routes/authRoutes.js
const express = require("express");
const router =
  express.Router();
const {
  registerUser,
  loginUser,
  web3Login,
  getWeb3Nonce,
} = require("../controllers/authController");
const {
  startKycSession,
  kycWebhook,
} = require("../controllers/kycController");
const {
  getMe,
} = require("../controllers/authController");
const {
  requireAuth,
} = require("../middleware/authMiddleware");


router.post(
  "/register",
  registerUser,
);
router.post(
  "/login",
  loginUser,
);
router.post(
  "/web3-login",
  web3Login,
);
router.post(
  "/kyc/start-session",
  startKycSession,
);
// This route must be PUBLIC so the provider can reach it
router.post('/kyc/webhook', kycWebhook);
router.get(
  "/web3-nonce",
  getWeb3Nonce,
);
router.get(
  "/me",
  requireAuth,
  getMe,
);

module.exports =
  router;
