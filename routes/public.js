const express = require("express");

const router = express.Router();

// ========================================================
// PUBLIC WEBSITE ROUTES
// ========================================================

router.get("/", (req, res) => {
  res.render("index", {
    title: "Legend College"
  });
});

router.get("/admission", (req, res) => {
  res.render("admission", {
    title: "Admission | Legend College"
  });
});

router.get("/about", (req, res) => {
  res.render("about", {
    title: "About | Legend College"
  });
});

router.get("/contact", (req, res) => {
  res.render("contact", {
    title: "Contact | Legend College"
  });
});

router.get("/history", (req, res) => {
  res.render("history", {
    title: "History | Legend College"
  });
});

router.get("/mission", (req, res) => {
  res.render("mission", {
    title: "Mission | Legend College"
  });
});

router.get("/programs", (req, res) => {
  res.render("programs", {
    title: "Programs | Legend College"
  });
});

// ========================================================
// EXPORT
// ========================================================

module.exports = router;