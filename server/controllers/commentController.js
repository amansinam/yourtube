import mongoose from "mongoose";
import Comment from "../Modals/Comment.js";

// GET /comment/:videoid
export async function getComments(req, res) {
  try {
    const { videoid } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoid)) {
      return res.status(400).json({ success: false, message: "Invalid video id" });
    }

    const comments = await Comment.find({ videoid }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, comments });
  } catch (err) {
    console.error("getComments error:", err);
    return res.status(500).json({ success: false, message: "Server error while fetching comments" });
  }
}

// POST /comment/postcomment
export async function postComment(req, res) {
  try {
    const { userid, videoid, commentbody, usercommented } = req.body;

    if (!videoid || !commentbody) {
      return res.status(400).json({ success: false, message: "videoid and commentbody are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(videoid)) {
      return res.status(400).json({ success: false, message: "Invalid video id" });
    }

    const comment = await Comment.create({
      userid: userid && mongoose.Types.ObjectId.isValid(userid) ? userid : undefined,
      videoid,
      commentbody,
      usercommented: usercommented || "",
    });

    return res.status(201).json({ success: true, comment });
  } catch (err) {
    console.error("postComment error:", err);
    return res.status(500).json({ success: false, message: "Server error while posting comment" });
  }
}

// POST /comment/editcomment/:id
export async function editComment(req, res) {
  try {
    const { id } = req.params;
    const { commentbody } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid comment id" });
    }

    if (!commentbody) {
      return res.status(400).json({ success: false, message: "commentbody is required" });
    }

    const updated = await Comment.findByIdAndUpdate(id, { commentbody }, { new: true });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    return res.status(200).json({ success: true, comment: updated });
  } catch (err) {
    console.error("editComment error:", err);
    return res.status(500).json({ success: false, message: "Server error while editing comment" });
  }
}

// DELETE /comment/deletecomment/:id
export async function deleteComment(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid comment id" });
    }

    const deleted = await Comment.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    return res.status(200).json({ success: true, message: "Comment deleted" });
  } catch (err) {
    console.error("deleteComment error:", err);
    return res.status(500).json({ success: false, message: "Server error while deleting comment" });
  }
}
