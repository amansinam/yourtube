import mongoose from "mongoose";

const watchLaterSchema = new mongoose.Schema(
  {
    viewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    videoid: { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true },
    likedon: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Enforce one saved record per user/video
watchLaterSchema.index({ viewer: 1, videoid: 1 }, { unique: true });

export default mongoose.model("WatchLater", watchLaterSchema);
