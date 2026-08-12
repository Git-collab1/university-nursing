// routes/page.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const Contact = require("../models/Contact");
const Student = require("../models/Student");
const Admin = require("../models/Admin");
const sendEmail = require("../utils/sendEmail");

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + crypto.randomBytes(6).toString("hex");
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      return cb(null, false);
    }
  }
});

// Async wrapper to catch errors in async route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Session middleware check
const requireAuth = (req, res, next) => {
  if (!req.session.studentId && !req.session.adminId && !req.session.staffId) {
    return res.redirect('/admission');
  }
  next();
};

const requireStudent = (req, res, next) => {
  if (!req.session.studentId) {
    return res.redirect('/student-login');
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.adminId) {
    return res.redirect('/admin-login');
  }
  next();
};

const requireStaff = (req, res, next) => {
  if (!req.session.staffId) {
    return res.redirect('/staff-login');
  }
  next();
};

// ----------------------
// GET Routes
// ----------------------

router.get("/", (req, res) => {
  res.render("index", { title: "Legend College of Nursing Science | Home", messages: {} });
});

router.get("/about", (req, res) => {
  res.render("about", { title: "About Us | Legend College of Nursing" });
});

router.get("/history", (req, res) => {
  res.render("history", { title: "Our History | Legend College of Nursing" });
});

router.get("/mission", (req, res) => {
   res.render("mission", { title: "Mission & Vision | Legend College of Nursing" });
});

// Programs page
router.get("/programs", (req, res) => {
   res.render("programs", { title: "Programs | Legend College of Nursing" });
});

router.get("/contact", (req, res) => {
  res.render("contact", { title: "Contact Us | Legend College of Nursing" });
});

router.get("/admission", (req, res) => {
  res.render("admission", { title: "Admission | Legend College of Nursing" });
});

// Student Routes
router.get("/student-login", (req, res) => {
  if (req.session.studentId) {
    return res.redirect('/student-dashboard');
  }
  res.render("student-login", { title: "Student Login | Legend College", error: null });
});

router.get("/student-register", (req, res) => {
  if (req.session.studentId) {
    return res.redirect('/student-dashboard');
  }
  res.render("student-register", { title: "Student Registration | Legend College", error: null });
});

// Student Dashboard - shows different options based on application status
router.get("/student-dashboard", requireStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.session.studentId);
    if (!student) {
      req.session.destroy();
      return res.redirect('/student-login');
    }
    res.render("student-dashboard", {
      title: "Student Dashboard | Legend College",
      student,
      error: null
    });
  } catch (err) {
    res.redirect('/student-login');
  }
});

// Student Form - fill application details
router.get("/student-form", requireStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.session.studentId);
    if (!student) {
      req.session.destroy();
      return res.redirect('/student-login');
    }
    res.render("student-form", {
      title: "Application Form | Legend College",
      student,
      error: null
    });
  } catch (err) {
    res.redirect('/student-login');
  }
});

// Payment page - check if form is completed
router.get("/payment", requireStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.session.studentId);
    if (!student) {
      req.session.destroy();
      return res.redirect('/student-login');
    }

    // If form not completed, redirect to form
    if (!student.firstName || !student.program) {
      return res.redirect('/student-form');
    }

    // If already paid, redirect to dashboard
    if (student.paymentStatus === 'paid') {
      return res.redirect('/student-dashboard');
    }

    res.render("payment", {
      title: "Payment | Legend College",
      student,
      error: null
    });
  } catch (err) {
    res.redirect('/student-login');
  }
});

// Admin Routes
router.get("/admin-login", (req, res) => {
  if (req.session.adminId) {
    return res.redirect('/admin-dashboard');
  }
  res.render("admin-login", { title: "Admin Login | Legend College", error: null });
});

router.get("/admin-dashboard", requireAdmin, async (req, res) => {
   try {
     const admin = await Admin.findById(req.session.adminId);

     // Verify admin role
     if (!admin || admin.role !== 'admin') {
       req.session.destroy();
       return res.redirect('/admin-login');
     }

const students = await Student.find().sort({ createdAt: -1 });

      const pendingPayments = await Student.countDocuments({ paymentStatus: 'pending' });
      const paidStudents = await Student.countDocuments({ paymentStatus: 'paid' });
      const unpaidStudents = await Student.countDocuments({ paymentStatus: 'unpaid' });

      const stats = {
        total: students.length,
        pending: students.filter(s => s.applicationStatus === 'submitted' || s.applicationStatus === 'under_review').length,
        approved: students.filter(s => s.applicationStatus === 'approved').length,
        rejected: students.filter(s => s.applicationStatus === 'rejected').length,
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
    } catch (err) {
      res.redirect('/admin-login');
    }
  });

// Admin - Pending Payments List
router.get("/admin/payments", requireAdmin, async (req, res) => {
  try {
    const students = await Student.find({ paymentStatus: 'pending' }).sort({ createdAt: -1 });
    res.render("admin-payments", {
      title: "Pending Payments | Legend College",
      students: students
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin-dashboard');
  }
});

// Admin - Approve Payment
router.post("/admin/payments/approve", requireAdmin, async (req, res) => {
  try {
    const { studentId } = req.body;
    const student = await Student.findById(studentId);
    if (!student) {
      return res.redirect('/admin/payments');
    }
    student.paymentStatus = 'paid';
    await student.save();
    res.redirect('/admin/payments');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/payments');
  }
});

// Admin - Reject Payment
router.post("/admin/payments/reject", requireAdmin, async (req, res) => {
  try {
    const { studentId, reason } = req.body;
    const student = await Student.findById(studentId);
    if (!student) {
      return res.redirect('/admin/payments');
    }
    student.paymentStatus = 'unpaid';
    student.paymentRejectionReason = reason || 'Payment rejected by admin';
    await student.save();
    res.redirect('/admin/payments');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/payments');
  }
});

// Staff Routes
router.get("/staff-login", (req, res) => {
  if (req.session.staffId) {
    return res.redirect('/staff-dashboard');
  }
  res.render("staff-login", { title: "Staff Login | Legend College", error: null });
});

router.get("/staff-dashboard", requireStaff, async (req, res) => {
   try {
     const staff = await Admin.findById(req.session.staffId);

     // Verify staff role (assuming staff role is 'staff' or checking if not admin)
     if (!staff || staff.role === 'admin') {
       req.session.destroy();
       return res.redirect('/staff-login');
     }

     const students = await Student.find().sort({ createdAt: -1 });

     const stats = {
       total: students.length,
       pending: students.filter(s => s.applicationStatus === 'submitted' || s.applicationStatus === 'under_review').length,
       approved: students.filter(s => s.applicationStatus === 'approved').length,
       rejected: students.filter(s => s.applicationStatus === 'rejected').length
     };

     res.render("staff-dashboard", {
       title: "Staff Dashboard | Legend College",
       staff,
       students,
       stats,
       error: null,
       success: null
     });
   } catch (err) {
     res.redirect('/staff-login');
   }
 });

// Logout routes
router.get("/student-logout", (req, res) => {
  req.session.destroy();
  res.redirect('/admission');
});

router.get("/admin-logout", (req, res) => {
  req.session.destroy();
  res.redirect('/admin-login');
});

router.get("/staff-logout", (req, res) => {
  req.session.destroy();
  res.redirect('/staff-login');
});

// ----------------------
// POST Routes
// ----------------------

// Handle contact form submission
router.post("/contact", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and message"
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
      const subject = "Thank you for contacting Legend College of Nursing And Emergency Health Sciences Nnewi";
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a5f;">Thank you for contacting us!</h2>
          <p>Dear <strong>${name}</strong>,</p>
          <p>We have received your message and will get back to you within 24-48 hours.</p>
          <p>Here's a copy of your message:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #1e3a5f; margin: 15px 0;">
            <p><strong>Message:</strong> ${message}</p>
          </div>
          <p>Best regards,<br>Legend College of Nursing Sciences</p>
        </div>
      `;

      await sendEmail(email, subject, html);
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Thank you for your message! We'll get back to you soon."
    });

  } catch (error) {
    console.error("Contact form error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later."
    });
  }
});

// Student Registration - creates account only
router.post("/student-register", asyncHandler(async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    // Validate required fields
    if (!email || !password || !confirmPassword) {
      return res.render("student-register", {
        title: "Student Registration | Legend College",
        error: "Please fill in all required fields"
      });
    }

    // Check passwords match
    if (password !== confirmPassword) {
      return res.render("student-register", {
        title: "Student Registration | Legend College",
        error: "Passwords do not match"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.render("student-register", {
        title: "Student Registration | Legend College",
        error: "Please enter a valid email address"
      });
    }

    // Check password length
    if (password.length < 6) {
      return res.render("student-register", {
        title: "Student Registration | Legend College",
        error: "Password must be at least 6 characters long"
      });
    }

    // Check if email already exists
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.render("student-register", {
        title: "Student Registration | Legend College",
        error: "Email already registered"
      });
    }

    // Create new student (account only, no form data yet)
    const student = new Student({
      email,
      password,
      firstName: '',
      lastName: '',
      phone: '',
      dateOfBirth: null,
      gender: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: 'Nigeria'
      },
      guardianName: '',
      guardianPhone: '',
      guardianRelationship: '',
      previousSchool: '',
      oLevelResult: '',
      program: '',
      admissionNumber: 'LCN-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      paymentStatus: 'pending',
      applicationStatus: 'not_started'
    });

    await student.save();

    // Set session
    req.session.studentId = student._id;

    // Redirect to form page
    res.redirect('/student-form');

  } catch (error) {
    console.error("Registration error:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    res.render("student-register", {
      title: "Student Registration | Legend College",
      error: "Registration failed: " + error.message
    });
  }
}));

// Student Login
router.post("/student-login", asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;

    const student = await Student.findOne({ email });
    if (!student) {
      return res.render("student-login", {
        title: "Student Login | Legend College",
        error: "Invalid email or password"
      });
    }

    const isMatch = await student.comparePassword(password);
    if (!isMatch) {
      return res.render("student-login", {
        title: "Student Login | Legend College",
        error: "Invalid email or password"
      });
    }

    req.session.studentId = student._id;
    res.redirect('/student-dashboard');

  } catch (error) {
    console.error("Login error:", error);
    res.render("student-login", {
      title: "Student Login | Legend College",
      error: "Login failed. Please try again."
    });
  }
}));

// Student Submit Form - saves form data with file upload
router.post("/student-submit-form", requireStudent, upload.single('passportPhoto'), async (req, res) => {
  try {
    const {
      // Application Details
      receiptNo, applicationDate,

      // Personal Information
      title, firstName, lastName, email, phone, dateOfBirth, gender,
      maritalStatus, maidenName, contactAddress,

      // Location
      stateOfOrigin, nationality, localGovernmentArea,

      // Extra Curricular & Medical
      extraCurricularActivities, medicalHistory, genotype,

      // Parent Information
      fatherFullName, fatherContactAddress, fatherPhone, fatherEmail,
      motherFullName, motherMaidenName, motherContactAddress, motherPhone, motherEmail,

      // Guardian (alternative)
      guardianName, guardianPhone, guardianRelationship,

      // Choice of Course
      program, programTransfer,

      // Education
      examinationTaken, otherExamination,
      credentialsEnclosed, awaitingResult,

      // Introduction
      introductionSource, otherSource,

      // Declaration
      declarationName, declarationDate, declaration,
      address, previousSchool, oLevelResult
    } = req.body;

    const student = await Student.findById(req.session.studentId);
    if (!student) {
      return res.redirect('/student-login');
    }

    // Update student with form data - Application Details
    student.receiptNo = receiptNo || '';
    student.applicationDate = applicationDate ? new Date(applicationDate) : new Date();

    // Handle passport photo upload
    if (req.file) {
      student.passportPhoto = '/uploads/' + req.file.filename;
    }

    // Personal Information
    student.title = title || '';
    student.firstName = firstName || '';
    student.lastName = lastName || '';
    student.email = email || student.email;
    student.phone = phone || '';
    student.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    student.gender = gender || '';
    student.maritalStatus = maritalStatus || '';
    student.maidenName = maidenName || '';
    student.contactAddress = contactAddress || '';

    // Location
    student.stateOfOrigin = stateOfOrigin || '';
    student.nationality = nationality || '';
    student.localGovernmentArea = localGovernmentArea || '';

    // Address object (legacy)
    if (address) {
      student.address = {
        street: address.street || '',
        city: address.city || '',
        state: address.state || '',
        country: address.country || ''
      };
    }

    // Extra Curricular & Medical
    student.extraCurricularActivities = extraCurricularActivities || '';
    student.medicalHistory = medicalHistory || '';
    student.genotype = genotype || '';

    // Parent Information - Father
    student.fatherFullName = fatherFullName || '';
    student.fatherContactAddress = fatherContactAddress || '';
    student.fatherPhone = fatherPhone || '';
    student.fatherEmail = fatherEmail || '';

    // Parent Information - Mother
    student.motherFullName = motherFullName || '';
    student.motherMaidenName = motherMaidenName || '';
    student.motherContactAddress = motherContactAddress || '';
    student.motherPhone = motherPhone || '';
    student.motherEmail = motherEmail || '';

    // Guardian (alternative)
    student.guardianName = guardianName || '';
    student.guardianPhone = guardianPhone || '';
    student.guardianRelationship = guardianRelationship || '';

    // Choice of Course
    student.program = program || '';
    student.programTransfer = programTransfer || '';

    // Education
    student.examinationTaken = examinationTaken || '';
    student.otherExamination = otherExamination || '';
    student.credentialsEnclosed = credentialsEnclosed === 'true';
    student.awaitingResult = awaitingResult === 'true';

    // Legacy fields
    student.previousSchool = previousSchool || '';
    student.oLevelResult = oLevelResult || '';

    // Save examination results from table
    const examinationResults = [];
    for (let i = 1; i <= 9; i++) {
      const examName = req.body[`exam${i}Name`];
      const examDate = req.body[`exam${i}Date`];
      const examNo = req.body[`exam${i}No`];
      const examSubject = req.body[`exam${i}Subject`];
      const examGrade = req.body[`exam${i}Grade`];

      if (examName || examDate || examNo || examSubject || examGrade) {
        examinationResults.push({
          examinationName: examName || '',
          examinationDate: examDate || '',
          examinationNo: examNo || '',
          subjects: [{
            subject: examSubject || '',
            grade: examGrade || ''
          }]
        });
      }
    }
    student.examinationResults = examinationResults;

    // Introduction
    student.introductionSource = introductionSource || '';
    student.otherSource = otherSource || '';

    // Declaration
    student.declaration = declaration === 'true';
    student.declarationDate = declarationDate ? new Date(declarationDate) : null;

    student.applicationStatus = 'form_completed';

    await student.save();

    // Redirect to payment
    res.redirect('/payment');

  } catch (error) {
    console.error("Form submission error:", error);
    const student = await Student.findById(req.session.studentId);
    res.render("student-form", {
      title: "Application Form | Legend College",
      student,
      error: "Failed to save form. Please try again."
    });
  }
});

// Process Payment - with file upload support for bank transfer
router.post("/process-payment", requireStudent, upload.single('paymentReceipt'), async (req, res) => {
   try {
     const { transactionId, bankName, paymentDate } = req.body;

     const student = await Student.findById(req.session.studentId);
     if (!student) {
       return res.redirect('/student-login');
     }

     // Check if form is completed
     if (!student.firstName || !student.program) {
       return res.redirect('/student-form');
     }

     // Validate required fields
     if (!transactionId || !bankName) {
       return res.render("payment", {
         title: "Payment | Legend College",
         student,
         error: "Please fill in all required fields"
       });
     }

     // Update payment status (pending until verified)
     student.paymentStatus = 'pending';
     student.paymentReference = transactionId;
     student.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
     student.bankUsed = bankName;

     // Save receipt path if file uploaded
     if (req.file) {
       student.paymentReceipt = '/uploads/' + req.file.filename;
     }

     student.applicationStatus = 'submitted';
     await student.save();

     // Generate application ID
     const applicationId = 'LCN-' + student._id.toString().slice(-8).toUpperCase();

     // Send confirmation email to student
     try {
       const studentSubject = "Application Received - Legend College of Nursing And Emergency Health Sciences Nnewi";
       const studentHtml = `
         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
           <h2 style="color: #1e3a5f;">Application Received!</h2>
           <p>Dear <strong>${student.firstName} ${student.lastName}</strong>,</p>
           <p>We have received your application for the <strong>${student.program}</strong> program.</p>
           <p>Your application ID is: <strong>${applicationId}</strong></p>
           <p>Your application of <strong>₦20,000</strong> has been submitted and is pending verification.</p>
           <p>Our admissions team will review your application and get back to you within 5-7 days.</p>
           <p>Best regards,<br>Legend College of Nursing Sciences</p>
         </div>
       `;
       await sendEmail(student.email, studentSubject, studentHtml);
     } catch (emailError) {
       console.error("Student email error:", emailError.message);
     }

     // Send notification to admin
     try {
       const adminSubject = `New Application - ${student.firstName} ${student.lastName}`;
       const adminHtml = `
         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
           <h2 style="color: #1e3a5f;">New Application Received</h2>
           <table style="width: 100%; border-collapse: collapse;">
             <tr>
               <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Name:</strong></td>
               <td style="padding: 10px; border-bottom: 1px solid #eee;">${student.firstName} ${student.lastName}</td>
             </tr>
             <tr>
               <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
               <td style="padding: 10px; border-bottom: 1px solid #eee;">${student.email}</td>
             </tr>
             <tr>
               <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td>
               <td style="padding: 10px; border-bottom: 1px solid #eee;">${student.phone}</td>
             </tr>
             <tr>
               <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Program:</strong></td>
               <td style="padding: 10px; border-bottom: 1px solid #eee;">${student.program}</td>
             </tr>
             <tr>
               <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Payment:</strong></td>
               <td style="padding: 10px; border-bottom: 1px solid #eee;">Paid - ${transactionId}</td>
             </tr>
             <tr>
               <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Applied:</strong></td>
               <td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date().toLocaleString()}</td>
             </tr>
           </table>
         </div>
       `;
       await sendEmail("legendcollege25@gmail.com", adminSubject, adminHtml);
     } catch (emailError) {
       console.error("Admin email error:", emailError.message);
     }

     // Render success page
     res.render("success", {
       title: "Application Submitted | Legend College",
       email: student.email,
       applicationId
     });

   } catch (error) {
     console.error("Payment error:", error);
     const student = await Student.findById(req.session.studentId);
     res.render("payment", {
       title: "Payment | Legend College",
       student,
       error: "Payment processing failed. Please try again."
     });
   }
 });

// Admin Login
router.post("/admin-login", asyncHandler(async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.render("admin-login", {
        title: "Admin Login | Legend College",
        error: "Invalid username or password"
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.render("admin-login", {
        title: "Admin Login | Legend College",
        error: "Invalid username or password"
      });
    }

    if (admin.role !== 'admin') {
      return res.render("admin-login", {
        title: "Admin Login | Legend College",
        error: "Access denied. Admin privileges required."
      });
    }

    req.session.adminId = admin._id;
    res.redirect('/admin-dashboard');

  } catch (error) {
    console.error("Admin login error:", error);
    res.render("admin-login", {
      title: "Admin Login | Legend College",
      error: "Login failed. Please try again."
    });
  }
}));

// Staff Login
router.post("/staff-login", asyncHandler(async (req, res) => {
  try {
    const { username, password } = req.body;

    const staff = await Admin.findOne({ username });
    if (!staff) {
      return res.render("staff-login", {
        title: "Staff Login | Legend College",
        error: "Invalid username or password"
      });
    }

    const isMatch = await staff.comparePassword(password);
    if (!isMatch) {
      return res.render("staff-login", {
        title: "Staff Login | Legend College",
        error: "Invalid username or password"
      });
    }

    // Ensure only staff can login through this route
    if (staff.role !== 'staff') {
      return res.render("staff-login", {
        title: "Staff Login | Legend College",
        error: "Access denied. Staff credentials required."
      });
    }

    req.session.staffId = staff._id;
    res.redirect('/staff-dashboard');

  } catch (error) {
    console.error("Staff login error:", error);
    res.render("staff-login", {
      title: "Staff Login | Legend College",
      error: "Login failed. Please try again."
    });
  }
}));

// Admin update student status
router.post("/admin/update-status", requireAdmin, async (req, res) => {
  try {
    const { studentId, status } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      const students = await Student.find().sort({ createdAt: -1 });
      const stats = {
        total: students.length,
        pending: students.filter(s => s.applicationStatus === 'submitted' || s.applicationStatus === 'under_review').length,
        approved: students.filter(s => s.applicationStatus === 'approved').length,
        rejected: students.filter(s => s.applicationStatus === 'rejected').length
      };
      const admin = await Admin.findById(req.session.adminId);
      return res.render("admin-dashboard", {
        title: "Admin Dashboard | Legend College",
        admin,
        students,
        stats,
        error: "Student not found",
        success: null
      });
    }

    student.applicationStatus = status;
    await student.save();

    // Send email notification to student
    try {
      const statusText = status === 'approved' ? 'Approved' : 'Rejected';
      const subject = `Application ${statusText} - Legend College of Nursing And Emergency Health Sciences Nnewi`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a5f;">Application ${statusText}</h2>
          <p>Dear <strong>${student.firstName} ${student.lastName}</strong>,</p>
          <p>Your application for the <strong>${student.program}</strong> program has been <strong>${statusText}</strong>.</p>
          ${status === 'approved' ? '<p>Congratulations! We look forward to welcoming you to Legend College of Nursing And Emergency Health Sciences Nnewi.</p>' : '<p>We regret to inform you that your application was not successful this time. We encourage you to apply again in the future.</p>'}
          <p>Best regards,<br>Legend College of Nursing And Emergency Health Sciences Nmewi</p>
        </div>
      `;
      await sendEmail(student.email, subject, html);
    } catch (emailError) {
      console.error("Status update email error:", emailError.message);
    }
const students = await Student.find().sort({ createdAt: -1 });

      const pendingPayments = await Student.countDocuments({ paymentStatus: 'pending' });
      const paidStudents = await Student.countDocuments({ paymentStatus: 'paid' });
      const unpaidStudents = await Student.countDocuments({ paymentStatus: 'unpaid' });

      const stats = {
        total: students.length,
        pending: students.filter(s => s.applicationStatus === 'submitted' || s.applicationStatus === 'under_review').length,
        approved: students.filter(s => s.applicationStatus === 'approved').length,
        rejected: students.filter(s => s.applicationStatus === 'rejected').length,
        pendingPayments,
        paidStudents,
        unpaidStudents
      };
    const admin = await Admin.findById(req.session.adminId);

    // Get status text for success message
    const statusText = status === 'approved' ? 'Approved' : 'Rejected';

    res.render("admin-dashboard", {
      title: "Admin Dashboard | Legend College",
      admin,
      students,
      stats,
      error: null,
      success: "Application " + statusText + " successfully"
    });

  } catch (error) {
    console.error("Status update error:", error);
    res.redirect('/admin-dashboard');
  }
});

// Export router
module.exports = router;

