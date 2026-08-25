// ========================================================
// routes/interview.js
// ========================================================

const express = require("express");

const Student = require("../models/Student");
const Interview = require("../models/Interview");
const interviewQuestions = require("../data/interviewQuestions");

const {
  requireStudent
} = require("../middleware/auth");

const router = express.Router();

// ========================================================
// HELPER: NORMALIZE ANSWER
// ========================================================

function normalizeAnswer(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// ========================================================
// HELPER: POPULATE INTERVIEW QUESTIONS
// ========================================================

async function populateInterviewQuestions(interview) {
  let changed = false;

  for (const subject of interview.subjects) {

    // ----------------------------------------------------
    // GET QUESTION BANK ENTRY
    // ----------------------------------------------------

    const bankEntry =
      interviewQuestions[subject.name];

    if (!bankEntry) {
      continue;
    }

    // ----------------------------------------------------
    // SUPPORT BOTH FORMATS
    //
    // Old:
    // Subject: [...]
    //
    // New:
    // Subject: {
    //   passage: "...",
    //   questions: [...]
    // }
    // ----------------------------------------------------

    const questionBank =
      Array.isArray(bankEntry)
        ? bankEntry
        : Array.isArray(bankEntry.questions)
          ? bankEntry.questions
          : [];

    const passage =
      Array.isArray(bankEntry)
        ? ""
        : bankEntry.passage || "";

    // ----------------------------------------------------
    // SAVE ENGLISH PASSAGE
    // ----------------------------------------------------

    if (
      subject.passage !== passage
    ) {
      subject.passage =
        passage;

      changed = true;
    }

    // ----------------------------------------------------
    // NO QUESTIONS
    // ----------------------------------------------------

    if (
      questionBank.length === 0
    ) {
      continue;
    }

    // ----------------------------------------------------
    // CREATE / REPAIR QUESTIONS
    // ----------------------------------------------------

    for (
      let i = 0;
      i < questionBank.length;
      i++
    ) {

      const item =
        questionBank[i];

      // -----------------------------------------------
      // QUESTION DOES NOT EXIST
      // -----------------------------------------------

      if (
        !subject.questions[i]
      ) {

        subject.questions.push({
          question:
            item.question || "",

          options:
            Array.isArray(item.options)
              ? item.options
              : [],

          image:
            item.image || "",

          correctAnswer:
            item.correctAnswer || "",

          answer: "",

          isAnswered: false,

          isCorrect: false,

          score: 0,

          maxScore: 1,

          answeredAt: null
        });

        changed = true;

        continue;
      }

      // -----------------------------------------------
      // REPAIR EXISTING QUESTION
      // -----------------------------------------------

      const existingQuestion =
        subject.questions[i];

      if (
        existingQuestion.question !==
        (item.question || "")
      ) {

        existingQuestion.question =
          item.question || "";

        changed = true;
      }

      if (
        JSON.stringify(
          existingQuestion.options
        ) !==
        JSON.stringify(
          Array.isArray(
            item.options
          )
            ? item.options
            : []
        )
      ) {

        existingQuestion.options =
          Array.isArray(
            item.options
          )
            ? item.options
            : [];

        changed = true;
      }

      if (
        existingQuestion.image !==
        (item.image || "")
      ) {

        existingQuestion.image =
          item.image || "";

        changed = true;
      }

      // IMPORTANT:
      // Keep the correct answer on the SERVER.
      if (
        existingQuestion.correctAnswer !==
        (item.correctAnswer || "")
      ) {

        existingQuestion.correctAnswer =
          item.correctAnswer || "";

        changed = true;
      }
    }

    // ----------------------------------------------------
    // TOTALS
    // ----------------------------------------------------

    subject.totalQuestions =
      subject.questions.length;

    subject.questionsAnswered =
      subject.questions.filter(
        function (question) {
          return (
            question.isAnswered === true
          );
        }
      ).length;

    subject.score =
      subject.questions.reduce(
        function (
          total,
          question
        ) {
          return (
            total +
            Number(
              question.score || 0
            )
          );
        },
        0
      );

    subject.totalPossibleScore =
      subject.questions.reduce(
        function (
          total,
          question
        ) {
          return (
            total +
            Number(
              question.maxScore || 0
            )
          );
        },
        0
      );

    changed = true;
  }

  if (changed) {
    await interview.save();
  }

  return interview;
}

// ========================================================
// HELPER: GET STUDENT + INTERVIEW
// ========================================================

async function getStudentInterview(req) {
  if (
    !req.session ||
    !req.session.studentId
  ) {
    return {
      student: null,
      interview: null
    };
  }

  const student =
    await Student.findById(
      req.session.studentId
    );

  if (!student) {
    return {
      student: null,
      interview: null
    };
  }

  let interview = null;

  // ------------------------------------------------------
  // TRY STUDENT INTERVIEW ID
  // ------------------------------------------------------

  if (student.interviewId) {
    interview =
      await Interview.findById(
        student.interviewId
      );
  }

  // ------------------------------------------------------
  // FALLBACK: FIND BY STUDENT
  // ------------------------------------------------------

  if (!interview) {
    interview =
      await Interview.findOne({
        student: student._id
      });
  }

  // ------------------------------------------------------
  // REPAIR STUDENT INTERVIEW ID
  // ------------------------------------------------------

  if (
    interview &&
    (
      !student.interviewId ||
      student.interviewId.toString() !==
      interview._id.toString()
    )
  ) {
    student.interviewId =
      interview._id;

    await student.save();
  }

  return {
    student,
    interview
  };
}

// ========================================================
// GET STUDENT INTERVIEW / INSTRUCTIONS
// ========================================================

router.get(
  "/student-interview",
  requireStudent,
  async function (req, res) {
    try {
      console.log(
        "=== STUDENT INTERVIEW PAGE ==="
      );

      console.log(
        "Session studentId:",
        req.session.studentId
      );

      const result =
        await getStudentInterview(req);

      const student =
        result.student;

      const interview =
        result.interview;

      if (!student) {
        return req.session.destroy(
          function () {
            res.redirect(
              "/student-login"
            );
          }
        );
      }

      console.log(
        "Student:",
        student._id
      );

      console.log(
        "Student interviewId:",
        student.interviewId
      );

      if (!interview) {
        console.log(
          "NO INTERVIEW FOUND FOR STUDENT"
        );

        return res.redirect(
          "/student-dashboard"
        );
      }

      console.log(
        "Interview found:",
        interview._id
      );

      console.log(
        "Interview type:",
        interview.interviewType
      );

      console.log(
        "Interview status:",
        interview.status
      );

      // --------------------------------------------------
      // PHYSICAL INTERVIEW
      // --------------------------------------------------

      if (
        interview.interviewType ===
        "physical"
      ) {
        return res.render(
          "interview-start",
          {
            title:
              "Physical Interview | Legend College",

            student,

            interview,

            error: null
          }
        );
      }

      // --------------------------------------------------
      // ONLINE INTERVIEW
      // --------------------------------------------------

      if (
        interview.interviewType !==
        "online"
      ) {
        return res.redirect(
          "/student-dashboard"
        );
      }

      // --------------------------------------------------
      // ALREADY COMPLETED
      // --------------------------------------------------

      if (
        interview.status ===
        "completed"
      ) {
        return res.redirect(
          "/student-dashboard"
        );
      }

      await populateInterviewQuestions(
        interview
      );

      return res.render(
        "interview-start",
        {
          title:
            "Online Interview | Legend College",

          student,

          interview,

          error: null
        }
      );
    } catch (error) {
      console.error(
        "Student interview page error:",
        error
      );

      return res.status(500).render(
        "error",
        {
          title:
            "Server Error | Legend College",

          message:
            "Unable to load the interview."
        }
      );
    }
  }
);

// ========================================================
// START ONLINE INTERVIEW
// ========================================================

router.post(
  "/student-interview/start",
  requireStudent,
  async function (req, res) {
    try {
      const result =
        await getStudentInterview(req);

      const student =
        result.student;

      const interview =
        result.interview;

      if (!student) {
        return req.session.destroy(
          function () {
            res.redirect(
              "/student-login"
            );
          }
        );
      }

      if (!interview) {
        return res.redirect(
          "/student-dashboard"
        );
      }

      // --------------------------------------------------
      // PHYSICAL INTERVIEW
      // --------------------------------------------------

      if (
        interview.interviewType ===
        "physical"
      ) {
        return res.redirect(
          "/student-interview"
        );
      }

      // --------------------------------------------------
      // COMPLETED
      // --------------------------------------------------

      if (
        interview.status ===
        "completed"
      ) {
        return res.redirect(
          "/student-dashboard"
        );
      }

      // --------------------------------------------------
      // POPULATE QUESTIONS
      // --------------------------------------------------

      await populateInterviewQuestions(
        interview
      );

      if (
        !Array.isArray(
          interview.subjects
        ) ||
        interview.subjects.length === 0
      ) {
        return res.status(500).render(
          "interview-start",
          {
            title:
              "Online Interview | Legend College",

            student,

            interview,

            error:
              "No interview subjects are available. Please contact the admissions office."
          }
        );
      }

      const firstSubject =
        interview.subjects[0];

      if (
        !firstSubject.questions ||
        firstSubject.questions.length === 0
      ) {
        return res.status(500).render(
          "interview-start",
          {
            title:
              "Online Interview | Legend College",

            student,

            interview,

            error:
              "Interview questions are not available. Please contact the admissions office."
          }
        );
      }

      const now =
        new Date();

      // --------------------------------------------------
      // NEW INTERVIEW
      // --------------------------------------------------

      if (
        interview.status !==
        "in_progress"
      ) {
        interview.status =
          "in_progress";

        interview.startedAt =
          now;

        interview.currentSubjectIndex =
          0;

        interview.currentQuestionIndex =
          0;

        firstSubject.startedAt =
          now;

        firstSubject.status =
          "in_progress";

        student.interviewStatus =
          "in_progress";

        student.applicationStatus =
          "interview_started";

        await interview.save();
        await student.save();
      } else {
        // ------------------------------------------------
        // RESUME INTERVIEW
        // ------------------------------------------------

        const currentSubject =
          interview.subjects[
          interview.currentSubjectIndex
          ];

        if (!currentSubject) {
          return res.redirect(
            "/student-dashboard"
          );
        }

        if (
          !currentSubject.startedAt
        ) {
          currentSubject.startedAt =
            now;

          currentSubject.status =
            "in_progress";

          await interview.save();
        }
      }

      return res.redirect(
        "/student-interview/question?subject=" +
        interview.currentSubjectIndex +
        "&question=" +
        interview.currentQuestionIndex
      );
    } catch (error) {
      console.error(
        "Start interview error:",
        error
      );

      return res.status(500).render(
        "error",
        {
          title:
            "Server Error | Legend College",

          message:
            "Unable to start the interview."
        }
      );
    }
  }
);

// ========================================================
// GET CURRENT QUESTION
// ========================================================

router.get(
  "/student-interview/question",
  requireStudent,
  async function (req, res) {
    try {
      const result =
        await getStudentInterview(req);

      const student =
        result.student;

      const interview =
        result.interview;

      if (!student) {
        return req.session.destroy(
          function () {
            res.redirect(
              "/student-login"
            );
          }
        );
      }

      if (!interview) {
        return res.redirect(
          "/student-dashboard"
        );
      }

      // --------------------------------------------------
      // ONLINE ONLY
      // --------------------------------------------------

      if (
        interview.interviewType !==
        "online"
      ) {
        return res.redirect(
          "/student-interview"
        );
      }

      // --------------------------------------------------
      // MUST BE IN PROGRESS
      // --------------------------------------------------

      if (
        interview.status !==
        "in_progress"
      ) {
        return res.redirect(
          "/student-interview"
        );
      }

      await populateInterviewQuestions(
        interview
      );

      const subjectIndex =
        Number(
          interview.currentSubjectIndex
        );

      const questionIndex =
        Number(
          interview.currentQuestionIndex
        );

      const subject =
        interview.subjects[
        subjectIndex
        ];

      if (!subject) {
        return res.redirect(
          "/student-dashboard"
        );
      }

      // --------------------------------------------------
      // SUBJECT TIMER START
      // --------------------------------------------------

      if (
        !subject.startedAt
      ) {
        subject.startedAt =
          new Date();

        subject.status =
          "in_progress";

        await interview.save();
      }

      // --------------------------------------------------
      // SERVER-SIDE TIMER
      // --------------------------------------------------

      const startTime =
        new Date(
          subject.startedAt
        ).getTime();

      const durationMs =
        Number(
          subject.durationMinutes
        ) *
        60 *
        1000;

      const elapsed =
        Date.now() -
        startTime;

      if (
        elapsed >=
        durationMs
      ) {
        subject.completedAt =
          new Date();

        subject.status =
          "completed";

        await interview.save();

        return res.redirect(
          "/student-interview/advance"
        );
      }

      // --------------------------------------------------
      // QUESTION
      // --------------------------------------------------

      const question =
        subject.questions[
        questionIndex
        ];

      if (!question) {
        subject.completedAt =
          new Date();

        subject.status =
          "completed";

        await interview.save();

        return res.redirect(
          "/student-interview/advance"
        );
      }

      // --------------------------------------------------
      // SAFE QUESTION
      // --------------------------------------------------
      // Never send correctAnswer to browser.
      // --------------------------------------------------

      const safeQuestion = {
        _id:
          question._id,

        question:
          question.question,

        options:
          question.options,

        image:
          question.image || "",

        answer:
          question.answer || ""
      };

      return res.render(
        "interview",
        {
          title:
            "Online Interview | Legend College",

          student,

          interview,

          subject,

          subjectIndex,

          questionIndex,

          question:
            safeQuestion,

          error: null
        }
      );
    } catch (error) {
      console.error(
        "Interview question error:",
        error
      );

      return res.status(500).render(
        "error",
        {
          title:
            "Server Error | Legend College",

          message:
            "Unable to load the interview question."
        }
      );
    }
  }
);

// ========================================================
// SUBMIT ANSWER
// ========================================================

router.post(
  "/student-interview/answer",
  requireStudent,
  async function (req, res) {
    try {
      const {
        answer,
        subjectIndex,
        questionIndex,
        nextAction
      } = req.body;

      const result =
        await getStudentInterview(req);

      const student =
        result.student;

      const interview =
        result.interview;

      if (!student) {
        return req.session.destroy(
          function () {
            res.redirect(
              "/student-login"
            );
          }
        );
      }

      if (!interview) {
        return res.redirect(
          "/student-dashboard"
        );
      }

      if (
        interview.interviewType !==
        "online"
      ) {
        return res.redirect(
          "/student-interview"
        );
      }

      if (
        interview.status !==
        "in_progress"
      ) {
        return res.redirect(
          "/student-interview"
        );
      }

      const currentSubjectIndex =
        Number(
          interview.currentSubjectIndex
        );

      const currentQuestionIndex =
        Number(
          interview.currentQuestionIndex
        );

      const submittedSubjectIndex =
        Number(
          subjectIndex
        );

      const submittedQuestionIndex =
        Number(
          questionIndex
        );

      // --------------------------------------------------
      // PREVENT SKIPPING
      // --------------------------------------------------

      if (
        submittedSubjectIndex !==
        currentSubjectIndex
      ) {
        return res.redirect(
          "/student-interview/question?subject=" +
          currentSubjectIndex +
          "&question=" +
          currentQuestionIndex
        );
      }

      if (
        submittedQuestionIndex !==
        currentQuestionIndex
      ) {
        return res.redirect(
          "/student-interview/question?subject=" +
          currentSubjectIndex +
          "&question=" +
          currentQuestionIndex
        );
      }

      const subject =
        interview.subjects[
        currentSubjectIndex
        ];

      if (!subject) {
        return res.redirect(
          "/student-dashboard"
        );
      }

      // --------------------------------------------------
      // START SUBJECT TIMER IF MISSING
      // --------------------------------------------------

      if (
        !subject.startedAt
      ) {
        subject.startedAt =
          new Date();

        subject.status =
          "in_progress";
      }

      // --------------------------------------------------
      // CHECK TIMER
      // --------------------------------------------------

      const startTime =
        new Date(
          subject.startedAt
        ).getTime();

      const durationMs =
        Number(
          subject.durationMinutes
        ) *
        60 *
        1000;

      const elapsed =
        Date.now() -
        startTime;

      const timeExpired =
        elapsed >=
        durationMs;

      // --------------------------------------------------
      // FIND QUESTION
      // --------------------------------------------------

      const question =
        subject.questions[
        currentQuestionIndex
        ];

      if (!question) {
        subject.completedAt =
          new Date();

        subject.status =
          "completed";

        await interview.save();

        return res.redirect(
          "/student-interview/advance"
        );
      }

      // --------------------------------------------------
      // SAVE ANSWER
      // --------------------------------------------------

      const cleanAnswer =
        typeof answer === "string"
          ? answer.trim()
          : "";

      question.answer =
        cleanAnswer;

      question.isAnswered =
        cleanAnswer.length > 0;

      question.answeredAt =
        cleanAnswer.length > 0
          ? new Date()
          : null;

      // --------------------------------------------------
      // SCORE ANSWER
      // --------------------------------------------------

      if (
        cleanAnswer.length > 0
      ) {
        const isCorrect =
          normalizeAnswer(
            cleanAnswer
          ) ===
          normalizeAnswer(
            question.correctAnswer
          );

        question.isCorrect =
          isCorrect;

        question.score =
          isCorrect
            ? Number(
              question.maxScore || 1
            )
            : 0;
      } else {
        question.isCorrect =
          false;

        question.score =
          0;
      }

      // --------------------------------------------------
      // SUBJECT TOTALS
      // --------------------------------------------------

      subject.questionsAnswered =
        subject.questions.filter(
          function (item) {
            return (
              item.isAnswered ===
              true
            );
          }
        ).length;

      subject.totalQuestions =
        subject.questions.length;

      subject.score =
        subject.questions.reduce(
          function (total, item) {
            return (
              total +
              Number(
                item.score || 0
              )
            );
          },
          0
        );

      subject.totalPossibleScore =
        subject.questions.reduce(
          function (total, item) {
            return (
              total +
              Number(
                item.maxScore || 0
              )
            );
          },
          0
        );

      // --------------------------------------------------
      // TIME EXPIRED
      // --------------------------------------------------

      if (timeExpired) {
        subject.completedAt =
          new Date();

        subject.status =
          "completed";

        await interview.save();

        return res.redirect(
          "/student-interview/advance"
        );
      }

      // --------------------------------------------------
      // FINISH SUBJECT
      // --------------------------------------------------

      if (
        nextAction ===
        "finish_subject"
      ) {
        subject.completedAt =
          new Date();

        subject.status =
          "completed";

        await interview.save();

        return res.redirect(
          "/student-interview/advance"
        );
      }

      // --------------------------------------------------
      // NEXT QUESTION
      // --------------------------------------------------

      if (
        currentQuestionIndex <
        subject.questions.length - 1
      ) {
        interview.currentQuestionIndex =
          currentQuestionIndex + 1;

        await interview.save();

        return res.redirect(
          "/student-interview/question?subject=" +
          currentSubjectIndex +
          "&question=" +
          (
            currentQuestionIndex + 1
          )
        );
      }

      // --------------------------------------------------
      // LAST QUESTION
      // --------------------------------------------------

      subject.completedAt =
        new Date();

      subject.status =
        "completed";

      await interview.save();

      return res.redirect(
        "/student-interview/advance"
      );
    } catch (error) {
      console.error(
        "Interview answer error:",
        error
      );

      return res.status(500).render(
        "error",
        {
          title:
            "Server Error | Legend College",

          message:
            "Unable to save your interview answer."
        }
      );
    }
  }
);

// ========================================================
// ADVANCE TO NEXT SUBJECT
// ========================================================

router.get(
  "/student-interview/advance",
  requireStudent,
  async function (req, res) {
    try {
      const result =
        await getStudentInterview(req);

      const student =
        result.student;

      const interview =
        result.interview;

      if (!student) {
        return req.session.destroy(
          function () {
            res.redirect(
              "/student-login"
            );
          }
        );
      }

      if (!interview) {
        return res.redirect(
          "/student-dashboard"
        );
      }

      if (
        interview.interviewType !==
        "online"
      ) {
        return res.redirect(
          "/student-interview"
        );
      }

      const currentSubjectIndex =
        Number(
          interview.currentSubjectIndex
        );

      const currentSubject =
        interview.subjects[
        currentSubjectIndex
        ];

      // --------------------------------------------------
      // COMPLETE CURRENT SUBJECT
      // --------------------------------------------------

      if (currentSubject) {
        currentSubject.status =
          "completed";

        if (
          !currentSubject.completedAt
        ) {
          currentSubject.completedAt =
            new Date();
        }
      }

      // --------------------------------------------------
      // NEXT SUBJECT
      // --------------------------------------------------

      const nextSubjectIndex =
        currentSubjectIndex + 1;

      if (
        nextSubjectIndex <
        interview.subjects.length
      ) {
        const nextSubject =
          interview.subjects[
          nextSubjectIndex
          ];

        interview.currentSubjectIndex =
          nextSubjectIndex;

        interview.currentQuestionIndex =
          0;

        nextSubject.startedAt =
          new Date();

        nextSubject.completedAt =
          null;

        nextSubject.status =
          "in_progress";

        await interview.save();

        return res.redirect(
          "/student-interview/question?subject=" +
          nextSubjectIndex +
          "&question=0"
        );
      }

      // --------------------------------------------------
      // ALL SUBJECTS COMPLETED
      // --------------------------------------------------

      interview.calculateTotalScore();

      interview.status =
        "completed";

      interview.completedAt =
        new Date();

      await interview.save();

      // --------------------------------------------------
      // UPDATE STUDENT
      // --------------------------------------------------

      student.interviewStatus =
        "completed";

      student.interviewScore =
        interview.totalScore;

      student.interviewTotalScore =
        interview.totalPossibleScore;

      student.interviewPercentage =
        interview.percentage;

      student.interviewCompletedAt =
        interview.completedAt;

      student.applicationStatus =
        "under_review";

      await student.save();

      console.log(
        "=== INTERVIEW COMPLETED ==="
      );

      console.log(
        "Student:",
        student._id
      );

      console.log(
        "Total Score:",
        interview.totalScore
      );

      console.log(
        "Total Possible:",
        interview.totalPossibleScore
      );

      console.log(
        "Percentage:",
        interview.percentage
      );

      return res.redirect(
        "/student-dashboard"
      );
    } catch (error) {
      console.error(
        "Advance interview error:",
        error
      );

      return res.status(500).render(
        "error",
        {
          title:
            "Server Error | Legend College",

          message:
            "Unable to continue the interview."
        }
      );
    }
  }
);

// ========================================================
// COMPLETED INTERVIEW SAFETY ROUTE
// ========================================================

router.get(
  "/student-interview/completed",
  requireStudent,
  async function (req, res) {
    try {
      const student =
        await Student.findById(
          req.session.studentId
        );

      if (!student) {
        return req.session.destroy(
          function () {
            res.redirect(
              "/student-login"
            );
          }
        );
      }

      let interview = null;

      if (student.interviewId) {
        interview =
          await Interview.findById(
            student.interviewId
          );
      }

      if (!interview) {
        interview =
          await Interview.findOne({
            student:
              student._id
          });
      }

      if (
        !interview ||
        interview.status !==
        "completed"
      ) {
        return res.redirect(
          "/student-dashboard"
        );
      }

      return res.redirect(
        "/student-dashboard"
      );
    } catch (error) {
      console.error(
        "Completed interview route error:",
        error
      );

      return res.redirect(
        "/student-dashboard"
      );
    }
  }
);

// ========================================================
// EXPORT ROUTER
// ========================================================

module.exports = router;
