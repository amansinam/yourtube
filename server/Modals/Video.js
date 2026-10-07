import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    videotitle: { type: String, required: true, trim: true },
    filename: { type: String, required: true },
    filetype: { type: String, required: true },
    filepath: { type: String, required: true },
    videoUrl: { type: String, default: "" },
    thumbnailUrl: { type: String, default: "" },
    cloudinaryPublicId: { type: String, default: "" },
    filesize: { type: Number, required: true },
    videochanel: { type: String, required: true },
    category: { type: String, default: "", trim: true, maxlength: 50 },
    Like: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Video", videoSchema);
