import mongoose from "mongoose";
import Comment from "../Modals/Comment.js";
import CommentReaction from "../Modals/CommentReaction.js";
import User from "../Modals/User.js";
import Video from "../Modals/Video.js";

const MAX_COMMENT_LENGTH = 1000;
const EDIT_WINDOW_MS = 15 * 60 * 1000;

function validId(id) { return mongoose.Types.ObjectId.isValid(id); }
function cleanText(value) {
  return String(value || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
function authorOf(user) {
  if (!user || !user._id) return null;
  return { _id: String(user._id), name: user.channelname || user.name || user.email, image: user.image || "" };
}
function sortDefinition(sort) {
  if (sort === "oldest") return { createdAt: 1 };
  if (sort === "liked") return { likeCount: -1, createdAt: -1 };
  if (sort === "relevant") return { likeCount: -1, dislikeCount: 1, createdAt: -1 };
  return { createdAt: -1 };
}

async function mentionIds(text) {
  const handles = [...new Set([...text.matchAll(/@([\p{L}\p{N}_.-]{2,40})/gu)].map((match) => match[1]))];
  if (!handles.length) return [];
  const users = await User.find({ channelname: { $in: handles.map((name) => new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")) } }).select("_id");
  return users.map((user) => user._id);
}

function serialize(comment, reaction) {
  const item = comment.toObject ? comment.toObject() : comment;
  const user = item.userid && typeof item.userid === "object" ? item.userid : null;
  return {
    ...item,
    userid: user?._id ? String(user._id) : item.userid ? String(item.userid) : "",
    author: authorOf(user),
    viewerReaction: reaction || null,
    replies: [],
  };
}

export async function getComments(req, res) {
  try {
    const { videoid } = req.params;
    const { sort = "newest", viewerId } = req.query;
    if (!validId(videoid)) return res.status(400).json({ success: false, message: "Invalid video id" });
    if (viewerId && !validId(viewerId)) return res.status(400).json({ success: false, message: "Invalid user id" });

    const comments = await Comment.find({ videoid }).populate("userid", "name channelname image email").sort(sortDefinition(sort));
    const reactions = viewerId ? await CommentReaction.find({ user: viewerId, comment: { $in: comments.map((comment) => comment._id) } }) : [];
    const reactionMap = new Map(reactions.map((item) => [String(item.comment), item.reaction]));
    const byId = new Map(comments.map((comment) => [String(comment._id), serialize(comment, reactionMap.get(String(comment._id)))]));
    const roots = [];
    for (const comment of comments) {
      const output = byId.get(String(comment._id));
      const parent = comment.parentComment && byId.get(String(comment.parentComment));
      if (parent) parent.replies.push(output);
      else if (!comment.parentComment) roots.push(output);
    }
    for (const item of byId.values()) item.replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return res.status(200).json({ success: true, comments: roots });
  } catch (err) {
    console.error("getComments error:", err);
    return res.status(500).json({ success: false, message: "Server error while fetching comments" });
  }
}

export async function postComment(req, res) {
  try {
    const { userid, videoid, commentbody, parentComment } = req.body;
    const text = cleanText(commentbody);
    if (!validId(userid) || !validId(videoid)) return res.status(400).json({ success: false, message: "A valid signed-in user and video are required" });
    if (!text) return res.status(400).json({ success: false, message: "Comment cannot be empty" });
    if (text.length > MAX_COMMENT_LENGTH) return res.status(400).json({ success: false, message: `Comments must be ${MAX_COMMENT_LENGTH} characters or fewer` });
    const [user, video] = await Promise.all([User.findById(userid), Video.findById(videoid)]);
    if (!user || !video) return res.status(404).json({ success: false, message: "User or video was not found" });
    if (parentComment) {
      if (!validId(parentComment)) return res.status(400).json({ success: false, message: "Invalid parent comment" });
      const parent = await Comment.findOne({ _id: parentComment, videoid });
      if (!parent) return res.status(404).json({ success: false, message: "Parent comment was not found" });
    }
    const duplicate = await Comment.findOne({ userid, videoid, parentComment: parentComment || null, commentbody: text, createdAt: { $gte: new Date(Date.now() - 60 * 1000) } });
    if (duplicate) return res.status(429).json({ success: false, message: "Please wait before posting the same comment again" });
    const comment = await Comment.create({ userid, videoid, parentComment: parentComment || null, commentbody: text, usercommented: user.channelname || user.name || user.email, mentions: await mentionIds(text) });
    await comment.populate("userid", "name channelname image email");
    return res.status(201).json({ success: true, comment: serialize(comment) });
  } catch (err) {
    console.error("postComment error:", err);
    return res.status(500).json({ success: false, message: "Server error while posting comment" });
  }
}

export async function editComment(req, res) {
  try {
    const { id } = req.params; const { userId, commentbody } = req.body; const text = cleanText(commentbody);
    if (!validId(id) || !validId(userId)) return res.status(400).json({ success: false, message: "Invalid comment or user id" });
    if (!text || text.length > MAX_COMMENT_LENGTH) return res.status(400).json({ success: false, message: "Enter a valid comment of 1 to 1000 characters" });
    const comment = await Comment.findById(id);
    if (!comment || comment.isDeleted) return res.status(404).json({ success: false, message: "Comment not found" });
    if (String(comment.userid) !== String(userId)) return res.status(403).json({ success: false, message: "You can edit only your own comment" });
    if (Date.now() - new Date(comment.createdAt).getTime() > EDIT_WINDOW_MS) return res.status(403).json({ success: false, message: "Comments can only be edited for 15 minutes" });
    comment.commentbody = text; comment.editedAt = new Date(); comment.mentions = await mentionIds(text); await comment.save();
    return res.status(200).json({ success: true, comment });
  } catch (err) { console.error("editComment error:", err); return res.status(500).json({ success: false, message: "Server error while editing comment" }); }
}

export async function deleteComment(req, res) {
  try {
    const { id } = req.params; const { userId } = req.body;
    if (!validId(id) || !validId(userId)) return res.status(400).json({ success: false, message: "Invalid comment or user id" });
    const comment = await Comment.findById(id);
    if (!comment || comment.isDeleted) return res.status(404).json({ success: false, message: "Comment not found" });
    if (String(comment.userid) !== String(userId)) return res.status(403).json({ success: false, message: "You can delete only your own comment" });
    comment.isDeleted = true; comment.commentbody = ""; await comment.save(); await CommentReaction.deleteMany({ comment: comment._id });
    return res.status(200).json({ success: true, message: "Comment deleted" });
  } catch (err) { console.error("deleteComment error:", err); return res.status(500).json({ success: false, message: "Server error while deleting comment" }); }
}

export async function toggleReaction(req, res) {
  try {
    const { id } = req.params; const { userId, reaction } = req.body;
    if (!validId(id) || !validId(userId) || !["like", "dislike"].includes(reaction)) return res.status(400).json({ success: false, message: "Invalid reaction request" });
    const comment = await Comment.findById(id);
    if (!comment || comment.isDeleted) return res.status(404).json({ success: false, message: "Comment not found" });
    const previous = await CommentReaction.findOne({ comment: id, user: userId });
    if (previous?.reaction === reaction) { await previous.deleteOne(); await Comment.findByIdAndUpdate(id, { $inc: { [reaction === "like" ? "likeCount" : "dislikeCount"]: -1 } }); }
    else if (previous) { const oldField = previous.reaction === "like" ? "likeCount" : "dislikeCount"; const newField = reaction === "like" ? "likeCount" : "dislikeCount"; previous.reaction = reaction; await previous.save(); await Comment.findByIdAndUpdate(id, { $inc: { [oldField]: -1, [newField]: 1 } }); }
    else { await CommentReaction.create({ comment: id, user: userId, reaction }); await Comment.findByIdAndUpdate(id, { $inc: { [reaction === "like" ? "likeCount" : "dislikeCount"]: 1 } }); }
    const updated = await Comment.findById(id);
    return res.status(200).json({ success: true, likeCount: updated.likeCount, dislikeCount: updated.dislikeCount, viewerReaction: previous?.reaction === reaction ? null : reaction });
  } catch (err) { console.error("toggleReaction error:", err); return res.status(500).json({ success: false, message: "Server error while updating reaction" }); }
}
