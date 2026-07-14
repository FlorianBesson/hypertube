import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

async function testSMTP() {
  console.log("Testing SMTP connection with:");
  console.log("Host:", process.env.SMTP_HOST || 'smtp-relay.brevo.com');
  console.log("Port:", process.env.SMTP_PORT || '587');
  console.log("User:", process.env.SMTP_USER);
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    debug: true, // show debug output
    logger: true // log information in console
  });

  try {
    const success = await transporter.verify();
    console.log("✅ Verification successful! Server is ready to take our messages.", success);
  } catch (error) {
    console.error("❌ Verification failed:");
    console.error(error);
  }
}

testSMTP();
