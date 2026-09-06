import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    videoid: { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true },
    commentbody: { type: String, required: true, trim: true },
    usercommented: { type: String, default: "" },
    commentedon: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Comment", commentSchema);
