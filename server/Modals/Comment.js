import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    videoid: { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true },
    commentbody: { type: String, required() { return !this.isDeleted; }, trim: true },
    usercommented: { type: String, default: "" },
    commentedon: { type: Date, default: Date.now },
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    likeCount: { type: Number, default: 0, min: 0 },
    dislikeCount: { type: Number, default: 0, min: 0 },
    editedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

commentSchema.index({ videoid: 1, parentComment: 1, createdAt: -1 });

export default mongoose.model("Comment", commentSchema);
