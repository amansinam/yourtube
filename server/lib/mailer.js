import nodemailer from "nodemailer";

export function mailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.OTP_FROM_EMAIL);
}

export async function sendOtpEmail(to, code) {
  if (!mailConfigured()) throw new Error("OTP email is not configured");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({
    from: process.env.OTP_FROM_EMAIL,
    to,
    subject: "YourTube sign-in verification code",
    text: `Your YourTube verification code is ${code}. It expires in ${Number(process.env.OTP_EXPIRY_MINUTES || 10)} minutes. If you did not sign in, you can ignore this email.`,
  });
}
