import mongoose from "mongoose";

const loginEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, required: true, enum: ["otp_required", "otp_sent", "otp_success", "otp_failure", "login_success", "login_denied", "trusted_device_created", "trusted_device_revoked"] },
    ip: { type: String, default: "Unknown" },
    browser: { type: String, default: "Unknown" },
    browserVersion: { type: String, default: "" },
    os: { type: String, default: "Unknown" },
    deviceType: { type: String, default: "Unknown" },
    deviceModel: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    location: {
      city: { type: String, default: "Unknown" },
      state: { type: String, default: "Unknown" },
      country: { type: String, default: "Unknown" },
      source: { type: String, default: "unavailable" },
    },
    otpVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("LoginEvent", loginEventSchema);
