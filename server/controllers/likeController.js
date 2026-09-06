import mongoose from "mongoose";
import Like from "../Modals/Like.js";
import Video from "../Modals/Video.js";
import { normalizeFilename } from "../filehelper/pathHelper.js";

function serializeVideo(video) {
  if (!video) return null;
  const obj = video.toObject ? video.toObject() : video;
  return { ...obj, filename: normalizeFilename(obj.filepath || obj.filename) };
}

// GET /like/:userId -> all videos this user has liked
export async function getLikedVideos(req, res) {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const likes = await Like.find({ viewer: userId }).populate("videoid").sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      videos: likes.map((l) => serializeVideo(l.videoid)).filter(Boolean),
    });
  } catch (err) {
    console.error("getLikedVideos error:", err);
    return res.status(500).json({ success: false, message: "Server error while fetching liked videos" });
  }
}

// POST /like/:videoId -> toggle like on/off for a user
export async function toggleLike(req, res) {
  try {
    const { videoId } = req.params;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ success: false, message: "Invalid video id" });
    }
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Valid userId is required" });
    }

    const existing = await Like.findOne({ viewer: userId, videoid: videoId });

    if (existing) {
      await Like.findByIdAndDelete(existing._id);
      await Video.findByIdAndUpdate(videoId, { $inc: { Like: -1 } });
      return res.status(200).json({ success: true, liked: false });
    }

    await Like.create({ viewer: userId, videoid: videoId });
    await Video.findByIdAndUpdate(videoId, { $inc: { Like: 1 } });

    return res.status(200).json({ success: true, liked: true });
  } catch (err) {
    console.error("toggleLike error:", err);
    return res.status(500).json({ success: false, message: "Server error while toggling like" });
  }
}
