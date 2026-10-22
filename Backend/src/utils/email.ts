import nodemailer from 'nodemailer';
import { logger } from './logger.js';

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
    // Check credentials inside the function so dotenv is fully loaded
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('EMAIL_USER or EMAIL_PASS is missing in environment variables (.env)');
    }

    // Transporter ko function ke andar banaya gaya hai taaki yeh hamesha loaded .env values uthaye
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"MeetTools Support" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    
    logger.info(`📧 Email sent successfully to ${to}: ${info.messageId}`);
    return true;
  } catch (error: any) {
    logger.error(`❌ Failed to send email to ${to}:`, error);
    throw new Error(`Email sending failed: ${error.message || error}`);
  }
}