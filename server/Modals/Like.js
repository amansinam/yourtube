import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    viewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    videoid: { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true },
    likedon: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Enforce one like per user/video
likeSchema.index({ viewer: 1, videoid: 1 }, { unique: true });

export default mongoose.model("Like", likeSchema);
