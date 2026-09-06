import mongoose from "mongoose";

const historySchema = new mongoose.Schema(
  {
    viewer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    videoid: { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true },
    likedon: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("History", historySchema);
