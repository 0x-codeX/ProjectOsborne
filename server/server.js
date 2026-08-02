require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");

// Route Imports
const withdrawalRoutes = require("./routes/withdrawalRoutes");
const contentRoutes = require("./routes/contentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const messageRoutes = require("./routes/messageRoutes");
const authRoutes = require("./routes/authRoutes");
const mediaRoutes = require("./routes/mediaRoutes");
const userRoutes = require("./routes/userRoutes");
const earningsRoutes = require("./routes/earningsRoutes");

// Cron Jobs
const startReaper = require("./cron/reaper");

// Initialize Web3 Listener using CommonJS
require("./workers/web3Listener.js");

const app =
  express();

// Security & Middleware
app.use(
  helmet(),
);
app.use(
  cors({
    origin:
      "http://localhost:5173",
  }),
);
app.use(
  express.json(),
);

// Database Connection
mongoose
  .connect(
    process
      .env
      .MONGO_URI,
  )
  .then(
    () =>
      console.log(
        "MongoDB Connected: Nippy Core DB",
      ),
  )
  .catch(
    (
      err,
    ) =>
      console.error(
        "DB Connection Error:",
        err,
      ),
  );

// Basic API Health Route
app.get(
  "/api/health",
  (
    req,
    res,
  ) => {
    res
      .status(
        200,
      )
      .json(
        {
          status:
            "ok",
          message:
            "Nippy API is running securely.",
        },
      );
  },
);

// Mounted Routes
app.use(
  "/api/auth",
  authRoutes,
);
app.use(
  "/api/media",
  mediaRoutes,
);
app.use(
  "/api/users",
  userRoutes,
);
app.use(
  "/api/earnings",
  earningsRoutes,
);
app.use(
  "/api/content",
  contentRoutes,
);
app.use(
  "/api/purchases",
  purchaseRoutes,
);
app.use(
  "/api/withdraw",
  withdrawalRoutes,
);
app.use(
  "/api/notifications",
  notificationRoutes,
);
app.use(
  "/api/messages",
  messageRoutes,
);

// Server Initialization
const PORT =
  process
    .env
    .PORT ||
  5000;
app.listen(
  PORT,
  () => {
    console.log(
      `Server running on port ${PORT}`,
    );

    // Start the background cron jobs
    if (
      typeof startReaper ===
      "function"
    ) {
      startReaper();
    }
  },
);
