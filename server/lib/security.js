import crypto from "crypto";
import { UAParser } from "ua-parser-js";

export const SESSION_COOKIE = "yourtube_session";
export const hashSecret = (value) => crypto.createHash("sha256").update(value).digest("hex");
export const randomToken = () => crypto.randomBytes(32).toString("base64url");

export function requestDetails(req) {
  const parsed = new UAParser(req.get("user-agent") || "").getResult();
  const ip = String(req.headers["x-forwarded-for"] || req.ip || "Unknown").split(",")[0].trim();
  return {
    ip,
    browser: parsed.browser.name || "Unknown",
    browserVersion: parsed.browser.version || "",
    os: parsed.os.name || "Unknown",
    deviceType: parsed.device.type || "desktop",
    deviceModel: parsed.device.model || "",
    userAgent: req.get("user-agent") || "",
    location: { city: "Unknown", state: "Unknown", country: "Unknown", source: "unavailable" },
  };
}

export function cookieOptions(maxAge) {
  const secure = process.env.NODE_ENV === "production";
  return { httpOnly: true, secure, sameSite: secure ? "none" : "lax", path: "/", maxAge };
}
