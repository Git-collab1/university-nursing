const express = require("express");
const path = require("path");
const session = require("express-session");
require("dotenv").config();
const connectDB = require("./config/db");

const app = express();

// ----------------- MIDDLEWARE -----------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Set EJS as view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || "legend-college-secret-key-2024",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// ----------------- DATABASE -----------------
connectDB();

// ----------------- ROUTES -----------------
const pageRoutes = require("./routes/page");

app.use("/", pageRoutes);

// ----------------- ERROR HANDLING -----------------
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).render("error", {
    title: "Server Error | Legend College",
    message: err.message || "Something went wrong. Please try again."
  });
});

// ----------------- START SERVER -----------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
