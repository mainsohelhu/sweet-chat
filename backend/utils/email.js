const nodemailer = require('nodemailer');

exports.sendEmail = async ({ to, subject, html, text }) => {
  const emailUser = process.env.EMAIL_USER || 'officialnextgenweb@gmail.com';
  const emailPass = process.env.EMAIL_PASS || 'gekwxzfczcsvgdip';

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Sweetchat" <${emailUser}>`,
      to,
      subject,
      html,
      text,
    });
    return true;
  } catch (err) {
    console.error('Email send error:', err.message);
    return false;
  }
};
