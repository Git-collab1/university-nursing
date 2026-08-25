const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// =====================================================
// STUDENT SCHEMA
// =====================================================

const studentSchema = new mongoose.Schema(
  {
    // ===================================================
    // APPLICATION DETAILS
    // ===================================================

    receiptNo: {
      type: String,
      default: "",
      trim: true
    },

    admissionNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },

    applicationDate: {
      type: Date,
      default: Date.now
    },

    passportPhoto: {
      type: String,
      default: ""
    },

    // ===================================================
    // PERSONAL INFORMATION
    // ===================================================

    title: {
      type: String,
      enum: ["Mr.", "Miss", "Mrs.", ""],
      default: ""
    },

    firstName: {
      type: String,
      trim: true,
      default: ""
    },

    lastName: {
      type: String,
      trim: true,
      default: ""
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    phone: {
      type: String,
      trim: true,
      default: ""
    },

    dateOfBirth: {
      type: Date
    },

    gender: {
      type: String,
      enum: ["Male", "Female", ""],
      default: ""
    },

    maritalStatus: {
      type: String,
      enum: [
        "Single",
        "Married",
        "Divorced",
        "Widowed",
        ""
      ],
      default: ""
    },

    maidenName: {
      type: String,
      default: ""
    },

    // ===================================================
    // ADDRESS INFORMATION
    // ===================================================

    contactAddress: {
      type: String,
      default: ""
    },

    address: {
      street: {
        type: String,
        default: ""
      },

      city: {
        type: String,
        default: ""
      },

      state: {
        type: String,
        default: ""
      },

      country: {
        type: String,
        default: ""
      }
    },

    // ===================================================
    // LOCATION INFORMATION
    // ===================================================

    stateOfOrigin: {
      type: String,
      default: ""
    },

    nationality: {
      type: String,
      default: ""
    },

    localGovernmentArea: {
      type: String,
      default: ""
    },

    // ===================================================
    // EXTRA CURRICULAR & MEDICAL
    // ===================================================

    extraCurricularActivities: {
      type: String,
      default: ""
    },

    medicalHistory: {
      type: String,
      default: ""
    },

    genotype: {
      type: String,
      enum: [
        "AA",
        "AS",
        "SS",
        "AC",
        ""
      ],
      default: ""
    },

    // ===================================================
    // FATHER INFORMATION
    // ===================================================

    fatherFullName: {
      type: String,
      default: ""
    },

    fatherContactAddress: {
      type: String,
      default: ""
    },

    fatherPhone: {
      type: String,
      default: ""
    },

    fatherEmail: {
      type: String,
      default: ""
    },

    // ===================================================
    // MOTHER INFORMATION
    // ===================================================

    motherFullName: {
      type: String,
      default: ""
    },

    motherMaidenName: {
      type: String,
      default: ""
    },

    motherContactAddress: {
      type: String,
      default: ""
    },

    motherPhone: {
      type: String,
      default: ""
    },

    motherEmail: {
      type: String,
      default: ""
    },

    // ===================================================
    // GUARDIAN INFORMATION
    // ===================================================

    guardianName: {
      type: String,
      default: ""
    },

    guardianPhone: {
      type: String,
      default: ""
    },

    guardianRelationship: {
      type: String,
      default: ""
    },

    // ===================================================
    // CHOICE OF COURSE
    // ===================================================

    program: {
      type: String,
      enum: [
        "HND Nursing",
        "BNSc Nursing",
        ""
      ],
      default: ""
    },

    programTransfer: {
      type: String,
      enum: [
        "Yes",
        "No",
        ""
      ],
      default: ""
    },

    // ===================================================
    // EDUCATION - EXAMINATION TYPE
    // ===================================================

    examinationTaken: {
      type: String,
      enum: [
        "WAEC",
        "NECO",
        "Both",
        "Others",
        ""
      ],
      default: ""
    },

    otherExamination: {
      type: String,
      default: ""
    },

    // ===================================================
    // EXAMINATION RESULT UPLOADS
    // ===================================================

    waecResult: {
      type: String,
      default: ""
    },

    necoResult: {
      type: String,
      default: ""
    },

    // ===================================================
    // EXAMINATION RESULTS
    // ===================================================

    examinationResults: [
      {
        examinationName: {
          type: String,
          default: ""
        },

        examinationDate: {
          type: String,
          default: ""
        },

        examinationNo: {
          type: String,
          default: ""
        },

        subjects: [
          {
            subject: {
              type: String,
              default: ""
            },

            grade: {
              type: String,
              default: ""
            }
          }
        ]
      }
    ],

    // ===================================================
    // CREDENTIALS
    // ===================================================

    credentialsEnclosed: {
      type: Boolean,
      default: false
    },

    awaitingResult: {
      type: Boolean,
      default: false
    },

    // ===================================================
    // INTRODUCTION SOURCE
    // ===================================================

    introductionSource: {
      type: String,
      enum: [
        "Advertisement",
        "Student",
        "Parent",
        "Staff",
        "Other",
        ""
      ],
      default: ""
    },

    otherSource: {
      type: String,
      default: ""
    },

    // ===================================================
    // DECLARATION
    // ===================================================

    declaration: {
      type: Boolean,
      default: false
    },

    declarationDate: {
      type: Date
    },

    // ===================================================
    // ACADEMIC INFORMATION
    // ===================================================

    oLevelResult: {
      type: String,
      default: ""
    },

    previousSchool: {
      type: String,
      default: ""
    },

    // ===================================================
    // ACADEMIC BACKGROUND
    // ===================================================

    academicBackground: {
      type: String,
      enum: [
        "science",
        "non_science",
        ""
      ],
      default: ""
    },

    // ===================================================
    // PAYMENT INFORMATION
    // ===================================================

    matricNumber: {
      type: String,
      default: ""
    },

    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "paid",
        "failed",
        "unpaid"
      ],
      default: "unpaid",
      index: true
    },

    paymentAmount: {
      type: Number,
      required: true,
      default: 27500,
      min: 0
    },

    paymentReference: {
      type: String,
      default: "",
      trim: true
    },

    paymentDate: {
      type: Date
    },

    paymentReceipt: {
      type: String,
      default: ""
    },

    paymentRejectionReason: {
      type: String,
      default: ""
    },

    bankUsed: {
      type: String,
      default: ""
    },

    // ===================================================
    // APPLICATION STATUS
    // ===================================================

    applicationStatus: {
      type: String,

      enum: [
        "not_started",
        "form_completed",
        "payment_pending",
        "payment_submitted",
        "payment_verified",
        "interview_pending",
        "interview_started",
        "interview_completed",
        "under_review",
        "approved",
        "rejected"
      ],

      default: "not_started",

      index: true
    },

    // ===================================================
    // INTERVIEW INFORMATION
    // ===================================================

    interviewStatus: {
      type: String,

      enum: [
        "not_scheduled",
        "scheduled",
        "in_progress",
        "completed",
        "missed"
      ],

      default: "not_scheduled",

      index: true
    },

    interviewType: {
      type: String,

      enum: [
        "online",
        "physical",
        ""
      ],

      default: ""
    },

    interviewEligible: {
      type: Boolean,
      default: false
    },

    interviewSubjects: {
      type: [String],
      default: []
    },

    // ===================================================
    // INTERVIEW DOCUMENT REFERENCE
    // ===================================================

    interviewId: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "Interview",

      default: null
    },

    // ===================================================
    // INTERVIEW SCHEDULING
    // ===================================================

    interviewDate: {
      type: Date
    },

    interviewStartTime: {
      type: Date
    },

    interviewEndTime: {
      type: Date
    },

    // ===================================================
    // INTERVIEW SCORE
    // ===================================================

    interviewScore: {
      type: Number,
      default: 0,
      min: 0
    },

    interviewTotalScore: {
      type: Number,
      default: 0,
      min: 0
    },

    interviewPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    interviewCompletedAt: {
      type: Date
    },

    // ===================================================
    // AUTHENTICATION
    // ===================================================

    password: {
      type: String,
      required: true,
      minlength: 1
    },

    // ===================================================
    // TIMESTAMPS
    // ===================================================

    createdAt: {
      type: Date,
      default: Date.now
    },

    updatedAt: {
      type: Date,
      default: Date.now
    }
  }
);

// =====================================================
// HASH PASSWORD BEFORE SAVE
// =====================================================

studentSchema.pre(
  "save",
  async function () {

    if (this.isModified("password")) {

      this.password =
        await bcrypt.hash(
          this.password,
          12
        );
    }

    this.updatedAt =
      new Date();
  }
);

// =====================================================
// COMPARE PASSWORD
// =====================================================

studentSchema.methods.comparePassword =
  async function (
    candidatePassword
  ) {

    return bcrypt.compare(
      candidatePassword,
      this.password
    );
  };

// =====================================================
// EXPORT MODEL
// =====================================================

module.exports =
  mongoose.model(
    "Student",
    studentSchema
  );