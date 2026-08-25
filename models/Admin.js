const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// =====================================================
// ADMIN / STAFF SCHEMA
// =====================================================

const adminSchema = new mongoose.Schema(
  {
    // ===================================================
    // LOGIN DETAILS
    // ===================================================

    username: {
      type: String,

      required: true,

      unique: true,

      trim: true
    },

    email: {
      type: String,

      required: true,

      unique: true,

      lowercase: true,

      trim: true
    },

    password: {
      type: String,

      required: true
    },

    // ===================================================
    // ROLE
    // ===================================================

    role: {
      type: String,

      enum: [
        "admin",
        "staff"
      ],

      default: "admin",

      index: true
    },

    // ===================================================
    // PERSONAL INFORMATION
    // ===================================================

    fullName: {
      type: String,

      required: true,

      trim: true
    },

    // ===================================================
    // ACCOUNT STATUS
    // ===================================================

    isActive: {
      type: Boolean,

      default: true,

      index: true
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

adminSchema.pre(
  "save",
  async function () {

    if (
      this.isModified("password")
    ) {

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

adminSchema.methods.comparePassword =
  async function (
    candidatePassword
  ) {

    if (
      !candidatePassword ||
      !this.password
    ) {
      return false;
    }

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
    "Admin",
    adminSchema
  );