import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import AppSession from "../Modals/AppSession.js";
import { SESSION_COOKIE, hashSecret } from "../lib/security.js";

let firebaseReady = false;
let firebaseAuth;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(rawServiceAccount);
    } catch {
      const normalizedServiceAccount = rawServiceAccount
        .replace(/\\"/g, '"')
        .replace(/\\\r?\n/g, "\\n");
      serviceAccount = JSON.parse(normalizedServiceAccount);
    }
    const app = initializeApp({ credential: cert(serviceAccount) });
    firebaseAuth = getAuth(app);
    firebaseReady = true;
  }
} catch (error) {
  console.error("Firebase Admin configuration is invalid:", error.message);
}

export async function requireFirebaseIdentity(req, res, next) {
  if (!firebaseReady) return res.status(503).json({ success: false, message: "Server authentication is not configured" });
  const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ success: false, message: "Firebase identity token is required" });
  try {
    req.firebaseUser = await firebaseAuth.verifyIdToken(token);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired Firebase identity token" });
  }
}

export async function requireSession(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return res.status(401).json({ success: false, message: "Sign in first" });
  const session = await AppSession.findOne({ tokenHash: hashSecret(token), expiresAt: { $gt: new Date() } });
  if (!session) return res.status(401).json({ success: false, message: "Session expired. Please sign in again." });
  req.authUserId = String(session.user);
  req.sessionId = String(session._id);
  next();
}
