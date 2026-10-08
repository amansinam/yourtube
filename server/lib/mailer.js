import nodemailer from "nodemailer";

const subject = "YourTube sign-in verification code";
const textFor = (code) => `Your YourTube verification code is ${code}. It expires in ${Number(process.env.OTP_EXPIRY_MINUTES || 10)} minutes. If you did not sign in, you can ignore this email.`;
const brevoConfigured = () => Boolean(process.env.BREVO_API_KEY && (process.env.BREVO_SENDER_EMAIL || process.env.OTP_FROM_EMAIL));
const smtpConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.OTP_FROM_EMAIL);

// Brevo uses HTTPS (port 443), which works on Render's free tier. SMTP remains
// supported for local development and other hosts. Brevo takes precedence when
// its API key is configured.
export function mailConfigured() {
  return brevoConfigured() || smtpConfigured();
}

async function sendWithBrevo(to, code) {
  const sender = process.env.BREVO_SENDER_EMAIL || process.env.OTP_FROM_EMAIL;
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
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
  if (!response.ok) throw new Error(`Brevo email API rejected the request (${response.status})`);
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
  if (brevoConfigured()) return sendWithBrevo(to, code);
  if (smtpConfigured()) return sendWithSmtp(to, code);
  throw new Error("OTP email is not configured");
}
