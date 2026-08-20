// routes/page.js

const express = require("express");
const router = express.Router();

const multer = require("multer");
const path = require("path");

const Contact = require("../models/Contact");
const Student = require("../models/Student");
const Admin = require("../models/Admin");

const sendEmail = require("../utils/sendEmail");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

// ========================================================
// MULTER CONFIGURATION
// ========================================================

// Store uploaded files in memory temporarily.
// Files are then uploaded directly to Cloudinary.
const storage = multer.memoryStorage();

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },

  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;

    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }

    return cb(null, false);
  }
});

// ========================================================
// ASYNC ERROR HANDLER
// ========================================================

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ========================================================
// AUTHENTICATION MIDDLEWARE
// ========================================================

const requireAuth = (req, res, next) => {
  if (
    !req.session.studentId &&
    !req.session.adminId &&
    !req.session.staffId
  ) {
    return res.redirect("/admission");
  }

  next();
};

const requireStudent = (req, res, next) => {
  if (!req.session.studentId) {
    return res.redirect("/student-login");
  }

  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.adminId) {
    return res.redirect("/admin-login");
  }

  next();
};

const requireStaff = (req, res, next) => {
  if (!req.session.staffId) {
    return res.redirect("/staff-login");
  }

  next();
};

// ========================================================
// GET ROUTES
// ========================================================

// -------------------------
// Public Pages
// -------------------------

router.get("/", (req, res) => {
  res.render("index", {
    title: "Legend College of Nursing Science | Home",
    messages: {}
  });
});

router.get("/about", (req, res) => {
  res.render("about", {
    title: "About Us | Legend College of Nursing"
  });
});

router.get("/history", (req, res) => {
  res.render("history", {
    title: "Our History | Legend College of Nursing"
  });
});

router.get("/mission", (req, res) => {
  res.render("mission", {
    title: "Mission & Vision | Legend College of Nursing"
  });
});

router.get("/programs", (req, res) => {
  res.render("programs", {
    title: "Programs | Legend College of Nursing"
  });
});

router.get("/contact", (req, res) => {
  res.render("contact", {
    title: "Contact Us | Legend College of Nursing"
  });
});

router.get("/admission", (req, res) => {
  res.render("admission", {
    title: "Admission | Legend College of Nursing"
  });
});

// ========================================================
// STUDENT GET ROUTES
// ========================================================

router.get("/student-login", (req, res) => {
  if (req.session.studentId) {
    return res.redirect("/student-dashboard");
  }

  res.render("student-login", {
    title: "Student Login | Legend College",
    error: null
  });
});

router.get("/student-register", (req, res) => {
  if (req.session.studentId) {
    return res.redirect("/student-dashboard");
  }

  res.render("student-register", {
    title: "Student Registration | Legend College",
    error: null
  });
});

router.get(
  "/student-dashboard",
  requireStudent,
  asyncHandler(async (req, res) => {
    const student = await Student.findById(
      req.session.studentId
    );

    if (!student) {
      req.session.destroy();
      return res.redirect("/student-login");
    }

    res.render("student-dashboard", {
      title: "Student Dashboard | Legend College",
      student,
      error: null
    });
  })
);

router.get(
  "/student-form",
  requireStudent,
  asyncHandler(async (req, res) => {
    const student = await Student.findById(
      req.session.studentId
    );

    if (!student) {
      req.session.destroy();
      return res.redirect("/student-login");
    }

    res.render("student-form", {
      title: "Application Form | Legend College",
      student,
      error: null
    });
  })
);

router.get(
  "/payment",
  requireStudent,
  asyncHandler(async (req, res) => {
    const student = await Student.findById(
      req.session.studentId
    );

    if (!student) {
      req.session.destroy();
      return res.redirect("/student-login");
    }

    if (!student.firstName || !student.program) {
      return res.redirect("/student-form");
    }

    if (student.paymentStatus === "paid") {
      return res.redirect("/student-dashboard");
    }

    res.render("payment", {
      title: "Payment | Legend College",
      student,
      error: null
    });
  })
);

// ========================================================
// ADMIN GET ROUTES
// ========================================================

router.get("/admin-login", (req, res) => {
  if (req.session.adminId) {
    return res.redirect("/admin-dashboard");
  }

  res.render("admin-login", {
    title: "Admin Login | Legend College",
    error: null
  });
});

router.get(
  "/admin-dashboard",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const admin = await Admin.findById(
      req.session.adminId
    );

    if (!admin || admin.role !== "admin") {
      req.session.destroy();
      return res.redirect("/admin-login");
    }

    const students = await Student.find().sort({
      createdAt: -1
    });

    const pendingPayments =
      await Student.countDocuments({
        paymentStatus: "pending"
      });

    const paidStudents =
      await Student.countDocuments({
        paymentStatus: "paid"
      });

    const unpaidStudents =
      await Student.countDocuments({
        paymentStatus: "unpaid"
      });

    const stats = {
      total: students.length,

      pending: students.filter(
        (student) =>
          student.applicationStatus === "submitted" ||
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

    res.render("admin-dashboard", {
      title: "Admin Dashboard | Legend College",
      admin,
      students,
      stats,
      error: null,
      success: null
    });
  })
);

// ========================================================
// ADMIN PAYMENT ROUTES
// ========================================================

router.get(
  "/admin/payments",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const students = await Student.find({
      paymentStatus: "pending"
    }).sort({
      createdAt: -1
    });

    res.render("admin-payments", {
      title: "Pending Payments | Legend College",
      students
    });
  })
);

router.post(
  "/admin/payments/approve",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { studentId } = req.body;

    const student = await Student.findById(studentId);

    if (!student) {
      return res.redirect("/admin/payments");
    }

    student.paymentStatus = "paid";

    await student.save();

    res.redirect("/admin/payments");
  })
);

router.post(
  "/admin/payments/reject",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { studentId, reason } = req.body;

    const student = await Student.findById(studentId);

    if (!student) {
      return res.redirect("/admin/payments");
    }

    student.paymentStatus = "unpaid";

    student.paymentRejectionReason =
      reason || "Payment rejected by admin";

    await student.save();

    res.redirect("/admin/payments");
  })
);

// ========================================================
// STAFF GET ROUTES
// ========================================================

router.get("/staff-login", (req, res) => {
  if (req.session.staffId) {
    return res.redirect("/staff-dashboard");
  }

  res.render("staff-login", {
    title: "Staff Login | Legend College",
    error: null
  });
});

router.get(
  "/staff-dashboard",
  requireStaff,
  asyncHandler(async (req, res) => {
    const staff = await Admin.findById(
      req.session.staffId
    );

    if (!staff || staff.role === "admin") {
      req.session.destroy();
      return res.redirect("/staff-login");
    }

    const students = await Student.find().sort({
      createdAt: -1
    });

    const stats = {
      total: students.length,

      pending: students.filter(
        (student) =>
          student.applicationStatus === "submitted" ||
          student.applicationStatus === "under_review"
      ).length,

      approved: students.filter(
        (student) =>
          student.applicationStatus === "approved"
      ).length,

      rejected: students.filter(
        (student) =>
          student.applicationStatus === "rejected"
      ).length
    };

    res.render("staff-dashboard", {
      title: "Staff Dashboard | Legend College",
      staff,
      students,
      stats,
      error: null,
      success: null
    });
  })
);

// ========================================================
// LOGOUT ROUTES
// ========================================================

router.get("/student-logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admission");
  });
});

router.get("/admin-logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin-login");
  });
});

router.get("/staff-logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/staff-login");
  });
});

// ========================================================
// CONTACT FORM
// ========================================================

router.post(
  "/contact",
  asyncHandler(async (req, res) => {
    const {
      name,
      email,
      phone,
      message
    } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide name, email, and message"
      });
    }

    const contact = new Contact({
      name,
      email,
      phone,
      message
    });

    await contact.save();

    try {
      const subject =
        "Thank you for contacting Legend College of Nursing And Emergency Health Sciences Nnewi";

      const html = `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        ">

          <h2 style="color: #1e3a5f;">
            Thank you for contacting us!
          </h2>

          <p>
            Dear <strong>${name}</strong>,
          </p>

          <p>
            We have received your message and will get
            back to you within 24-48 hours.
          </p>

          <p>
            Here's a copy of your message:
          </p>

          <div style="
            background-color: #f5f5f5;
            padding: 15px;
            border-left: 4px solid #1e3a5f;
            margin: 15px 0;
          ">

            <p>
              <strong>Message:</strong>
              ${message}
            </p>

          </div>

          <p>
            Best regards,<br>
            Legend College of Nursing Sciences
          </p>

        </div>
      `;

      await sendEmail(
        email,
        subject,
        html
      );

    } catch (emailError) {
      console.error(
        "Email sending failed:",
        emailError.message
      );
    }

    res.status(200).json({
      success: true,
      message:
        "Thank you for your message! We'll get back to you soon."
    });
  })
);

// ========================================================
// STUDENT REGISTRATION
// ========================================================

router.post(
  "/student-register",
  asyncHandler(async (req, res) => {
    try {
      const {
        email,
        password,
        confirmPassword
      } = req.body;

      if (
        !email ||
        !password ||
        !confirmPassword
      ) {
        return res.render("student-register", {
          title:
            "Student Registration | Legend College",
          error:
            "Please fill in all required fields"
        });
      }

      if (password !== confirmPassword) {
        return res.render("student-register", {
          title:
            "Student Registration | Legend College",
          error:
            "Passwords do not match"
        });
      }

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return res.render("student-register", {
          title:
            "Student Registration | Legend College",
          error:
            "Please enter a valid email address"
        });
      }

      if (password.length < 6) {
        return res.render("student-register", {
          title:
            "Student Registration | Legend College",
          error:
            "Password must be at least 6 characters long"
        });
      }

      const existingStudent =
        await Student.findOne({ email });

      if (existingStudent) {
        return res.render("student-register", {
          title:
            "Student Registration | Legend College",
          error:
            "Email already registered"
        });
      }

      const student = new Student({
        email,
        password,

        firstName: "",
        lastName: "",
        phone: "",

        dateOfBirth: null,
        gender: "",

        address: {
          street: "",
          city: "",
          state: "",
          country: "Nigeria"
        },

        guardianName: "",
        guardianPhone: "",
        guardianRelationship: "",

        previousSchool: "",
        oLevelResult: "",
        program: "",

        admissionNumber:
          "LCN-" +
          Date.now() +
          "-" +
          Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase(),

        paymentStatus: "pending",
        applicationStatus: "not_started"
      });

      await student.save();

      req.session.studentId = student._id;

      res.redirect("/student-form");

    } catch (error) {
      console.error(
        "Registration error:",
        error
      );

      res.render("student-register", {
        title:
          "Student Registration | Legend College",
        error:
          "Registration failed: " +
          error.message
      });
    }
  })
);

// ========================================================
// STUDENT LOGIN
// ========================================================

router.post(
  "/student-login",
  asyncHandler(async (req, res) => {
    try {
      const {
        email,
        password
      } = req.body;

      const student =
        await Student.findOne({ email });

      if (!student) {
        return res.render("student-login", {
          title:
            "Student Login | Legend College",
          error:
            "Invalid email or password"
        });
      }

      const isMatch =
        await student.comparePassword(password);

      if (!isMatch) {
        return res.render("student-login", {
          title:
            "Student Login | Legend College",
          error:
            "Invalid email or password"
        });
      }

      req.session.studentId =
        student._id;

      res.redirect(
        "/student-dashboard"
      );

    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      res.render("student-login", {
        title:
          "Student Login | Legend College",
        error:
          "Login failed. Please try again."
      });
    }
  })
);

// ========================================================
// STUDENT APPLICATION FORM
// ========================================================

router.post(
  "/student-submit-form",

  requireStudent,

  upload.fields([
    {
      name: "passportPhoto",
      maxCount: 1
    },
    {
      name: "waecResult",
      maxCount: 1
    },
    {
      name: "necoResult",
      maxCount: 1
    }
  ]),

  asyncHandler(async (req, res) => {
    try {
      console.log(
        "=== Form submission started ==="
      );

      console.log(
        "Session studentId:",
        req.session.studentId
      );

      console.log(
        "Request body keys:",
        Object.keys(req.body)
      );

      console.log(
        "Request files:",
        req.files
          ? Object.keys(req.files)
          : "none"
      );

      const {
        receiptNo,
        applicationDate,

        title,
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth,
        gender,

        maritalStatus,
        maidenName,
        contactAddress,

        stateOfOrigin,
        nationality,
        localGovernmentArea,

        extraCurricularActivities,
        medicalHistory,
        genotype,

        fatherFullName,
        fatherContactAddress,
        fatherPhone,
        fatherEmail,

        motherFullName,
        motherMaidenName,
        motherContactAddress,
        motherPhone,
        motherEmail,

        guardianName,
        guardianPhone,
        guardianRelationship,

        program,
        programTransfer,

        examinationTaken,
        otherExamination,

        credentialsEnclosed,
        awaitingResult,

        introductionSource,
        otherSource,

        declarationName,
        declarationDate,
        declaration,

        address,
        previousSchool,
        oLevelResult
      } = req.body;

      const student =
        await Student.findById(
          req.session.studentId
        );

      if (!student) {
        console.log(
          "Student not found."
        );

        return res.redirect(
          "/student-login"
        );
      }

      console.log(
        "Student found:",
        student._id
      );

      // ------------------------------------------------
      // APPLICATION DETAILS
      // ------------------------------------------------

      student.receiptNo =
        receiptNo || "";

      student.applicationDate =
        applicationDate
          ? new Date(applicationDate)
          : new Date();

      // ------------------------------------------------
      // PASSPORT PHOTO → CLOUDINARY
      // ------------------------------------------------

      if (
        req.files?.passportPhoto?.[0]
      ) {
        console.log(
          "Uploading passport photo to Cloudinary..."
        );

        const result =
          await uploadToCloudinary(
            req.files.passportPhoto[0]
              .buffer,

            "legend-college/passports",

            "image"
          );

        student.passportPhoto =
          result.secure_url;

        console.log(
          "Passport uploaded successfully."
        );
      }

      // ------------------------------------------------
      // WAEC RESULT → CLOUDINARY
      // ------------------------------------------------

      if (
        req.files?.waecResult?.[0]
      ) {
        console.log(
          "Uploading WAEC result to Cloudinary..."
        );

        const result =
          await uploadToCloudinary(
            req.files.waecResult[0]
              .buffer,

            "legend-college/results",

            "auto"
          );

        student.waecResult =
          result.secure_url;

        console.log(
          "WAEC result uploaded successfully."
        );
      }

      // ------------------------------------------------
      // NECO RESULT → CLOUDINARY
      // ------------------------------------------------

      if (
        req.files?.necoResult?.[0]
      ) {
        console.log(
          "Uploading NECO result to Cloudinary..."
        );

        const result =
          await uploadToCloudinary(
            req.files.necoResult[0]
              .buffer,

            "legend-college/results",

            "auto"
          );

        student.necoResult =
          result.secure_url;

        console.log(
          "NECO result uploaded successfully."
        );
      }

      // ------------------------------------------------
      // PERSONAL INFORMATION
      // ------------------------------------------------

      student.title =
        title || "";

      student.firstName =
        firstName || "";

      student.lastName =
        lastName || "";

      student.email =
        email || student.email;

      student.phone =
        phone || "";

      student.dateOfBirth =
        dateOfBirth
          ? new Date(dateOfBirth)
          : null;

      student.gender =
        gender || "";

      student.maritalStatus =
        maritalStatus || "";

      student.maidenName =
        maidenName || "";

      student.contactAddress =
        contactAddress || "";

      // ------------------------------------------------
      // LOCATION
      // ------------------------------------------------

      student.stateOfOrigin =
        stateOfOrigin || "";

      student.nationality =
        nationality || "";

      student.localGovernmentArea =
        localGovernmentArea || "";

      // ------------------------------------------------
      // ADDRESS
      // ------------------------------------------------

      if (address) {
        student.address = {
          street:
            address.street || "",

          city:
            address.city || "",

          state:
            address.state || "",

          country:
            address.country || ""
        };
      }

      // ------------------------------------------------
      // EXTRA CURRICULAR / MEDICAL
      // ------------------------------------------------

      student.extraCurricularActivities =
        extraCurricularActivities || "";

      student.medicalHistory =
        medicalHistory || "";

      student.genotype =
        genotype || "";

      // ------------------------------------------------
      // FATHER INFORMATION
      // ------------------------------------------------

      student.fatherFullName =
        fatherFullName || "";

      student.fatherContactAddress =
        fatherContactAddress || "";

      student.fatherPhone =
        fatherPhone || "";

      student.fatherEmail =
        fatherEmail || "";

      // ------------------------------------------------
      // MOTHER INFORMATION
      // ------------------------------------------------

      student.motherFullName =
        motherFullName || "";

      student.motherMaidenName =
        motherMaidenName || "";

      student.motherContactAddress =
        motherContactAddress || "";

      student.motherPhone =
        motherPhone || "";

      student.motherEmail =
        motherEmail || "";

      // ------------------------------------------------
      // GUARDIAN
      // ------------------------------------------------

      student.guardianName =
        guardianName || "";

      student.guardianPhone =
        guardianPhone || "";

      student.guardianRelationship =
        guardianRelationship || "";

      // ------------------------------------------------
      // PROGRAM
      // ------------------------------------------------

      student.program =
        program || "";

      student.programTransfer =
        programTransfer || "";

      // ------------------------------------------------
      // EDUCATION
      // ------------------------------------------------

      student.examinationTaken =
        examinationTaken || "";

      student.otherExamination =
        otherExamination || "";

      student.credentialsEnclosed =
        credentialsEnclosed === "true";

      student.awaitingResult =
        awaitingResult === "true";

      student.previousSchool =
        previousSchool || "";

      student.oLevelResult =
        oLevelResult || "";

      // ------------------------------------------------
      // INTRODUCTION
      // ------------------------------------------------

      student.introductionSource =
        introductionSource || "";

      student.otherSource =
        otherSource || "";

      // ------------------------------------------------
      // DECLARATION
      // ------------------------------------------------

      student.declaration =
        declaration === "true";

      student.declarationDate =
        declarationDate
          ? new Date(declarationDate)
          : null;

      // ------------------------------------------------
      // APPLICATION STATUS
      // ------------------------------------------------

      student.applicationStatus =
        "form_completed";

      console.log(
        "Saving student..."
      );

      await student.save();

      console.log(
        "Student saved successfully."
      );

      res.redirect("/payment");

    } catch (error) {
      console.error(
        "=== Form submission error ==="
      );

      console.error(
        "Error:",
        error
      );

      let errorMessage =
        "Failed to save form. Please try again.";

      if (error.code === 11000) {
        errorMessage =
          "This email is already registered. Please use a different email.";
      }

      else if (
        error.name === "ValidationError"
      ) {
        const validationErrors = [];

        for (
          const [field, err]
          of Object.entries(error.errors || {})
        ) {
          validationErrors.push(
            `${field}: ${err.message}`
          );
        }

        errorMessage =
          "Validation error: " +
          validationErrors.join("; ");
      }

      else if (error.message) {
        errorMessage =
          error.message;
      }

      console.error(
        "User-facing error:",
        errorMessage
      );

      const student =
        await Student.findById(
          req.session.studentId
        );

      res.render("student-form", {
        title:
          "Application Form | Legend College",

        student,

        error:
          errorMessage
      });
    }
  })
);

// ========================================================
// PROCESS PAYMENT
// ========================================================

router.post(
  "/process-payment",

  requireStudent,

  upload.single("paymentReceipt"),

  asyncHandler(async (req, res) => {
    try {
      const {
        transactionId,
        bankName,
        paymentDate
      } = req.body;

      const student =
        await Student.findById(
          req.session.studentId
        );

      if (!student) {
        return res.redirect(
          "/student-login"
        );
      }

      // ------------------------------------------------
      // CHECK FORM COMPLETION
      // ------------------------------------------------

      if (
        !student.firstName ||
        !student.program
      ) {
        return res.redirect(
          "/student-form"
        );
      }

      // ------------------------------------------------
      // VALIDATE PAYMENT
      // ------------------------------------------------

      if (
        !transactionId ||
        !bankName
      ) {
        return res.render("payment", {
          title:
            "Payment | Legend College",

          student,

          error:
            "Please fill in all required fields"
        });
      }

      // ------------------------------------------------
      // PAYMENT INFORMATION
      // ------------------------------------------------

      student.paymentStatus =
        "pending";

      student.paymentReference =
        transactionId;

      student.paymentDate =
        paymentDate
          ? new Date(paymentDate)
          : new Date();

      student.bankUsed =
        bankName;

      // ------------------------------------------------
      // PAYMENT RECEIPT → CLOUDINARY
      // ------------------------------------------------

      if (req.file) {
        console.log(
          "Uploading payment receipt to Cloudinary..."
        );

        const result =
          await uploadToCloudinary(
            req.file.buffer,

            "legend-college/payment-receipts",

            "auto"
          );

        student.paymentReceipt =
          result.secure_url;

        console.log(
          "Payment receipt uploaded successfully."
        );
      }

      // ------------------------------------------------
      // SUBMIT APPLICATION
      // ------------------------------------------------

      student.applicationStatus =
        "submitted";

      await student.save();

      // ------------------------------------------------
      // APPLICATION ID
      // ------------------------------------------------

      const applicationId =
        "LCN-" +
        student._id
          .toString()
          .slice(-8)
          .toUpperCase();

      // =================================================
      // SEND CONFIRMATION EMAIL TO STUDENT
      // =================================================

      try {
        const studentSubject =
          "Application Received - Legend College of Nursing And Emergency Health Sciences Nnewi";

        const studentHtml = `
          <div style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          ">

            <h2 style="color: #1e3a5f;">
              Application Received!
            </h2>

            <p>
              Dear
              <strong>
                ${student.firstName}
                ${student.lastName}
              </strong>,
            </p>

            <p>
              We have received your application for
              the
              <strong>${student.program}</strong>
              program.
            </p>

            <p>
              Your application ID is:
              <strong>${applicationId}</strong>
            </p>

            <p>
              Your application payment of
              <strong>₦20,000</strong>
              has been submitted and is pending verification.
            </p>

            <p>
              Our admissions team will review your
              application and get back to you within
              48 hours.
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
          studentSubject,
          studentHtml
        );

      } catch (emailError) {
        console.error(
          "Student email error:",
          emailError.message
        );
      }

      // =================================================
      // SEND NOTIFICATION TO ADMIN
      // =================================================

      try {
        const adminSubject =
          `New Application - ${student.firstName} ${student.lastName}`;

        const adminHtml = `
          <div style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          ">

            <h2 style="color: #1e3a5f;">
              New Application Received
            </h2>

            <table style="
              width: 100%;
              border-collapse: collapse;
            ">

              <tr>
                <td style="
                  padding: 10px;
                  border-bottom: 1px solid #eee;
                ">
                  <strong>Name:</strong>
                </td>

                <td style="
                  padding: 10px;
                  border-bottom: 1px solid #eee;
                ">
                  ${student.firstName}
                  ${student.lastName}
                </td>
              </tr>

              <tr>
                <td style="
                  padding: 10px;
                  border-bottom: 1px solid #eee;
                ">
                  <strong>Email:</strong>
                </td>

                <td style="
                  padding: 10px;
                  border-bottom: 1px solid #eee;
                ">
                  ${student.email}
                </td>
              </tr>

              <tr>
                <td style="
                  padding: 10px;
                  border-bottom: 1px solid #eee;
                ">
                  <strong>Phone:</strong>
                </td>

                <td style="
                  padding: 10px;
                  border-bottom: 1px solid #eee;
                ">
                  ${student.phone}
                </td>
              </tr>

              <tr>
                <td style="
                  padding: 10px;
                  border-bottom: 1px solid #eee;
                ">
                  <strong>Program:</strong>
                </td>

                <td style="
                  padding: 10px;
                  border-bottom: 1px solid #eee;
                ">
                  ${student.program}
                </td>
              </tr>

              <tr>
                <td style="
                  padding: 10px;
                  border-bottom: 1px solid #eee;
                ">
                  <strong>Payment:</strong>
                </td>

                <td style="
                  padding: 10px;
                  border-bottom: 1px solid #eee;
                ">
                  Pending Verification -
                  ${transactionId}
                </td>
              </tr>

              <tr>
                <td style="
                  padding: 10px;
                  border-bottom: 1px solid #eee;
                ">
                  <strong>Applied:</strong>
                </td>

                <td style="
                  padding: 10px;
                  border-bottom: 1px solid #eee;
                ">
                  ${new Date().toLocaleString()}
                </td>
              </tr>

            </table>

          </div>
        `;

        await sendEmail(
          "legendcollege25@gmail.com",
          adminSubject,
          adminHtml
        );

      } catch (emailError) {
        console.error(
          "Admin email error:",
          emailError.message
        );
      }

      // =================================================
      // SUCCESS PAGE
      // =================================================

      res.render("success", {
        title:
          "Application Submitted | Legend College",

        email:
          student.email,

        applicationId
      });

    } catch (error) {
      console.error(
        "Payment error:",
        error
      );

      const student =
        await Student.findById(
          req.session.studentId
        );

      res.render("payment", {
        title:
          "Payment | Legend College",

        student,

        error:
          "Payment processing failed. Please try again."
      });
    }
  })
);

// ========================================================
// ADMIN LOGIN
// ========================================================

router.post(
  "/admin-login",
  asyncHandler(async (req, res) => {
    try {
      const {
        username,
        password
      } = req.body;

      const admin =
        await Admin.findOne({ username });

      if (!admin) {
        return res.render("admin-login", {
          title:
            "Admin Login | Legend College",

          error:
            "Invalid username or password"
        });
      }

      const isMatch =
        await admin.comparePassword(
          password
        );

      if (!isMatch) {
        return res.render("admin-login", {
          title:
            "Admin Login | Legend College",

          error:
            "Invalid username or password"
        });
      }

      if (admin.role !== "admin") {
        return res.render("admin-login", {
          title:
            "Admin Login | Legend College",

          error:
            "Access denied. Admin privileges required."
        });
      }

      req.session.adminId =
        admin._id;

      res.redirect(
        "/admin-dashboard"
      );

    } catch (error) {
      console.error(
        "Admin login error:",
        error
      );

      res.render("admin-login", {
        title:
          "Admin Login | Legend College",

        error:
          "Login failed. Please try again."
      });
    }
  })
);

// ========================================================
// STAFF LOGIN
// ========================================================

router.post(
  "/staff-login",
  asyncHandler(async (req, res) => {
    try {
      const {
        username,
        password
      } = req.body;

      const staff =
        await Admin.findOne({ username });

      if (!staff) {
        return res.render("staff-login", {
          title:
            "Staff Login | Legend College",

          error:
            "Invalid username or password"
        });
      }

      const isMatch =
        await staff.comparePassword(
          password
        );

      if (!isMatch) {
        return res.render("staff-login", {
          title:
            "Staff Login | Legend College",

          error:
            "Invalid username or password"
        });
      }

      if (staff.role !== "staff") {
        return res.render("staff-login", {
          title:
            "Staff Login | Legend College",

          error:
            "Access denied. Staff credentials required."
        });
      }

      req.session.staffId =
        staff._id;

      res.redirect(
        "/staff-dashboard"
      );

    } catch (error) {
      console.error(
        "Staff login error:",
        error
      );

      res.render("staff-login", {
        title:
          "Staff Login | Legend College",

        error:
          "Login failed. Please try again."
      });
    }
  })
);

// ========================================================
// ADMIN UPDATE STUDENT STATUS
// ========================================================

router.post(
  "/admin/update-status",

  requireAdmin,

  asyncHandler(async (req, res) => {
    try {
      const {
        studentId,
        status
      } = req.body;

      const student =
        await Student.findById(
          studentId
        );

      if (!student) {
        const students =
          await Student.find().sort({
            createdAt: -1
          });

        const stats = {
          total: students.length,

          pending: students.filter(
            (student) =>
              student.applicationStatus ===
                "submitted" ||
              student.applicationStatus ===
                "under_review"
          ).length,

          approved: students.filter(
            (student) =>
              student.applicationStatus ===
              "approved"
          ).length,

          rejected: students.filter(
            (student) =>
              student.applicationStatus ===
              "rejected"
          ).length
        };

        const admin =
          await Admin.findById(
            req.session.adminId
          );

        return res.render(
          "admin-dashboard",
          {
            title:
              "Admin Dashboard | Legend College",

            admin,
            students,
            stats,

            error:
              "Student not found",

            success: null
          }
        );
      }

      // ------------------------------------------------
      // UPDATE APPLICATION STATUS
      // ------------------------------------------------

      student.applicationStatus =
        status;

      await student.save();

      // =================================================
      // SEND STATUS EMAIL
      // =================================================

      try {
        const statusText =
          status === "approved"
            ? "Approved"
            : "Rejected";

        const subject =
          `Application ${statusText} - Legend College of Nursing And Emergency Health Sciences Nnewi`;

        const html = `
          <div style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          ">

            <h2 style="color: #1e3a5f;">
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
              <strong>${student.program}</strong>
              program has been
              <strong>${statusText}</strong>.
            </p>

            ${
              status === "approved"
                ? `
                  <p>
                    Congratulations! We look forward
                    to welcoming you to Legend College
                    of Nursing And Emergency Health
                    Sciences Nnewi.
                  </p>
                `
                : `
                  <p>
                    We regret to inform you that your
                    application was not successful this
                    time. We encourage you to apply again
                    in the future.
                  </p>
                `
            }

            <p>
              Best regards,<br>
              <strong>
                Legend College of Nursing And
                Emergency Health Sciences Nnewi
              </strong>
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
          "Status update email error:",
          emailError.message
        );
      }

      // ------------------------------------------------
      // REFRESH ADMIN DASHBOARD DATA
      // ------------------------------------------------

      const students =
        await Student.find().sort({
          createdAt: -1
        });

      const pendingPayments =
        await Student.countDocuments({
          paymentStatus: "pending"
        });

      const paidStudents =
        await Student.countDocuments({
          paymentStatus: "paid"
        });

      const unpaidStudents =
        await Student.countDocuments({
          paymentStatus: "unpaid"
        });

      const stats = {
        total: students.length,

        pending: students.filter(
          (student) =>
            student.applicationStatus ===
              "submitted" ||
            student.applicationStatus ===
              "under_review"
        ).length,

        approved: students.filter(
          (student) =>
            student.applicationStatus ===
            "approved"
        ).length,

        rejected: students.filter(
          (student) =>
            student.applicationStatus ===
            "rejected"
        ).length,

        pendingPayments,
        paidStudents,
        unpaidStudents
      };

      const admin =
        await Admin.findById(
          req.session.adminId
        );

      const statusText =
        status === "approved"
          ? "Approved"
          : "Rejected";

      res.render(
        "admin-dashboard",
        {
          title:
            "Admin Dashboard | Legend College",

          admin,
          students,
          stats,

          error: null,

          success:
            "Application " +
            statusText +
            " successfully"
        }
      );

    } catch (error) {
      console.error(
        "Status update error:",
        error
      );

      res.redirect(
        "/admin-dashboard"
      );
    }
  })
);

// ========================================================
// EXPORT ROUTER
// ========================================================

module.exports = router;
