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
const ageVerificationRoutes = require("./routes/ageVerificationRoutes");

// Cron Jobs
const startReaper = require("./cron/reaper");

// Initialize Web3 Listener
require("./workers/web3Listener.js");

// Allowed Origins Configuration
const allowedOrigins =
  [
    "https://project-osborne-client.vercel.app",
  "https://project-osborne.vercel.app",
    "https://nippy-client.vercel.app",
    "https://nippy-admin.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
  ];

const corsOptions =
  {
    origin:
      function (
        origin,
        callback,
      ) {
        if (
          !origin ||
          allowedOrigins.includes(
            origin,
          )
        ) {
          callback(
            null,
            true,
          );
        } else {
          callback(
            new Error(
              "Blocked by CORS policy",
            ),
          );
        }
      },
    credentials: true,
    methods:
      [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
        "OPTIONS",
      ],
    allowedHeaders:
      [
        "Content-Type",
        "Authorization",
      ],
  };

const app =
  express();

// 1. Wrap Express inside the core HTTP server
const server =
  http.createServer(
    app,
  );

// 2. Initialize Socket.io with production CORS
const io =
  new Server(
    server,
    {
      cors: {
        origin:
          allowedOrigins,
        methods:
          [
            "GET",
            "POST",
          ],
        credentials: true,
      },
    },
  );

// 3. Security & Global Middleware (MUST BE AT THE VERY TOP)
app.use(
  cors(
    corsOptions,
  ),
);
app.use(
  helmet(),
);
app.use(
  express.json(),
);

// 4. Attach Socket.io to request object
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

// 5. Socket.io Event Handlers
io.on(
  "connection",
  (
    socket,
  ) => {
    console.log(
      "🟢 User connected to WebSockets:",
      socket.id,
    );

    socket.on(
      "join_chat",
      (
        conversationId,
      ) => {
        socket.join(
          conversationId,
        );
      },
    );

    socket.on(
      "join_live_chat",
      (
        data,
      ) => {
        if (
          data &&
          data.streamId
        ) {
          socket.join(
            data.streamId,
          );
        }
      },
    );

    socket.on(
      "send_live_message",
      (
        data,
      ) => {
        if (
          data &&
          data.streamId
        ) {
          socket
            .to(
              data.streamId,
            )
            .emit(
              "live_message",
              data,
            );
        }
      },
    );

    socket.on(
      "end_live_stream",
      (
        data,
      ) => {
        if (
          data &&
          data.streamId
        ) {
          socket
            .to(
              data.streamId,
            )
            .emit(
              "live_stream_ended",
              data,
            );
        }
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
  .connect(
    process
      .env
      .MONGO_URI,
  )
  .then(
    () => {
      console.log(
        "MongoDB Connected: Nippy Core DB",
      );
    },
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

// API Health Route
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
  "/api/admin",
  adminRoutes,
);
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
app.use(
  "/api/streams",
  streamRoutes,
);
app.use(
  "/api/age-verification",
  ageVerificationRoutes,
);

// Server Initialization
const PORT =
  process
    .env
    .PORT ||
  5000;

require("./workers/treasuryAuditor");
require("./workers/fiatBatchProcessor");
require("./workers/voucherSweeper");

server.listen(
  PORT,
  () => {
    console.log(
      `Server running on port ${PORT}`,
    );
    if (
      typeof startReaper ===
      "function"
    ) {
      startReaper();
    }
  },
);
