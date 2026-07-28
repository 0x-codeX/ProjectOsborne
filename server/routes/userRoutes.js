const express = require("express");
const router =
  express.Router();
const {
  requireAuth,
} = require("../middleware/authMiddleware");

// Destructure exactly what you exported from the controller
const {
  getMonetizationSettings,
  updateMonetizationSettings,
  updateProfile, 
} = require("../controllers/userController");

// Lock routes down
router.get(
  "/settings/monetization",
  requireAuth,
  getMonetizationSettings,
);

router.put(
  "/settings/monetization",
  requireAuth,
  updateMonetizationSettings,
);

router.put(
  "/profile",
  requireAuth,
  updateProfile, 
);

module.exports =
  router;
