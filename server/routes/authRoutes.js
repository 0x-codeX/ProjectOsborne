// server/routes/authRoutes.js
const express = require("express");
const router =
  express.Router();

const {
  registerUser,
  loginUser,
  web3Login,
  getWeb3Nonce,
  linkEmailToAccount,
  linkWalletToAccount,
  getMe,
  googleAuth, 
} = require("../controllers/authController");

const {
  startKycSession,
  kycWebhook,
} = require("../controllers/kycController");

const {
  requireAuth,
} = require("../middleware/authMiddleware");

// --- STANDARD AUTH ---
router.post(
  "/register",
  registerUser,
);
router.post(
  "/login",
  loginUser,
);
router.get(
  "/me",
  requireAuth,
  getMe,
);

// --- WEB3 AUTH ---
router.post(
  "/web3-login",
  web3Login,
);
router.get(
  "/web3-nonce",
  getWeb3Nonce,
);

// --- ACCOUNT LINKING ---
router.put(
  "/link-email",
  requireAuth,
  linkEmailToAccount,
);
router.put(
  "/link-wallet",
  requireAuth,
  linkWalletToAccount,
);

// --- KYC ---
router.post(
  "/kyc/start-session",
  startKycSession,
);
router.post(
  "/kyc/webhook",
  kycWebhook,
); // Must be PUBLIC for the provider

// --- GOOGLE OAUTH ---
router.post(
  "/google",
  googleAuth,
);

module.exports =
  router;
