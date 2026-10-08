import mongoose from "mongoose";

const historySchema = new mongoose.Schema(
  {
    viewer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    videoid: { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true },
    likedon: { type: Date, default: Date.now },
    // Kept on the existing one-row-per-user/video history record so viewing
    // history and resume state cannot drift into duplicate records.
    progressSeconds: { type: Number, default: 0, min: 0 },
    durationSeconds: { type: Number, default: 0, min: 0 },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("History", historySchema);
