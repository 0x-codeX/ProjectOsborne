const express = require("express");
const router =
  express.Router();
const {
  requireAuth,
} = require("../middleware/authMiddleware");
const {
  getMonetizationSettings,
  updateMonetizationSettings,
  submitBioData,
  updateProfile,
  deleteProfile,
  getProfile,
  updateSettings,
} = require("../controllers/userController");
const {
  toggleFollow,
} = require("../controllers/userController");



// --- GET Routes ---
router.get(
  "/profile",
  requireAuth,
  getProfile,
);
router.get(
  "/settings/monetization",
  requireAuth,
  getMonetizationSettings,
);

// --- PUT Routes ---
// 1. Initial Fan Onboarding / Bio Data
router.put(
  "/biodata",
  requireAuth,
  submitBioData,
);

// 2. Everyday non-sensitive profile edits (username, image)
router.put(
  "/profile",
  requireAuth,
  updateProfile,
);

// 3. Sensitive security settings (password, email, wallet)
router.put(
  "/settings",
  requireAuth,
  updateSettings,
);

// 4. Monetization tiers
router.put(
  "/settings/monetization",
  requireAuth,
  updateMonetizationSettings,
);

// --- DELETE Routes ---
router.delete(
  "/profile",
  requireAuth,
  deleteProfile,
);

router.post(
  "/:id/follow",
  requireAuth,
  toggleFollow,
);

module.exports =
  router;
