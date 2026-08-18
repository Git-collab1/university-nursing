const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const studentSchema = new mongoose.Schema({
  // Application Details
  receiptNo: {
    type: String,
    default: ''
  },
  admissionNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  applicationDate: {
    type: Date,
    default: Date.now
  },
  passportPhoto: {
    type: String,
    default: ''
  },

  // Personal Information
  title: {
    type: String,
    enum: ['Mr.', 'Miss', 'Mrs.', ''],
    default: ''
  },
  firstName: {
    type: String,
    trim: true,
    default: ''
  },
  lastName: {
    type: String,
    trim: true,
    default: ''
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
    default: ''
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', ''],
    default: ''
  },
  maritalStatus: {
    type: String,
    enum: ['Single', 'Married', 'Divorced', 'Widowed', ''],
    default: ''
  },
  maidenName: {
    type: String,
    default: ''
  },

  // Address Information
  contactAddress: {
    type: String,
    default: ''
  },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' }
  },

  // Location Information
  stateOfOrigin: {
    type: String,
    default: ''
  },
  nationality: {
    type: String,
    default: ''
  },
  localGovernmentArea: {
    type: String,
    default: ''
  },

  // Extra Curricular & Medical
  extraCurricularActivities: {
    type: String,
    default: ''
  },
  medicalHistory: {
    type: String,
    default: ''
  },
  genotype: {
    type: String,
    enum: ['AA', 'AS', 'SS', 'AC', ''],
    default: ''
  },

  // Parent Information - Father
  fatherFullName: {
    type: String,
    default: ''
  },
  fatherContactAddress: {
    type: String,
    default: ''
  },
  fatherPhone: {
    type: String,
    default: ''
  },
  fatherEmail: {
    type: String,
    default: ''
  },

  // Parent Information - Mother
  motherFullName: {
    type: String,
    default: ''
  },
  motherMaidenName: {
    type: String,
    default: ''
  },
  motherContactAddress: {
    type: String,
    default: ''
  },
  motherPhone: {
    type: String,
    default: ''
  },
  motherEmail: {
    type: String,
    default: ''
  },

  // Guardian Information (alternative to parents)
  guardianName: {
    type: String,
    default: ''
  },
  guardianPhone: {
    type: String,
    default: ''
  },
  guardianRelationship: {
    type: String,
    default: ''
  },

  // Choice of Course
  program: {
    type: String,
    enum: ['HND Nursing', 'BNSc Nursing', ''],
    default: ''
  },
  programTransfer: {
    type: String,
    enum: ['Yes', 'No', ''],
    default: ''
  },

  // Education - Examination Type
  examinationTaken: {
    type: String,
    enum: ['WAEC', 'NECO', 'Both', 'Others', ''],
    default: ''
  },
  otherExamination: {
    type: String,
    default: ''
  },

  // Education - Examination Results Uploads
  waecResult: {
    type: String,
    default: ''
  },
  necoResult: {
    type: String,
    default: ''
  },

  // Education - Examination Results Table
  examinationResults: [{
    examinationName: { type: String, default: '' },
    examinationDate: { type: String, default: '' },
    examinationNo: { type: String, default: '' },
    subjects: [{ subject: String, grade: String }]
  }],

  // Credentials
  credentialsEnclosed: {
    type: Boolean,
    default: false
  },
  awaitingResult: {
    type: Boolean,
    default: false
  },

  // Introduction Source
  introductionSource: {
    type: String,
    enum: ['Advertisement', 'Student', 'Parent', 'Staff', 'Other', ''],
    default: ''
  },
  otherSource: {
    type: String,
    default: ''
  },

  // Declaration
  declaration: {
    type: Boolean,
    default: false
  },
  declarationDate: {
    type: Date
  },

  // Academic Information
  oLevelResult: {
    type: String,
    default: ''
  },
  previousSchool: {
    type: String,
    default: ''
  },

// Payment Information
    matricNumber: {
      type: String,
      default: ''
    },
    paymentStatus: {
     type: String,
     enum: ['pending', 'paid', 'failed', 'unpaid'],
     default: 'pending'
   },
    paymentAmount: {
      type: Number,
      default: 20000
    },
   paymentReference: {
     type: String
   },
   paymentDate: {
     type: Date
   },
   paymentReceipt: {
     type: String,
     default: ''
   },
   paymentRejectionReason: {
     type: String,
     default: ''
   },
   bankUsed: {
     type: String,
     default: ''
   },

  // Application Status
  applicationStatus: {
    type: String,
    enum: ['not_started', 'form_completed', 'submitted', 'under_review', 'approved', 'rejected'],
    default: 'not_started'
  },

  // Authentication
  password: {
    type: String,
    required: true
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
studentSchema.pre('save', async function() {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  this.updatedAt = Date.now();
});

// Compare password method
studentSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Student', studentSchema);

