// middleware/auth.js

// ========================================================
// STUDENT AUTHENTICATION
// ========================================================

const requireStudent = (req, res, next) => {
  if (!req.session || !req.session.studentId) {
    return res.redirect("/student-login");
  }

  next();
};

// ========================================================
// ADMIN AUTHENTICATION
// ========================================================

const requireAdmin = (req, res, next) => {
  console.log(
    "requireAdmin - adminId:",
    req.session?.adminId
  );

  if (!req.session || !req.session.adminId) {
    return res.redirect("/admin-login");
  }

  next();
};

// ========================================================
// STAFF AUTHENTICATION
// ========================================================

const requireStaff = (req, res, next) => {
  if (!req.session || !req.session.staffId) {
    return res.redirect("/staff-login");
  }

  next();
};

// ========================================================
// EXPORT
// ========================================================

module.exports = {
  requireStudent,
  requireAdmin,
  requireStaff
};