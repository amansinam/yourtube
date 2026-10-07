import mongoose from "mongoose";
import History from "../Modals/History.js";
import Video from "../Modals/Video.js";
import { normalizeFilename } from "../filehelper/pathHelper.js";

function serializeVideo(video) {
  if (!video) return null;
  const obj = video.toObject ? video.toObject() : video;
  return { ...obj, filename: normalizeFilename(obj.filepath || obj.filename) };
}

// GET /history/:userId
export async function getHistory(req, res) {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const history = await History.find({ viewer: userId })
      .sort({ likedon: -1, updatedAt: -1 })
      .populate("videoid");

    // Older versions created a row for every view. Keep only the most recent
    // row for each video in the response so history stays clean immediately,
    // even before old duplicate documents are removed.
    const seenVideos = new Set();
    const uniqueHistory = history.filter((entry) => {
      const id = entry.videoid?._id ? String(entry.videoid._id) : String(entry.videoid);
      if (seenVideos.has(id)) return false;
      seenVideos.add(id);
      return true;
    });

    return res.status(200).json({
      success: true,
      history: uniqueHistory.map((h) => ({
        ...h.toObject(),
        videoid: serializeVideo(h.videoid),
      })),
    });
  } catch (err) {
    console.error("getHistory error:", err);
    return res.status(500).json({ success: false, message: "Server error while fetching history" });
  }
}

// POST /history/:videoId  -> add authenticated view to history
export async function addHistory(req, res) {
  try {
    const { videoId } = req.params;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ success: false, message: "Invalid video id" });
    }
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Valid userId is required" });
    }

    // One row per viewer/video: repeat views refresh its position in history.
    // This keeps the page like YouTube's history instead of showing duplicates.
    let entry = await History.findOneAndUpdate(
      { viewer: userId, videoid: videoId },
      { $set: { likedon: new Date() } },
      { new: true }
    );
    if (!entry) {
      entry = await History.create({ viewer: userId, videoid: videoId });
    }

    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });

    return res.status(201).json({ success: true, history: entry });
  } catch (err) {
    console.error("addHistory error:", err);
    return res.status(500).json({ success: false, message: "Server error while adding history" });
  }
}

// POST /history/views/:videoId -> anonymous view increment (no auth required)
export async function addAnonymousView(req, res) {
  try {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ success: false, message: "Invalid video id" });
    }

    const video = await Video.findByIdAndUpdate(
      videoId,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" });
    }

    return res.status(200).json({ success: true, views: video.views });
  } catch (err) {
    console.error("addAnonymousView error:", err);
    return res.status(500).json({ success: false, message: "Server error while recording view" });
  }
}
