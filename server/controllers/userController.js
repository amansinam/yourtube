import mongoose from "mongoose";
import User from "../Modals/User.js";
import LoginEvent from "../Modals/LoginEvent.js";
import TrustedDevice from "../Modals/TrustedDevice.js";
import AppSession from "../Modals/AppSession.js";
import { cookieOptions, hashSecret, randomToken, requestDetails, SESSION_COOKIE } from "../lib/security.js";

const MINUTE = 60_000;
const sessionDays = () => Number(process.env.SESSION_DAYS || 7);
const istTheme = () => Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hourCycle: "h23" }).format()) >= 5 && Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hourCycle: "h23" }).format()) < 18 ? "light" : "dark";
const safeUser = (user) => {
  const source = user.toObject ? user.toObject() : user;
  // Firebase UID is an internal identity link and is not needed by the browser.
  const { firebaseUid, ...publicUser } = source;
  return { ...publicUser, effectiveTheme: user.themePreference || istTheme() };
};
const record = (user, status, req) => LoginEvent.create({ user: user._id, status, ...requestDetails(req) });

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
export async function loginUser(req, res) {
  try {
    const user = await userForFirebase(req);
    await session(user, res);
    await record(user, "login_success", req);
    return res.json({ success: true, authenticated: true, user: safeUser(user) });
  } catch (error) {
    console.error("Google sign-in session error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to complete Google sign-in" });
  }
}
export async function logoutUser(req, res) {
  await AppSession.findByIdAndDelete(req.sessionId);
  res.clearCookie(SESSION_COOKIE, cookieOptions(0));
  return res.json({ success: true });
}
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
