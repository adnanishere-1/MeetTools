
import { logger } from "./logger.js";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

interface BrevoResponse {
  messageId?: string;
  code?: string;
  message?: string;
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailOptions): Promise<boolean> {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.EMAIL_FROM;
    const senderName = process.env.EMAIL_FROM_NAME || "MeetTools";

    if (!apiKey || !senderEmail) {
      logger.error(
        "Brevo configuration missing: BREVO_API_KEY or EMAIL_FROM"
      );
      return false;
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: htmlToText(html),
      }),
    });

    const responseData = (await response.json().catch(() => ({}))) as BrevoResponse;

    if (!response.ok) {
      logger.error(
        {
          status: response.status,
          code: responseData.code,
          message: responseData.message,
        },
        "Brevo email sending failed"
      );
      return false;
    }

    logger.info(
      { messageId: responseData.messageId },
      "MeetTools email sent successfully through Brevo"
    );

    return true;
  } catch (error) {
    logger.error({ err: error }, "Brevo email sending failed");
    return false;
  }
}
