const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'officialnextgenweb@gmail.com',
    pass: 'hiktlnoknymtanhm',
  },
});

async function main() {
  try {
    console.log("Attempting to connect to Gmail SMTP...");
    await transporter.verify();
    console.log("Connection verified!");
    
    console.log("Sending test email...");
    const info = await transporter.sendMail({
      from: '"Test Server" <no-reply@sweetchat.app>',
      to: 'officialnextgenweb@gmail.com',
      subject: "SMTP Setup Test",
      text: "If you received this, the SMTP is powerfully configured perfectly!",
    });
    console.log("Success! Message sent: %s", info.messageId);
  } catch (err) {
    console.error("FATAL SMTP ERROR:");
    console.error(err);
  }
}

main();
