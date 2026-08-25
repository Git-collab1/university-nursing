// ========================================================
// routes/student.js
// ========================================================

const express = require("express");

const Student =
  require("../models/Student");

const Interview =
  require("../models/Interview");

const uploadToCloudinary =
  require("../utils/uploadToCloudinary");

const {
  requireStudent
} = require("../middleware/auth");

const multer =
  require("multer");

const router =
  express.Router();

// ========================================================
// MULTER
// ========================================================

const storage =
  multer.memoryStorage();

const upload =
  multer({
    storage,

    limits: {
      fileSize:
        5 * 1024 * 1024
    },

    fileFilter:
      function (
        req,
        file,
        cb
      ) {

        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "application/pdf"
        ];

        if (
          !allowedTypes.includes(
            file.mimetype
          )
        ) {

          return cb(
            new Error(
              "Invalid file type. Only JPG, JPEG, PNG and PDF files are allowed."
            )
          );
        }

        cb(
          null,
          true
        );
      }
  });

// ========================================================
// STUDENT LOGIN PAGE
// ========================================================

router.get(
  "/student-login",
  (req, res) => {

    if (
      req.session &&
      req.session.studentId
    ) {

      return res.redirect(
        "/student-dashboard"
      );
    }

    return res.render(
      "student-login",
      {
        title:
          "Student Login | Legend College",

        error: null
      }
    );
  }
);

// ========================================================
// STUDENT LOGIN
// ========================================================

router.post(
  "/student-login",
  async (req, res) => {

    try {

      const {
        email,
        password
      } = req.body;

      const student =
        await Student.findOne({
          email:
            email
              ? email
                .trim()
                .toLowerCase()
              : ""
        });

      if (!student) {

        return res.render(
          "student-login",
          {
            title:
              "Student Login | Legend College",

            error:
              "Invalid email or password"
          }
        );
      }

      const isMatch =
        await student.comparePassword(
          password
        );

      if (!isMatch) {

        return res.render(
          "student-login",
          {
            title:
              "Student Login | Legend College",

            error:
              "Invalid email or password"
          }
        );
      }

      req.session.studentId =
        student._id.toString();

      return req.session.save(
        (sessionError) => {

          if (
            sessionError
          ) {

            console.error(
              "Student session save error:",
              sessionError
            );

            return res.render(
              "student-login",
              {
                title:
                  "Student Login | Legend College",

                error:
                  "Login session could not be created. Please try again."
              }
            );
          }

          return res.redirect(
            "/student-dashboard"
          );
        }
      );

    } catch (error) {

      console.error(
        "Student login error:",
        error
      );

      return res.render(
        "student-login",
        {
          title:
            "Student Login | Legend College",

          error:
            "Login failed. Please try again."
        }
      );
    }
  }
);

// ========================================================
// STUDENT REGISTRATION PAGE
// ========================================================

router.get(
  "/student-register",
  (req, res) => {

    if (
      req.session &&
      req.session.studentId
    ) {

      return res.redirect(
        "/student-dashboard"
      );
    }

    return res.render(
      "student-register",
      {
        title:
          "Student Registration | Legend College",

        error: null
      }
    );
  }
);

// ========================================================
// STUDENT REGISTRATION
// ========================================================

router.post(
  "/student-register",
  async (req, res) => {

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

        return res.render(
          "student-register",
          {
            title:
              "Student Registration | Legend College",

            error:
              "Please fill in all required fields."
          }
        );
      }

      if (
        password !==
        confirmPassword
      ) {

        return res.render(
          "student-register",
          {
            title:
              "Student Registration | Legend College",

            error:
              "Passwords do not match."
          }
        );
      }

      if (
        password.length < 6
      ) {

        return res.render(
          "student-register",
          {
            title:
              "Student Registration | Legend College",

            error:
              "Password must be at least 6 characters long."
          }
        );
      }

      const cleanEmail =
        email
          .trim()
          .toLowerCase();

      const existingStudent =
        await Student.findOne({
          email:
            cleanEmail
        });

      if (
        existingStudent
      ) {

        return res.render(
          "student-register",
          {
            title:
              "Student Registration | Legend College",

            error:
              "This email is already registered."
          }
        );
      }

      const student =
        new Student({
          email:
            cleanEmail,

          password:

            password,

          applicationStatus:
            "not_started",

          paymentStatus:
            "unpaid",

          paymentAmount:
            27500
        });

      await student.save();

      req.session.studentId =
        student._id.toString();

      return req.session.save(
        (sessionError) => {

          if (
            sessionError
          ) {

            console.error(
              "Registration session error:",
              sessionError
            );

            return res.render(
              "student-register",
              {
                title:
                  "Student Registration | Legend College",

                error:
                  "Registration succeeded, but your session could not be created. Please log in."
              }
            );
          }

          return res.redirect(
            "/student-form"
          );
        }
      );

    } catch (error) {

      console.error(
        "Student registration error:",
        error
      );

      let errorMessage =
        "Registration failed. Please try again.";

      if (
        error.code ===
        11000
      ) {

        errorMessage =
          "This email is already registered.";

      } else if (
        error.message
      ) {

        errorMessage =
          error.message;
      }

      return res.render(
        "student-register",
        {
          title:
            "Student Registration | Legend College",

          error:
            errorMessage
        }
      );
    }
  }
);

// ========================================================
// STUDENT DASHBOARD
// ========================================================

router.get(
  "/student-dashboard",

  requireStudent,

  async (req, res) => {

    try {

      console.log(
        "=== STUDENT DASHBOARD ==="
      );

      console.log(
        "Session studentId:",
        req.session.studentId
      );

      // --------------------------------------------------
      // FIND STUDENT
      // --------------------------------------------------

      const student =
        await Student.findById(
          req.session.studentId
        );

      if (!student) {

        console.log(
          "Student not found."
        );

        return req.session.destroy(
          () =>
            res.redirect(
              "/student-login"
            )
        );
      }

      console.log(
        "Student found:",
        student._id
      );

      console.log(
        "Student paymentStatus:",
        student.paymentStatus
      );

      console.log(
        "Student applicationStatus:",
        student.applicationStatus
      );

      console.log(
        "Student interviewId:",
        student.interviewId
      );

      // --------------------------------------------------
      // FIND INTERVIEW
      // --------------------------------------------------

      let interview = null;

      // First try the student's interviewId.
      if (student.interviewId) {

        interview =
          await Interview.findById(
            student.interviewId
          );

        console.log(
          "Interview found using interviewId:",
          interview
            ? interview._id
            : "NOT FOUND"
        );
      }

      // If interviewId is missing or invalid,
      // search by student.
      if (!interview) {

        interview =
          await Interview.findOne({
            student: student._id
          });

        console.log(
          "Interview found using student ID:",
          interview
            ? interview._id
            : "NOT FOUND"
        );
      }

      // --------------------------------------------------
      // REPAIR STUDENT INTERVIEW ID
      // --------------------------------------------------

      if (interview) {

        if (
          !student.interviewId ||
          student.interviewId.toString() !==
          interview._id.toString()
        ) {

          console.log(
            "Repairing student's interviewId..."
          );

          student.interviewId =
            interview._id;

          await student.save();

          console.log(
            "Student interviewId repaired:",
            student.interviewId
          );
        }

      } else {

        console.log(
          "NO INTERVIEW FOUND FOR THIS STUDENT."
        );
      }

      // --------------------------------------------------
      // RENDER DASHBOARD
      // --------------------------------------------------

      return res.render(
        "student-dashboard",
        {
          title:
            "Student Dashboard | Legend College",

          student,

          interview,

          error: null
        }
      );

    } catch (error) {

      console.error(
        "Student dashboard error:",
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
            "Unable to load student dashboard."
        }
      );
    }
  }
);

// ========================================================
// STUDENT APPLICATION FORM
// ========================================================

router.get(
  "/student-form",
  requireStudent,
  async (req, res) => {

    try {

      const student =
        await Student.findById(
          req.session.studentId
        );

      if (!student) {

        return req.session.destroy(
          () =>
            res.redirect(
              "/student-login"
            )
        );
      }

      return res.render(
        "student-form",
        {
          title:
            "Application Form | Legend College",

          student,

          error: null
        }
      );

    } catch (error) {

      console.error(
        "Student form error:",
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
            "Unable to load application form."
        }
      );
    }
  }
);

// ========================================================
// STUDENT APPLICATION FORM SUBMISSION
// ========================================================

router.post(
  "/student-submit-form",

  requireStudent,

  upload.fields([
    {
      name:
        "passportPhoto",

      maxCount:
        1
    },

    {
      name:
        "waecResult",

      maxCount:
        1
    },

    {
      name:
        "necoResult",

      maxCount:
        1
    }
  ]),

  async (req, res) => {

    try {

      console.log(
        "=== FORM SUBMISSION STARTED ==="
      );

      console.log(
        "Session studentId:",
        req.session.studentId
      );

      console.log(
        "Request body keys:",
        Object.keys(
          req.body
        )
      );

      console.log(
        "Request files:",
        req.files
          ? Object.keys(
            req.files
          )
          : "none"
      );

      const {
        receiptNo,
        applicationDate,

        title,
        firstName,
        lastName,
        contactAddress,
        gender,
        dateOfBirth,
        maritalStatus,
        maidenName,

        phone,
        email,

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

        program,
        programTransfer,

        academicBackground,

        examinationTaken,
        otherExamination,

        credentialsEnclosed,
        awaitingResult,

        introductionSource,
        otherSource,

        declarationName,
        declaration,
        declarationDate
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
      // BASIC INFORMATION
      // ------------------------------------------------

      student.receiptNo =
        receiptNo || "";

      student.applicationDate =
        applicationDate
          ? new Date(
            applicationDate
          )
          : new Date();

      student.title =
        title || "";

      student.firstName =
        firstName || "";

      student.lastName =
        lastName || "";

      student.email =
        email
          ? email
            .trim()
            .toLowerCase()
          : student.email;

      student.phone =
        phone || "";

      student.dateOfBirth =
        dateOfBirth
          ? new Date(
            dateOfBirth
          )
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
      // EXTRA / MEDICAL
      // ------------------------------------------------

      student.extraCurricularActivities =
        extraCurricularActivities || "";

      student.medicalHistory =
        medicalHistory || "";

      student.genotype =
        genotype || "";

      // ------------------------------------------------
      // FATHER
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
      // MOTHER
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
      // PROGRAM
      // ------------------------------------------------

      student.program =
        program || "";

      student.programTransfer =
        programTransfer || "";

      // ------------------------------------------------
      // ACADEMIC BACKGROUND
      // ------------------------------------------------

      if (
        academicBackground ===
        "science" ||
        academicBackground ===
        "non_science"
      ) {

        student.academicBackground =
          academicBackground;

      } else {

        student.academicBackground =
          "";
      }

      // ------------------------------------------------
      // EDUCATION
      // ------------------------------------------------

      student.examinationTaken =
        examinationTaken || "";

      student.otherExamination =
        otherExamination || "";

      student.credentialsEnclosed =
        credentialsEnclosed ===
        "true";

      student.awaitingResult =
        awaitingResult ===
        "true";

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
        declaration ===
        "true";

      student.declarationDate =
        declarationDate
          ? new Date(
            declarationDate
          )
          : null;

      // ------------------------------------------------
      // PASSPORT
      // ------------------------------------------------

      if (
        req.files &&
        req.files.passportPhoto &&
        req.files.passportPhoto[0]
      ) {

        console.log(
          "Uploading passport photo to Cloudinary..."
        );

        const result =
          await uploadToCloudinary(
            req.files
              .passportPhoto[0]
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
      // WAEC
      // ------------------------------------------------

      if (
        req.files &&
        req.files.waecResult &&
        req.files.waecResult[0]
      ) {

        console.log(
          "Uploading WAEC result to Cloudinary..."
        );

        const result =
          await uploadToCloudinary(
            req.files
              .waecResult[0]
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
      // NECO
      // ------------------------------------------------

      if (
        req.files &&
        req.files.necoResult &&
        req.files.necoResult[0]
      ) {

        console.log(
          "Uploading NECO result to Cloudinary..."
        );

        const result =
          await uploadToCloudinary(
            req.files
              .necoResult[0]
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
      // APPLICATION STATUS
      // ------------------------------------------------

      student.applicationStatus =
        "form_completed";

      student.paymentAmount =
        27500;

      await student.save();

      console.log(
        "Student saved successfully."
      );

      return res.redirect(
        "/payment"
      );

    } catch (error) {

      console.error(
        "=== FORM SUBMISSION ERROR ==="
      );

      console.error(
        error
      );

      let errorMessage =
        "Failed to save form. Please try again.";

      if (
        error.code ===
        11000
      ) {

        errorMessage =
          "This email is already registered. Please use a different email.";

      } else if (
        error.name ===
        "ValidationError"
      ) {

        const validationErrors =
          [];

        for (
          const [
            field,
            validationError
          ]
          of Object.entries(
            error.errors ||
            {}
          )
        ) {

          validationErrors.push(
            `${field}: ${validationError.message}`
          );
        }

        errorMessage =
          "Validation error: " +
          validationErrors.join(
            "; "
          );

      } else if (
        error.message
      ) {

        errorMessage =
          error.message;
      }

      let student =
        null;

      try {

        student =
          await Student.findById(
            req.session.studentId
          );

      } catch (
      studentError
      ) {

        console.error(
          "Could not reload student:",
          studentError
        );
      }

      return res.render(
        "student-form",
        {
          title:
            "Application Form | Legend College",

          student,

          error:
            errorMessage
        }
      );
    }
  }
);

// ========================================================
// STUDENT LOGOUT
// ========================================================

router.get(
  "/student-logout",
  (req, res) => {

    req.session.destroy(
      (error) => {

        if (error) {
          console.error(
            "Student logout error:",
            error
          );

          return res.redirect(
            "/student-login"
          );
        }

        res.clearCookie(
          "connect.sid"
        );

        return res.redirect(
          "/student-login"
        );
      }
    );
  }
);

// ========================================================
// EXPORT
// ========================================================

module.exports =
  router;