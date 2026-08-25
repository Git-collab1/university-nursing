const mongoose = require("mongoose");

// =====================================================
// QUESTION SCHEMA
// =====================================================

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true
    },

    options: {
      type: [String],
      default: []
    },

    image: {
      type: String,
      default: ""
    },

    correctAnswer: {
      type: String,
      default: "",
      trim: true
    },

    // Student's answer
    answer: {
      type: String,
      default: "",
      trim: true
    },

    isAnswered: {
      type: Boolean,
      default: false
    },

    isCorrect: {
      type: Boolean,
      default: false
    },

    score: {
      type: Number,
      default: 0,
      min: 0
    },

    maxScore: {
      type: Number,
      default: 1,
      min: 0
    },

    answeredAt: {
      type: Date,
      default: null
    }
  },
  {
    _id: true
  }
);

// =====================================================
// SUBJECT SCHEMA
// =====================================================

const subjectSchema = new mongoose.Schema(
  {
    // -----------------------------------------------
    // SUBJECT NAME
    // -----------------------------------------------

    name: {
      type: String,

      enum: [
        "English",
        "Mathematics",
        "Biology",
        "Physics",
        "Chemistry"
      ],

      required: true
    },


    // -----------------------------------------------
    // SUBJECT DURATION
    // -----------------------------------------------

    durationMinutes: {
      type: Number,

      required: true,

      min: 1
    },

    // -----------------------------------------------
    // QUESTIONS
    // -----------------------------------------------

    questions: {
      type: [questionSchema],

      default: []
    },

    // -----------------------------------------------
    // SUBJECT TIMING
    // -----------------------------------------------

    startedAt: {
      type: Date,

      default: null
    },

    completedAt: {
      type: Date,

      default: null
    },

    // -----------------------------------------------
    // SUBJECT SCORE
    // -----------------------------------------------

    score: {
      type: Number,

      default: 0,

      min: 0
    },

    totalPossibleScore: {
      type: Number,

      default: 0,

      min: 0
    },

    totalQuestions: {
      type: Number,

      default: 0,

      min: 0
    },

    questionsAnswered: {
      type: Number,

      default: 0,

      min: 0
    },

    // -----------------------------------------------
    // SUBJECT STATUS
    // -----------------------------------------------

    status: {
      type: String,

      enum: [
        "not_started",
        "in_progress",
        "completed"
      ],

      default: "not_started"
    }
  },
  {
    _id: true
  }
);

// =====================================================
// INTERVIEW SCHEMA
// =====================================================

const interviewSchema = new mongoose.Schema(
  {
    // =================================================
    // STUDENT
    // =================================================

    student: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "Student",

      required: true,

      unique: true,

      index: true
    },

    // =================================================
    // INTERVIEW TYPE
    // =================================================

    interviewType: {
      type: String,

      enum: [
        "online",
        "physical"
      ],

      required: true,

      index: true
    },

    // =================================================
    // SUBJECTS
    // =================================================

    subjects: {
      type: [subjectSchema],

      default: []
    },

    // =================================================
    // CURRENT POSITION
    // =================================================

    currentSubjectIndex: {
      type: Number,

      default: 0,

      min: 0
    },

    currentQuestionIndex: {
      type: Number,

      default: 0,

      min: 0
    },

    // =================================================
    // TOTAL SCORE
    // =================================================

    totalScore: {
      type: Number,

      default: 0,

      min: 0
    },

    totalPossibleScore: {
      type: Number,

      default: 0,

      min: 0
    },

    percentage: {
      type: Number,

      default: 0,

      min: 0,

      max: 100
    },

    // =================================================
    // INTERVIEW STATUS
    // =================================================

    status: {
      type: String,

      enum: [
        "scheduled",
        "in_progress",
        "completed",
        "cancelled"
      ],

      default: "scheduled",

      index: true
    },

    // =================================================
    // SCHEDULING
    // =================================================

    scheduledAt: {
      type: Date,

      default: null
    },

    scheduledEndAt: {
      type: Date,

      default: null
    },

    // =================================================
    // INTERVIEW TIMING
    // =================================================

    startedAt: {
      type: Date,

      default: null
    },

    completedAt: {
      type: Date,

      default: null
    },

    // =================================================
    // ADMIN INFORMATION
    // =================================================

    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "Admin",

      default: null
    },

    notes: {
      type: String,

      default: "",

      trim: true
    }
  },

  {
    timestamps: true
  }
);

// =====================================================
// CALCULATE PERCENTAGE
// =====================================================

interviewSchema.methods.calculatePercentage =
  function () {

    if (
      this.totalPossibleScore <= 0
    ) {

      this.percentage = 0;

      return 0;
    }

    this.percentage =
      Math.round(
        (
          this.totalScore /
          this.totalPossibleScore
        ) *
        10000
      ) / 100;

    return this.percentage;
  };

// =====================================================
// CALCULATE TOTAL SCORE
// =====================================================

interviewSchema.methods.calculateTotalScore =
  function () {

    let totalScore = 0;

    let totalPossibleScore = 0;

    this.subjects.forEach(
      (subject) => {

        let subjectScore = 0;

        let subjectPossible = 0;

        subject.questions.forEach(
          (question) => {

            subjectScore +=
              Number(
                question.score || 0
              );

            subjectPossible +=
              Number(
                question.maxScore || 0
              );
          }
        );

        subject.score =
          subjectScore;

        subject.totalPossibleScore =
          subjectPossible;

        subject.totalQuestions =
          subject.questions.length;

        subject.questionsAnswered =
          subject.questions.filter(
            (question) =>
              question.isAnswered === true
          ).length;

        totalScore +=
          subjectScore;

        totalPossibleScore +=
          subjectPossible;
      }
    );

    this.totalScore =
      totalScore;

    this.totalPossibleScore =
      totalPossibleScore;

    this.calculatePercentage();

    return {
      totalScore:
        this.totalScore,

      totalPossibleScore:
        this.totalPossibleScore,

      percentage:
        this.percentage
    };
  };

// =====================================================
// CHECK ONLINE INTERVIEW
// =====================================================

interviewSchema.methods.isOnline =
  function () {

    return (
      this.interviewType ===
      "online"
    );
  };

// =====================================================
// CHECK PHYSICAL INTERVIEW
// =====================================================

interviewSchema.methods.isPhysical =
  function () {

    return (
      this.interviewType ===
      "physical"
    );
  };

// =====================================================
// VALIDATION
// =====================================================
//
// Physical interviews do not require subjects.
// Online interviews should have subjects once
// they are created for the student.
//
// We do not make subjects globally required because
// the interview is created before questions are loaded.
// =====================================================

interviewSchema.pre(
  "validate",
  function () {

    if (
      this.interviewType ===
      "online"
    ) {

      if (
        !Array.isArray(
          this.subjects
        )
      ) {
        this.subjects = [];
      }
    }
  }
);

// =====================================================
// EXPORT MODEL
// =====================================================

module.exports =
  mongoose.model(
    "Interview",
    interviewSchema
  );