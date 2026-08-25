const express = require("express");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const connectDB = require("./config/db");

// ======================================================
// EXPRESS APP
// ======================================================

const app = express();

// ======================================================
// ENVIRONMENT
// ======================================================

const SESSION_SECRET = process.env.SESSION_SECRET;
const MONGO_URI = process.env.MONGO_URI;

if (!SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET is not configured"
  );
}

if (!MONGO_URI) {
  throw new Error(
    "MONGO_URI is not configured"
  );
}

// ======================================================
// BASIC MIDDLEWARE
// ======================================================

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb"
  })
);

app.use(
  express.json({
    limit: "10mb"
  })
);

// ======================================================
// REQUEST LOGGING
// ======================================================

app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} ${req.url}`
  );

  next();
});

// ======================================================
// STATIC FILES
// ======================================================

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

// ======================================================
// VIEW ENGINE
// ======================================================

app.set(
  "view engine",
  "ejs"
);

app.set(
  "views",
  path.join(__dirname, "views")
);

// ======================================================
// SESSION
// ======================================================

app.use(
  session({
    secret: SESSION_SECRET,

    resave: false,

    saveUninitialized: false,

    store: MongoStore.create({
      mongoUrl: MONGO_URI,

      collectionName: "sessions",

      ttl: 24 * 60 * 60
    }),

    cookie: {
      maxAge:
        24 * 60 * 60 * 1000,

      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite: "lax"
    }
  })
);

// --------------------------------------------------
// RATE LIMITING
// --------------------------------------------------

// General application limiter.
// Exclude static files because every page loads
// multiple CSS, JavaScript and image requests.

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 300,

  standardHeaders: true,

  legacyHeaders: false,

  message:
    "Too many requests. Please try again later.",

  skip: (req) => {

    // Static assets
    if (
      req.path.startsWith("/css/") ||
      req.path.startsWith("/js/") ||
      req.path.startsWith("/images/") ||
      req.path.startsWith("/uploads/")
    ) {
      return true;
    }

    // Logout routes should never be blocked.
    if (
      req.path === "/student-logout" ||
      req.path === "/admin-logout" ||
      req.path === "/staff-logout"
    ) {
      return true;
    }

    return false;
  }
});

app.use(
  generalLimiter
);


// ======================================================
// BLOCK COMMON SCANNER REQUESTS
// ======================================================

app.use(
  (req, res, next) => {

    const suspiciousPaths = [
      /\.php$/i,
      /^\/wp-/i,
      /^\/wordpress/i,
      /^\/wp-content/i,
      /^\/wp-admin/i,
      /^\/wp-login/i,
      /^\/xmlrpc\.php/i
    ];

    if (
      suspiciousPaths.some(
        (pattern) =>
          pattern.test(req.path)
      )
    ) {
      console.log(
        `Blocked suspicious request: ${req.method} ${req.path}`
      );

      return res
        .status(404)
        .end();
    }

    next();
  }
);

// ======================================================
// DATABASE
// ======================================================

connectDB();

// ======================================================
// ROUTES
// ======================================================
//
// IMPORTANT:
// We are preparing to split the old page.js.
// Do NOT delete page.js yet.
// We will create each new route file one at a time.
// ======================================================

const publicRoutes = require("./routes/public");
const studentRoutes = require("./routes/student");
const paymentRoutes = require("./routes/payment");
const adminRoutes = require("./routes/admin");
const interviewRoutes = require("./routes/interview");

app.use("/", publicRoutes);
app.use("/", studentRoutes);
app.use("/", paymentRoutes);
app.use("/", adminRoutes);
app.use("/", interviewRoutes);

// ======================================================
// 404 HANDLER
// ======================================================

app.use(
  (req, res) => {

    res.status(404);

    if (
      req.accepts("html")
    ) {
      return res.render(
        "error",
        {
          title:
            "Page Not Found | Legend College",

          message:
            "The page you requested could not be found."
        }
      );
    }

    return res.send(
      "404 - Page Not Found"
    );
  }
);

// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use(
  (err, req, res, next) => {

    console.error(
      "Server error:",
      err
    );

    if (
      res.headersSent
    ) {
      return next(err);
    }

    res.status(500);

    return res.render(
      "error",
      {
        title:
          "Server Error | Legend College",

        message:
          process.env.NODE_ENV ===
            "production"

            ? "Something went wrong. Please try again."

            : err.message ||
            "Something went wrong. Please try again."
      }
    );
  }
);

// ======================================================
// START SERVER
// ======================================================

const PORT =
  process.env.PORT || 5000;

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Server running on port ${PORT}`
    );
  }
);