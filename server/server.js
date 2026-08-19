require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const http = require("http");
const {
  Server,
} = require("socket.io");

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
const adminRoutes = require("./routes/adminRoutes");
const streamRoutes = require("./routes/streamRoutes");

// Cron Jobs
const startReaper = require("./cron/reaper");

// Initialize Web3 Listener
require("./workers/web3Listener.js");

const app =
  express();

// 1. Wrap Express inside the core HTTP server
const server =
  http.createServer(
    app,
  );

// 2. Initialize Socket.io with CORS allowing your React frontend
const io =
  new Server(
    server,
    {
      cors: {
        origin:
          [
            "http://localhost:5173",
            "http://localhost:5174",
          ], // Change this if your React port is different
        methods:
          [
            "GET",
            "POST",
          ],
      },
    },
  );

// Security & Middleware
app.use(
  helmet(),
);
app.use(
  cors({
    origin:
      [
        "http://localhost:5173",
        "http://localhost:5174",
      ],
    //credentials: true,
  }),
);
app.use(
  express.json(),
);

// 3. Make 'io' available inside all your controllers via 'req'
app.use(
  (
    req,
    res,
    next,
  ) => {
    req.io =
      io;
    next();
  },
);

// 4. Listen for live connections
io.on(
  "connection",
  (
    socket,
  ) => {
    console.log(
      "🟢 User connected to WebSockets:",
      socket.id,
    );

    // When a user opens a chat window, put them in a private "room" for that conversation
    socket.on(
      "join_chat",
      (
        conversationId,
      ) => {
        socket.join(
          conversationId,
        );
        console.log(
          `User joined conversation room: ${conversationId}`,
        );
      },
    );

    socket.on(
      "disconnect",
      () => {
        console.log(
          "🔴 User disconnected",
        );
      },
    );
  },
);

// Database Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected: Nippy Core DB");
    
    // THE FIX: We are commenting this out temporarily!
    // We must stabilize the server to test Livepeer first. 
    // require("./workers/web3Listener.js");
  })
  .catch((err) =>
    console.error("DB Connection Error:", err)
  );

// Basic API Health Route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Nippy API is running securely.",
  });
});

// Mounted Routes
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/users", userRoutes);
app.use("/api/earnings", earningsRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/withdraw", withdrawalRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/streams", streamRoutes);

// Server Initialization
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Start the background cron jobs
  if (typeof startReaper === "function") {
    startReaper();
  }
});
