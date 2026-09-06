import mongoose from "mongoose";
import WatchLater from "../Modals/WatchLater.js";
import { normalizeFilename } from "../filehelper/pathHelper.js";

function serializeVideo(video) {
  if (!video) return null;
  const obj = video.toObject ? video.toObject() : video;
  return { ...obj, filename: normalizeFilename(obj.filepath || obj.filename) };
}

// GET /watch/:userId -> all videos saved for later
export async function getWatchLater(req, res) {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const saved = await WatchLater.find({ viewer: userId }).populate("videoid").sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      videos: saved.map((s) => serializeVideo(s.videoid)).filter(Boolean),
    });
  } catch (err) {
    console.error("getWatchLater error:", err);
    return res.status(500).json({ success: false, message: "Server error while fetching watch later list" });
  }
}

// POST /watch/:videoId -> toggle save/unsave
export async function toggleWatchLater(req, res) {
  try {
    const { videoId } = req.params;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ success: false, message: "Invalid video id" });
    }
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Valid userId is required" });
    }

    const existing = await WatchLater.findOne({ viewer: userId, videoid: videoId });

    if (existing) {
      await WatchLater.findByIdAndDelete(existing._id);
      return res.status(200).json({ success: true, saved: false });
    }

    await WatchLater.create({ viewer: userId, videoid: videoId });
    return res.status(200).json({ success: true, saved: true });
  } catch (err) {
    console.error("toggleWatchLater error:", err);
    return res.status(500).json({ success: false, message: "Server error while toggling watch later" });
  }
}
