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



// Get Routs
router.get(
  "/settings/monetization",
  requireAuth,
  getMonetizationSettings,
);
router.get(
  "/profile",
  requireAuth,
  getProfile,
);


//Put Route
router.put(
  "/settings/monetization",
  requireAuth,
  updateMonetizationSettings,
);
router.put(
  "/profile",
  requireAuth,
  submitBioData, 
);
router.put(
  "/settings",
  requireAuth,
  updateSettings,
);
router.put(
  "/settings",
  requireAuth,
  updateProfile,
);


// Delete Routes
router.delete(
  "/profile",
  requireAuth,
  deleteProfile,
);

module.exports =
  router;
