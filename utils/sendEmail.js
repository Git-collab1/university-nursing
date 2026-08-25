// utils/sendEmail.js

const nodemailer = require("nodemailer");

// =====================================================
// SMTP TRANSPORTER
// =====================================================

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },

  timeout: 10000,

  connectionTimeout: 10000,

  greetingTimeout: 10000,

  socketTimeout: 10000
});

// =====================================================
// SEND EMAIL
// =====================================================

const sendEmail = async (
  to,
  subject,
  html
) => {

  if (!to) {
    throw new Error(
      "Recipient email address is required."
    );
  }

  if (!subject) {
    throw new Error(
      "Email subject is required."
    );
  }

  if (!html) {
    throw new Error(
      "Email HTML content is required."
    );
  }

  if (
    !process.env.EMAIL_USER ||
    !process.env.EMAIL_PASS
  ) {
    throw new Error(
      "EMAIL_USER or EMAIL_PASS is not configured."
    );
  }

  try {

    const info =
      await transporter.sendMail({
        from:
          `"Legend College Admission" <${process.env.EMAIL_USER}>`,

        to,

        subject,

        html
      });

    console.log(
      `Email sent to ${to}`
    );

    console.log(
      "Email message ID:",
      info.messageId
    );

    return info;

  } catch (error) {

    console.error(
      "Email send error:",
      error
    );

    // Let the route decide what to do.
    throw error;
  }
};

// =====================================================
// EXPORT
// =====================================================

module.exports =
  sendEmail;