// utils/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.EMAIL_USER) {
    console.warn('Email not configured — skipping send to:', to);
    return;
  }
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || `Sweetchat <no-reply@sweetchat.app>`,
    to,
    subject,
    html,
    text,
  });
};
