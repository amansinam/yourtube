import mongoose from "mongoose";
import User from "../Modals/User.js";
import LoginEvent from "../Modals/LoginEvent.js";
import OtpChallenge from "../Modals/OtpChallenge.js";
import TrustedDevice from "../Modals/TrustedDevice.js";
import AppSession from "../Modals/AppSession.js";
import { cookieOptions, hashSecret, randomOtp, randomToken, requestDetails, SESSION_COOKIE, TRUST_COOKIE } from "../lib/security.js";
import { MailDeliveryError, mailConfigurationMessage, mailConfigured, sendOtpEmail } from "../lib/mailer.js";

const MINUTE = 60_000;
const otpExpiry = () => Number(process.env.OTP_EXPIRY_MINUTES || 10);
const otpAttempts = () => Number(process.env.OTP_MAX_ATTEMPTS || 5);
const trustDays = () => Number(process.env.TRUST_DEVICE_DAYS || 30);
const sessionDays = () => Number(process.env.SESSION_DAYS || 7);
const istTheme = () => Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hourCycle: "h23" }).format()) >= 5 && Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hourCycle: "h23" }).format()) < 18 ? "light" : "dark";
const safeUser = (user) => {
  const source = user.toObject ? user.toObject() : user;
  // Firebase UID is an internal identity link and is not needed by the browser.
  const { firebaseUid, ...publicUser } = source;
  return { ...publicUser, effectiveTheme: user.themePreference || istTheme() };
};
const record = (user, status, req, otpVerified = false) => LoginEvent.create({ user: user._id, status, ...requestDetails(req), otpVerified });

async function userForFirebase(req) {
  const { uid, email, name, picture } = req.firebaseUser;
  if (!email) throw new Error("Firebase account does not include an email");
  let user = await User.findOne({ $or: [{ firebaseUid: uid }, { email }] });
  if (!user) user = await User.create({ email, firebaseUid: uid, name: name || "", image: picture || "", channelname: name || email.split("@")[0] });
  else if (!user.firebaseUid) { user.firebaseUid = uid; await user.save(); }
  return user;
}
async function session(user, res) {
  const raw = randomToken(), days = sessionDays();
  await AppSession.create({ user: user._id, tokenHash: hashSecret(raw), expiresAt: new Date(Date.now() + days * 1440 * MINUTE) });
  res.cookie(SESSION_COOKIE, raw, cookieOptions(days * 1440 * MINUTE));
}
async function trust(user, req, res) {
  const raw = randomToken(), days = trustDays(), d = requestDetails(req);
  await TrustedDevice.create({ user: user._id, tokenHash: hashSecret(raw), label: `${d.browser} on ${d.os}`, browser: d.browser, os: d.os, deviceType: d.deviceType, lastIp: d.ip, expiresAt: new Date(Date.now() + days * 1440 * MINUTE) });
  res.cookie(TRUST_COOKIE, raw, cookieOptions(days * 1440 * MINUTE));
  await record(user, "trusted_device_created", req, true);
}

export async function loginUser(req, res) {
  try {
    const user = await userForFirebase(req), token = req.cookies?.[TRUST_COOKIE];
    const device = token && await TrustedDevice.findOne({ user: user._id, tokenHash: hashSecret(token), expiresAt: { $gt: new Date() } });
    if (device) {
      device.lastUsedAt = new Date(); device.lastIp = requestDetails(req).ip; await device.save();
      await session(user, res); await record(user, "login_success", req, true);
      return res.json({ success: true, authenticated: true, user: safeUser(user) });
    }
    if (!mailConfigured()) { await record(user, "login_denied", req); return res.status(503).json({ success: false, message: mailConfigurationMessage() }); }
    const existing = await OtpChallenge.findOne({ user: user._id, usedAt: null, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
    if (existing && existing.resendAvailableAt > new Date()) return res.status(202).json({ success: true, otpRequired: true, challengeId: existing._id, expiresIn: Math.max(0, Math.ceil((existing.expiresAt - Date.now()) / 1000)), resendAvailableIn: Math.ceil((existing.resendAvailableAt - Date.now()) / 1000) });
    const code = randomOtp(), expiry = otpExpiry();
    // Do not leave a challenge that the user cannot complete when email delivery rejects
    // delivery. The OTP exists only in memory until mail delivery succeeds.
    await sendOtpEmail(user.email, code);
    const challenge = await OtpChallenge.create({ user: user._id, codeHash: hashSecret(code), expiresAt: new Date(Date.now() + expiry * MINUTE), resendAvailableAt: new Date(Date.now() + Number(process.env.OTP_RESEND_SECONDS || 60) * 1000), ...requestDetails(req) });
    await record(user, "otp_required", req); await record(user, "otp_sent", req);
    return res.status(202).json({ success: true, otpRequired: true, challengeId: challenge._id, expiresIn: expiry * 60, resendAvailableIn: Math.ceil((challenge.resendAvailableAt - Date.now()) / 1000) });
  } catch (error) { console.error("secure login error:", error.message); if (error instanceof MailDeliveryError) return res.status(503).json({ success: false, message: error.message }); return res.status(500).json({ success: false, message: "Unable to start secure sign-in" }); }
}
export async function resendOtp(req, res) {
  try {
    const user = await userForFirebase(req);
    const { challengeId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(challengeId)) {
      return res.status(400).json({ success: false, message: "A valid verification request is required" });
    }
    const challenge = await OtpChallenge.findOne({
      _id: challengeId,
      user: user._id,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });
    if (!challenge) {
      return res.status(400).json({ success: false, message: "This verification request has expired. Sign in again to request a new code." });
    }
    const resendAvailableIn = Math.ceil((challenge.resendAvailableAt - Date.now()) / 1000);
    if (resendAvailableIn > 0) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${resendAvailableIn} seconds before requesting another code`,
        resendAvailableIn,
      });
    }
    if (!mailConfigured()) {
      return res.status(503).json({ success: false, message: mailConfigurationMessage() });
    }

    const code = randomOtp();
    await sendOtpEmail(user.email, code);
    challenge.codeHash = hashSecret(code);
    challenge.attempts = 0;
    challenge.resendAvailableAt = new Date(Date.now() + Number(process.env.OTP_RESEND_SECONDS || 60) * 1000);
    await challenge.save();
    await record(user, "otp_sent", req);
    return res.json({
      success: true,
      otpRequired: true,
      challengeId: challenge._id,
      expiresIn: Math.max(0, Math.ceil((challenge.expiresAt - Date.now()) / 1000)),
      resendAvailableIn: Math.ceil((challenge.resendAvailableAt - Date.now()) / 1000),
    });
  } catch (error) {
    console.error("OTP resend error:", error.message);
    if (error instanceof MailDeliveryError) return res.status(503).json({ success: false, message: error.message });
    return res.status(500).json({ success: false, message: "Unable to resend verification code" });
  }
}
export async function verifyOtp(req, res) {
  try {
    const user = await userForFirebase(req), { challengeId, code, trustDevice = false } = req.body;
    if (!mongoose.Types.ObjectId.isValid(challengeId) || !/^\d{6}$/.test(String(code || ""))) return res.status(400).json({ success: false, message: "A valid verification code is required" });
    const challenge = await OtpChallenge.findOne({ _id: challengeId, user: user._id, usedAt: null });
    if (!challenge || challenge.expiresAt <= new Date() || challenge.attempts >= otpAttempts()) { await record(user, "otp_failure", req); return res.status(400).json({ success: false, message: "Verification code is expired, invalid, or locked" }); }
    if (challenge.codeHash !== hashSecret(String(code))) { challenge.attempts += 1; await challenge.save(); await record(user, "otp_failure", req); return res.status(400).json({ success: false, message: "Incorrect verification code" }); }
    challenge.usedAt = new Date(); await challenge.save();
    if (trustDevice) await trust(user, req, res);
    await session(user, res); await record(user, "otp_success", req, true); await record(user, "login_success", req, true);
    return res.json({ success: true, authenticated: true, user: safeUser(user) });
  } catch (error) { console.error("OTP verification error:", error.message); return res.status(500).json({ success: false, message: "Unable to verify code" }); }
}
export async function logoutUser(req, res) { await AppSession.findByIdAndDelete(req.sessionId); res.clearCookie(SESSION_COOKIE, cookieOptions(0)); return res.json({ success: true }); }
export async function getCurrentUser(req, res) {
  const user = await User.findById(req.authUserId);
  // A Firebase account change in the same browser must not inherit the
  // previous account's cookie-backed application session.
  if (!user || user.firebaseUid !== req.firebaseUser.uid) {
    return res.status(401).json({ success: false, message: "Session does not belong to this account" });
  }
  return res.json({ success: true, user: safeUser(user) });
}
export async function updateTheme(req, res) {
  if (!["light", "dark"].includes(req.body.theme)) return res.status(400).json({ success: false, message: "Theme must be light or dark" });
  const user = await User.findByIdAndUpdate(req.authUserId, { themePreference: req.body.theme }, { new: true }); return res.json({ success: true, user: safeUser(user) });
}
export async function getSecurity(req, res) { const [events, devices] = await Promise.all([LoginEvent.find({ user: req.authUserId }).sort({ createdAt: -1 }).limit(50), TrustedDevice.find({ user: req.authUserId }).sort({ lastUsedAt: -1 })]); return res.json({ success: true, events, devices }); }
export async function revokeDevice(req, res) { const device = await TrustedDevice.findOneAndDelete({ _id: req.params.deviceId, user: req.authUserId }); if (!device) return res.status(404).json({ success: false, message: "Trusted device not found" }); await LoginEvent.create({ user: req.authUserId, status: "trusted_device_revoked", ...requestDetails(req) }); return res.json({ success: true }); }
export async function updateUser(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id) || req.params.id !== req.authUserId) return res.status(403).json({ success: false, message: "You can only update your own profile" });
  const { channelname, description, image, name } = req.body;
  const user = await User.findByIdAndUpdate(req.authUserId, { ...(channelname !== undefined && { channelname }), ...(description !== undefined && { description }), ...(image !== undefined && { image }), ...(name !== undefined && { name }) }, { new: true });
  return res.json({ success: true, user: safeUser(user) });
}
export async function getUserById(req, res) { if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid user id" }); const user = await User.findById(req.params.id); return user ? res.json({ success: true, user: safeUser(user) }) : res.status(404).json({ success: false, message: "User not found" }); }
