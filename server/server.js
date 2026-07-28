require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const app =
  express();
const withdrawalRoutes = require("./routes/withdrawalRoutes");


// Security & Middleware
app.use(
  helmet(),
); // Secures HTTP headers
app.use(
  cors({
    origin:
      "http://localhost:5173",
  }),
); // Allow React frontend
app.use(
  express.json(),
);
app.use(
  "/api/media",
  require("./routes/mediaRoutes"),
);
app.use(
  "/api/content",
  require("./routes/contentRoutes"),
);
app.use(
  "/api/users",
  require("./routes/userRoutes"),
);
app.use(
  "/api/purchases",
  require("./routes/purchaseRoutes"),
);
app.use(
  "/api/earnings",
  require("./routes/earningsRoutes"),
);
app.use(
  "/api/withdraw",
  withdrawalRoutes,
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

// Basic API Routes
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

// Import Routes (To be created)
// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/creators', require('./routes/creatorRoutes'));
// app.use('/api/transactions', require('./routes/transactionRoutes'));

const PORT =
  process
    .env
    .PORT ||
  5000;
  app.use(
    "/api/auth",
    require("./routes/authRoutes"),
  );
app.listen(
  PORT,
  () =>
    console.log(
      `Server running on port ${PORT}`,
    ),
);
