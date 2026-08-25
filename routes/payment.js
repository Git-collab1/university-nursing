// ========================================================
// routes/payment.js
// ========================================================

const express = require("express");
const multer = require("multer");

const Student = require("../models/Student");
const Interview = require("../models/Interview");

const sendEmail = require("../utils/sendEmail");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

const {
  requireStudent,
  requireAdmin
} = require("../middleware/auth");

const router = express.Router();

const PAYMENT_AMOUNT = 27500;

// ========================================================
// MULTER
// ========================================================

const storage = multer.memoryStorage();

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    console.log("Multer received file:", {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype
    });

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          "Invalid file type. Only JPG, JPEG, PNG and PDF files are allowed."
        )
      );
    }

    return cb(null, true);
  }
});

// ========================================================
// GET PAYMENT PAGE
// ========================================================

router.get(
  "/payment",
  requireStudent,
  async (req, res) => {
    try {
      const student = await Student.findById(
        req.session.studentId
      );

      if (!student) {
        return req.session.destroy(() => {
          res.redirect("/student-login");
        });
      }

      if (!student.firstName || !student.program) {
        return res.redirect("/student-form");
      }

      if (student.paymentStatus === "paid") {
        return res.redirect("/student-dashboard");
      }

      return res.render("payment", {
        title: "Payment | Legend College",
        student,
        error: null,
        success: null
      });
    } catch (error) {
      console.error("Payment page error:", error);

      return res.status(500).render("error", {
        title: "Server Error | Legend College",
        message: "Unable to load the payment page."
      });
    }
  }
);

// ========================================================
// PROCESS PAYMENT
// ========================================================

router.post(
  "/process-payment",
  requireStudent,
  upload.single("paymentReceipt"),
  async (req, res) => {
    try {
      console.log("=== PAYMENT SUBMISSION STARTED ===");

      const {
        transactionId,
        bankName,
        paymentDate
      } = req.body;

      console.log("Payment body:", {
        transactionId,
        bankName,
        paymentDate
      });

      console.log(
        "Payment file:",
        req.file
          ? {
              originalname: req.file.originalname,
              mimetype: req.file.mimetype,
              size: req.file.size
            }
          : "No file"
      );

      const student = await Student.findById(
        req.session.studentId
      );

      if (!student) {
        return req.session.destroy(() => {
          res.redirect("/student-login");
        });
      }

      if (!student.firstName || !student.program) {
        return res.redirect("/student-form");
      }

      if (student.paymentStatus === "paid") {
        return res.redirect("/student-dashboard");
      }

      if (!transactionId || !bankName) {
        return res.render("payment", {
          title: "Payment | Legend College",
          student,
          error: "Please fill in all required payment fields.",
          success: null
        });
      }

      if (!req.file) {
        return res.render("payment", {
          title: "Payment | Legend College",
          student,
          error: "Please upload your payment receipt before submitting.",
          success: null
        });
      }

      // --------------------------------------------------
      // PAYMENT INFORMATION
      // --------------------------------------------------

      student.paymentAmount = PAYMENT_AMOUNT;
      student.paymentStatus = "pending";
      student.paymentReference = transactionId.trim();
      student.paymentDate = paymentDate
        ? new Date(paymentDate)
        : new Date();

      student.bankUsed = bankName;

      // --------------------------------------------------
      // CLOUDINARY
      // --------------------------------------------------

      console.log(
        "Uploading payment receipt to Cloudinary..."
      );

      const uploadResult = await uploadToCloudinary(
        req.file.buffer,
        "legend-college/payment-receipts",
        "auto"
      );

      student.paymentReceipt =
        uploadResult.secure_url;

      console.log(
        "Payment receipt uploaded successfully:",
        uploadResult.secure_url
      );

      // --------------------------------------------------
      // APPLICATION STATUS
      // --------------------------------------------------

      student.applicationStatus =
        "payment_submitted";

      await student.save();

      console.log(
        "Student payment submission saved."
      );

      const applicationId =
        "LCN-" +
        student._id
          .toString()
          .slice(-8)
          .toUpperCase();

      // --------------------------------------------------
      // STUDENT EMAIL
      // --------------------------------------------------

      try {
        const studentSubject =
          "Application Received - Legend College of Nursing";

        const studentHtml = [
          "<div style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;\">",
          "<h2 style=\"color:#1e3a5f;\">Application Received!</h2>",
          "<p>Dear <strong>",
          student.firstName || "Student",
          " ",
          student.lastName || "",
          "</strong>,</p>",
          "<p>We have received your application for the <strong>",
          student.program,
          "</strong> program.</p>",
          "<p>Your application ID is <strong>",
          applicationId,
          "</strong>.</p>",
          "<p>Your application fee together with the screening fee of <strong>₦27,500</strong> has been submitted and is pending verification.</p>",
          "<p>Our admissions team will review your payment and application.</p>",
          "<p>Best regards,<br>Legend College of Nursing And Emergency Health Sciences Nnewi</p>",
          "</div>"
        ].join("");

        await sendEmail(
          student.email,
          studentSubject,
          studentHtml
        );

        console.log(
          "Student confirmation email sent."
        );
      } catch (emailError) {
        console.error(
          "Student confirmation email error:",
          emailError.message
        );
      }

      // --------------------------------------------------
      // ADMIN EMAIL
      // --------------------------------------------------

      try {
        const adminSubject =
          "New Application - " +
          student.firstName +
          " " +
          student.lastName;

        const adminHtml = [
          "<div style=\"font-family:Arial,sans-serif;max-width:650px;margin:0 auto;padding:20px;\">",
          "<h2 style=\"color:#1e3a5f;\">New Application Received</h2>",
          "<p><strong>Name:</strong> ",
          student.firstName || "",
          " ",
          student.lastName || "",
          "</p>",
          "<p><strong>Email:</strong> ",
          student.email || "N/A",
          "</p>",
          "<p><strong>Phone:</strong> ",
          student.phone || "N/A",
          "</p>",
          "<p><strong>Program:</strong> ",
          student.program || "N/A",
          "</p>",
          "<p><strong>Academic Background:</strong> ",
          student.academicBackground || "N/A",
          "</p>",
          "<p><strong>Payment Reference:</strong> ",
          transactionId,
          "</p>",
          "<p><strong>Amount:</strong> ₦27,500</p>",
          "</div>"
        ].join("");

        await sendEmail(
          "legendcollege25@gmail.com",
          adminSubject,
          adminHtml
        );

        console.log(
          "Admin notification email sent."
        );
      } catch (emailError) {
        console.error(
          "Admin notification email error:",
          emailError.message
        );
      }

      console.log(
        "=== PAYMENT SUBMISSION COMPLETED ==="
      );

      return res.render("success", {
        title: "Application Submitted | Legend College",
        email: student.email,
        applicationId
      });

    } catch (error) {
      console.error(
        "Payment processing error:",
        error
      );

      try {
        const student = await Student.findById(
          req.session.studentId
        );

        return res.render("payment", {
          title: "Payment | Legend College",
          student,
          error:
            "Payment processing failed. Please try again.",
          success: null
        });
      } catch (renderError) {
        console.error(
          "Payment error page failed:",
          renderError
        );

        return res.redirect("/payment");
      }
    }
  }
);

// ========================================================
// ADMIN: PENDING PAYMENTS
// ========================================================

router.get(
  "/admin/payments",
  requireAdmin,
  async (req, res) => {
    try {
      const students =
        await Student.find({
          paymentStatus: "pending"
        }).sort({
          createdAt: -1
        });

      return res.render(
        "admin-payments",
        {
          title:
            "Pending Payments | Legend College",

          students,

          error: null,

          success: null
        }
      );
    } catch (error) {
      console.error(
        "Admin payments page error:",
        error
      );

      return res.status(500).render(
        "error",
        {
          title:
            "Server Error | Legend College",

          message:
            "Unable to load pending payments."
        }
      );
    }
  }
);

// ========================================================
// ADMIN: APPROVE PAYMENT
// CREATE OR REPAIR INTERVIEW
// ========================================================

router.post(
  "/admin/payments/approve",
  requireAdmin,
  async (req, res) => {
    try {
      const {
        studentId
      } = req.body;

      console.log(
        "=== PAYMENT APPROVAL STARTED ==="
      );

      console.log(
        "Student ID:",
        studentId
      );

      if (!studentId) {
        return res.redirect(
          "/admin/payments"
        );
      }

      // --------------------------------------------------
      // FIND STUDENT
      // --------------------------------------------------

      const student =
        await Student.findById(
          studentId
        );

      if (!student) {
        console.log(
          "Student not found."
        );

        return res.redirect(
          "/admin/payments"
        );
      }

      console.log(
        "Student found:",
        student._id
      );

      console.log(
        "Academic background:",
        student.academicBackground
      );

      // --------------------------------------------------
      // VERIFY PAYMENT
      // --------------------------------------------------

      student.paymentStatus =
        "paid";

      student.paymentAmount =
        PAYMENT_AMOUNT;

      student.paymentRejectionReason =
        "";

      // --------------------------------------------------
      // DETERMINE INTERVIEW TYPE
      // --------------------------------------------------

      const isScience =
        student.academicBackground ===
        "science";

      const interviewType =
        isScience
          ? "online"
          : "physical";

      const interviewSubjects =
        isScience
          ? [
              "English",
              "Mathematics",
              "Biology",
              "Physics",
              "Chemistry"
            ]
          : [];

      const subjects =
        isScience
          ? [
              {
                name: "English",
                durationMinutes: 40
              },
              {
                name: "Mathematics",
                durationMinutes: 40
              },
              {
                name: "Biology",
                durationMinutes: 30
              },
              {
                name: "Physics",
                durationMinutes: 30
              },
              {
                name: "Chemistry",
                durationMinutes: 30
              }
            ]
          : [];

      console.log(
        "Interview type:",
        interviewType
      );

      console.log(
        "Interview subjects:",
        interviewSubjects
      );

      // --------------------------------------------------
      // UPDATE STUDENT
      // --------------------------------------------------

      student.interviewType =
        interviewType;

      student.interviewSubjects =
        interviewSubjects;

      student.interviewEligible =
        true;

      student.interviewStatus =
        "scheduled";

      student.applicationStatus =
        "interview_pending";

      await student.save();

      // --------------------------------------------------
      // FIND EXISTING INTERVIEW
      // --------------------------------------------------

      let interview =
        await Interview.findOne({
          student: student._id
        });

      // --------------------------------------------------
      // CREATE INTERVIEW
      // --------------------------------------------------

      if (!interview) {
        console.log(
          "No interview found. Creating one..."
        );

        interview =
          new Interview({
            student:
              student._id,

            interviewType:
              interviewType,

            subjects:
              subjects,

            currentSubjectIndex:
              0,

            currentQuestionIndex:
              0,

            totalScore:
              0,

            totalPossibleScore:
              0,

            percentage:
              0,

            status:
              "scheduled",

            scheduledAt:
              null,

            scheduledEndAt:
              null,

            startedAt:
              null,

            completedAt:
              null,

            scheduledBy:
              req.session.adminId,

            notes:
              interviewType ===
              "physical"
                ? "Student must attend physical interview at the college."
                : ""
          });

        await interview.save();

        console.log(
          "Interview created:",
          interview._id
        );

      } else {
        // ------------------------------------------------
        // REPAIR EXISTING INTERVIEW
        // ------------------------------------------------

        console.log(
          "Existing interview found:",
          interview._id
        );

        interview.interviewType =
          interviewType;

        interview.subjects =
          subjects;

        if (
          interview.status !==
          "completed"
        ) {
          interview.status =
            "scheduled";

          interview.currentSubjectIndex =
            0;

          interview.currentQuestionIndex =
            0;

          interview.startedAt =
            null;

          interview.completedAt =
            null;
        }

        interview.scheduledBy =
          req.session.adminId;

        interview.notes =
          interviewType ===
          "physical"
            ? "Student must attend physical interview at the college."
            : "";

        await interview.save();

        console.log(
          "Existing interview repaired:",
          interview._id
        );
      }

      // --------------------------------------------------
      // LINK INTERVIEW TO STUDENT
      // --------------------------------------------------

      student.interviewId =
        interview._id;

      await student.save();

      console.log(
        "Student interviewId:",
        student.interviewId
      );

      console.log(
        "Interview type:",
        interview.interviewType
      );

      console.log(
        "Interview subjects:",
        interview.subjects.map(
          (subject) => ({
            name:
              subject.name,

            durationMinutes:
              subject.durationMinutes
          })
        )
      );

      console.log(
        "=== PAYMENT APPROVAL COMPLETED ==="
      );

      return res.redirect(
        "/admin/payments"
      );

    } catch (error) {
      console.error(
        "=== PAYMENT APPROVAL ERROR ==="
      );

      console.error(
        error
      );

      return res.redirect(
        "/admin/payments"
      );
    }
  }
);

// ========================================================
// ADMIN: REJECT PAYMENT
// ========================================================

router.post(
  "/admin/payments/reject",
  requireAdmin,
  async (req, res) => {
    try {
      const {
        studentId,
        reason
      } = req.body;

      const student =
        await Student.findById(
          studentId
        );

      if (!student) {
        return res.redirect(
          "/admin/payments"
        );
      }

      student.paymentStatus =
        "unpaid";

      student.paymentRejectionReason =
        reason ||
        "Payment rejected by admin";

      student.applicationStatus =
        "form_completed";

      await student.save();

      return res.redirect(
        "/admin/payments"
      );

    } catch (error) {
      console.error(
        "Payment rejection error:",
        error
      );

      return res.redirect(
        "/admin/payments"
      );
    }
  }
);

// ========================================================
// EXPORT
// ========================================================

module.exports = router;