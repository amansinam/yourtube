import nodemailer from "nodemailer";

const subject = "YourTube sign-in verification code";
const textFor = (code) => `Your YourTube verification code is ${code}. It expires in ${Number(process.env.OTP_EXPIRY_MINUTES || 10)} minutes. If you did not sign in, you can ignore this email.`;
const brevoConfigured = () => Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
const smtpConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.OTP_FROM_EMAIL);

export class MailDeliveryError extends Error {
  constructor(message) {
    super(message);
    this.name = "MailDeliveryError";
  }
}

// Brevo uses HTTPS (port 443), which works on Render's free tier. SMTP remains
// supported for local development and other hosts. Brevo takes precedence when
// its API key is configured.
export function mailConfigured() {
  return brevoConfigured() || smtpConfigured();
}

export function mailConfigurationMessage() {
  if (process.env.BREVO_API_KEY && !process.env.BREVO_SENDER_EMAIL) return "Brevo sender email is not configured on the server";
  if (brevoConfigured() || smtpConfigured()) return null;
  return "OTP email is not configured on the server";
}

async function sendWithBrevo(to, code) {
  const sender = process.env.BREVO_SENDER_EMAIL;
  let response;
  try {
    response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: sender, name: "YourTube" },
        to: [{ email: to }],
        subject,
        textContent: textFor(code),
      }),
    });
  } catch {
    throw new MailDeliveryError("Brevo could not be reached. Check the server's outbound HTTPS connection.");
  }
  if (!response.ok) {
    const messages = {
      400: "Brevo rejected the sender or recipient. Verify the sender email in Brevo.",
      401: "Brevo rejected the API key. Check that BREVO_API_KEY is an active v3 API key.",
      403: "Brevo denied email sending. Check the API key permissions and verified sender.",
    };
    throw new MailDeliveryError(messages[response.status] || `Brevo rejected the email request (HTTP ${response.status}).`);
  }
}

async function sendWithSmtp(to, code) {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({ from: process.env.OTP_FROM_EMAIL, to, subject, text: textFor(code) });
}

export async function sendOtpEmail(to, code) {
  if (brevoConfigured()) {
    try {
      return await sendWithBrevo(to, code);
    } catch (error) {
      if (error instanceof MailDeliveryError) throw error;
      throw new MailDeliveryError("Brevo email delivery failed. Check the server mail configuration and logs.");
    }
  }
  if (smtpConfigured()) {
    try {
      return await sendWithSmtp(to, code);
    } catch {
      throw new MailDeliveryError("SMTP email delivery failed. Check the server mail configuration and logs.");
    }
  }
  throw new Error("OTP email is not configured");
}
