import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true },
    name: { type: String, default: "" },
    channelname: { type: String, default: "" },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    firebaseUid: { type: String, default: "", unique: true, sparse: true },
    themePreference: { type: String, enum: ["light", "dark", null], default: null },
    joinedon: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
