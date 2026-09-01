// server/routes/webhookRoutes.js
const express = require("express");
const router =
  express.Router();
const webhookController = require("../controllers/webhookController");

router.post(
  "/paystack",
  express.json(),
  webhookController.handlePaystackWebhook,
);

module.exports =
  router;
