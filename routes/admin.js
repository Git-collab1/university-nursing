// ========================================================
// routes/admin.js
// ========================================================

const express = require("express");

const Admin = require("../models/Admin");
const Student = require("../models/Student");

const {
  requireAdmin,
  requireStaff
} = require("../middleware/auth");

const sendEmail =
  require("../utils/sendEmail");

const router =
  express.Router();

// ========================================================
// HELPER: ADMIN DASHBOARD STATS
// ========================================================

function buildStats(
  students,
  pendingPayments,
  paidStudents,
  unpaidStudents
) {
  return {
    total: students.length,

    pending: students.filter(
      (student) =>
        student.applicationStatus === "payment_submitted" ||
        student.applicationStatus === "payment_verified" ||
        student.applicationStatus === "interview_pending" ||
        student.applicationStatus === "interview_started" ||
        student.applicationStatus === "interview_completed" ||
        student.applicationStatus === "under_review"
    ).length,

    approved: students.filter(
      (student) =>
        student.applicationStatus === "approved"
    ).length,

    rejected: students.filter(
      (student) =>
        student.applicationStatus === "rejected"
    ).length,

    pendingPayments,
    paidStudents,
    unpaidStudents
  };
}

// ========================================================
// ADMIN LOGIN PAGE
// ========================================================

router.get(
  "/admin-login",
  (req, res) => {

    if (
      req.session &&
      req.session.adminId
    ) {
      return res.redirect(
        "/admin-dashboard"
      );
    }

    return res.render(
      "admin-login",
      {
        title:
          "Admin Login | Legend College",

        error: null
      }
    );
  }
);

// ========================================================
// ADMIN LOGIN
// ========================================================

router.post(
  "/admin-login",
  async (req, res) => {

    try {

      const {
        username,
        password
      } = req.body;

      const admin =
        await Admin.findOne({
          username:
            username
              ? username.trim()
              : ""
        });

      if (
        !admin ||
        !admin.isActive
      ) {

        return res.render(
          "admin-login",
          {
            title:
              "Admin Login | Legend College",

            error:
              "Invalid username or password"
          }
        );
      }

      const isMatch =
        await admin.comparePassword(
          password
        );

      if (!isMatch) {

        return res.render(
          "admin-login",
          {
            title:
              "Admin Login | Legend College",

            error:
              "Invalid username or password"
          }
        );
      }

      if (
        admin.role !== "admin"
      ) {

        return res.render(
          "admin-login",
          {
            title:
              "Admin Login | Legend College",

            error:
              "Access denied. Admin privileges required."
          }
        );
      }

      req.session.adminId =
        admin._id.toString();

      return req.session.save(
        (sessionError) => {

          if (sessionError) {

            console.error(
              "Admin session save error:",
              sessionError
            );

            return res.render(
              "admin-login",
              {
                title:
                  "Admin Login | Legend College",

                error:
                  "Login session could not be created. Please try again."
              }
            );
          }

          console.log(
            "Admin session saved successfully."
          );

          return res.redirect(
            "/admin-dashboard"
          );
        }
      );

    } catch (error) {

      console.error(
        "Admin login error:",
        error
      );

      return res.render(
        "admin-login",
        {
          title:
            "Admin Login | Legend College",

          error:
            "Login failed. Please try again."
        }
      );
    }
  }
);

// ========================================================
// ADMIN DASHBOARD
// ========================================================

router.get(
  "/admin-dashboard",
  requireAdmin,
  async (req, res) => {

    try {

      console.log(
        "=== ADMIN DASHBOARD ==="
      );

      console.log(
        "Session adminId:",
        req.session.adminId
      );

      const admin =
        await Admin.findById(
          req.session.adminId
        );

      if (
        !admin ||
        !admin.isActive ||
        admin.role !== "admin"
      ) {

        req.session.adminId =
          null;

        return res.redirect(
          "/admin-login"
        );
      }

      const students =
        await Student.find().sort({
          createdAt: -1
        });

      const pendingPayments =
        await Student.countDocuments({
          paymentStatus:
            "pending"
        });

      const paidStudents =
        await Student.countDocuments({
          paymentStatus:
            "paid"
        });

      const unpaidStudents =
        await Student.countDocuments({
          paymentStatus:
            "unpaid"
        });

      const stats =
        buildStats(
          students,
          pendingPayments,
          paidStudents,
          unpaidStudents
        );

      return res.render(
        "admin-dashboard",
        {
          title:
            "Admin Dashboard | Legend College",

          admin,

          students,

          stats,

          error: null,

          success: null
        }
      );

    } catch (error) {

      console.error(
        "Admin dashboard error:",
        error
      );

      return res.status(
        500
      ).render(
        "error",
        {
          title:
            "Server Error | Legend College",

          message:
            "Unable to load admin dashboard."
        }
      );
    }
  }
);

// ========================================================
// ADMIN UPDATE APPLICATION STATUS
// ========================================================

router.post(
  "/admin/update-status",
  requireAdmin,
  async (req, res) => {

    try {

      const {
        studentId,
        status
      } = req.body;

      const allowedStatuses = [
        "under_review",
        "approved",
        "rejected"
      ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.redirect(
          "/admin-dashboard"
        );
      }

      const student =
        await Student.findById(
          studentId
        );

      if (!student) {
        return res.redirect(
          "/admin-dashboard"
        );
      }

      student.applicationStatus =
        status;

      await student.save();

      try {

        const statusText =
          status === "approved"
            ? "Approved"
            : status === "rejected"
              ? "Rejected"
              : "Under Review";

        const subject =
          `Application ${statusText} - Legend College of Nursing And Emergency Health Sciences Nnewi`;

        const html = `
          <div style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          ">

            <h2 style="color:#1e3a5f;">
              Application ${statusText}
            </h2>

            <p>
              Dear
              <strong>
                ${student.firstName}
                ${student.lastName}
              </strong>,
            </p>

            <p>
              Your application for the
              <strong>
                ${student.program}
              </strong>
              program is currently:
              <strong>
                ${statusText}
              </strong>.
            </p>

            <p>
              Best regards,<br>
              Legend College of Nursing And
              Emergency Health Sciences Nnewi
            </p>

          </div>
        `;

        await sendEmail(
          student.email,
          subject,
          html
        );

      } catch (emailError) {

        console.error(
          "Status email error:",
          emailError.message
        );
      }

      return res.redirect(
        "/admin-dashboard"
      );

    } catch (error) {

      console.error(
        "Status update error:",
        error
      );

      return res.redirect(
        "/admin-dashboard"
      );
    }
  }
);

// ========================================================
// STAFF LOGIN PAGE
// ========================================================

router.get(
  "/staff-login",
  (req, res) => {

    if (
      req.session &&
      req.session.staffId
    ) {
      return res.redirect(
        "/staff-dashboard"
      );
    }

    return res.render(
      "staff-login",
      {
        title:
          "Staff Login | Legend College",

        error: null
      }
    );
  }
);

// ========================================================
// STAFF LOGIN
// ========================================================

router.post(
  "/staff-login",
  async (req, res) => {

    try {

      const {
        username,
        password
      } = req.body;

      const staff =
        await Admin.findOne({
          username:
            username
              ? username.trim()
              : ""
        });

      if (
        !staff ||
        !staff.isActive
      ) {

        return res.render(
          "staff-login",
          {
            title:
              "Staff Login | Legend College",

            error:
              "Invalid username or password"
          }
        );
      }

      const isMatch =
        await staff.comparePassword(
          password
        );

      if (!isMatch) {

        return res.render(
          "staff-login",
          {
            title:
              "Staff Login | Legend College",

            error:
              "Invalid username or password"
          }
        );
      }

      if (
        staff.role !== "staff"
      ) {

        return res.render(
          "staff-login",
          {
            title:
              "Staff Login | Legend College",

            error:
              "Access denied. Staff credentials required."
          }
        );
      }

      req.session.staffId =
        staff._id.toString();

      return req.session.save(
        (sessionError) => {

          if (sessionError) {

            console.error(
              "Staff session save error:",
              sessionError
            );

            return res.render(
              "staff-login",
              {
                title:
                  "Staff Login | Legend College",

                error:
                  "Login session could not be created. Please try again."
              }
            );
          }

          return res.redirect(
            "/staff-dashboard"
          );
        }
      );

    } catch (error) {

      console.error(
        "Staff login error:",
        error
      );

      return res.render(
        "staff-login",
        {
          title:
            "Staff Login | Legend College",

          error:
            "Login failed. Please try again."
        }
      );
    }
  }
);

// ========================================================
// STAFF DASHBOARD
// ========================================================

router.get(
  "/staff-dashboard",
  requireStaff,
  async (req, res) => {

    try {

      const staff =
        await Admin.findById(
          req.session.staffId
        );

      if (
        !staff ||
        !staff.isActive ||
        staff.role !== "staff"
      ) {

        return req.session.destroy(
          () =>
            res.redirect(
              "/staff-login"
            )
        );
      }

      const students =
        await Student.find().sort({
          createdAt: -1
        });

      // --------------------------------------------------
      // CALCULATE STAFF DASHBOARD STATISTICS
      // --------------------------------------------------

      const stats = {
        total:
          students.length,

        pending:
          students.filter(
            (student) =>
              student.applicationStatus ===
              "payment_submitted" ||
              student.applicationStatus ===
              "payment_verified" ||
              student.applicationStatus ===
              "interview_pending" ||
              student.applicationStatus ===
              "interview_started" ||
              student.applicationStatus ===
              "interview_completed" ||
              student.applicationStatus ===
              "under_review"
          ).length,

        approved:
          students.filter(
            (student) =>
              student.applicationStatus ===
              "approved"
          ).length,

        rejected:
          students.filter(
            (student) =>
              student.applicationStatus ===
              "rejected"
          ).length
      };

      console.log(
        "=== STAFF DASHBOARD ==="
      );

      console.log(
        "Staff:",
        staff._id
      );

      console.log(
        "Stats:",
        stats
      );

      return res.render(
        "staff-dashboard",
        {
          title:
            "Staff Dashboard | Legend College",

          staff,

          students,

          stats,

          error: null,

          success: null
        }
      );

    } catch (error) {

      console.error(
        "Staff dashboard error:",
        error
      );

      return res.status(
        500
      ).render(
        "error",
        {
          title:
            "Server Error | Legend College",

          message:
            "Unable to load staff dashboard."
        }
      );
    }
  }
);

// ========================================================
// ADMIN LOGOUT
// ========================================================

router.get(
  "/admin-logout",
  (req, res) => {

    req.session.destroy(
      (error) => {

        if (error) {
          console.error(
            "Admin logout error:",
            error
          );

          return res.redirect(
            "/admin-login"
          );
        }

        res.clearCookie(
          "connect.sid"
        );

        return res.redirect(
          "/admin-login"
        );
      }
    );
  }
);

// ========================================================
// STAFF LOGOUT
// ========================================================

router.get(
  "/staff-logout",
  (req, res) => {

    req.session.destroy(
      (error) => {

        if (error) {
          console.error(
            "Staff logout error:",
            error
          );

          return res.redirect(
            "/staff-login"
          );
        }

        res.clearCookie(
          "connect.sid"
        );

        return res.redirect(
          "/staff-login"
        );
      }
    );
  }
);

// ========================================================
// EXPORT
// ========================================================

module.exports = router;