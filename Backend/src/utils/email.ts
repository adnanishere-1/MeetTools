import nodemailer from 'nodemailer';
import { logger } from './logger.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Google App Password yahan aayega
  },
});

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const info = await transporter.sendMail({
      from: `"SnapResize Support" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    logger.info(`📧 Email sent successfully to ${to}: ${info.messageId}`);
    return true;
  } catch (error: any) {
    logger.error(`❌ Failed to send email to ${to}:`, error);
    throw new Error(`Email sending failed: ${error.message}`);
  }
}