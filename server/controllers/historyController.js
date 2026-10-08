import mongoose from "mongoose";
import History from "../Modals/History.js";
import Video from "../Modals/Video.js";
import { normalizeFilename } from "../filehelper/pathHelper.js";

const completionPercent = () => {
  const configured = Number(process.env.WATCH_COMPLETION_PERCENT || 90);
  return Number.isFinite(configured) && configured > 0 && configured <= 100 ? configured : 90;
};

function serializeVideo(video) {
  if (!video) return null;
  const obj = video.toObject ? video.toObject() : video;
  return { ...obj, filename: normalizeFilename(obj.filepath || obj.filename) };
}

// GET /history/:userId
export async function getHistory(req, res) {
  try {
    const userId = req.authUserId;

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
    const userId = req.authUserId;

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

// GET /history/progress/:videoId -- session-bound resume position.
export async function getProgress(req, res) {
  try {
    const { videoId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ success: false, message: "Invalid video id" });
    }
    const history = await History.findOne({ viewer: req.authUserId, videoid: videoId });
    return res.json({
      success: true,
      progress: history ? {
        position: history.progressSeconds,
        duration: history.durationSeconds,
        completed: history.completed,
      } : null,
    });
  } catch (err) {
    console.error("getProgress error:", err);
    return res.status(500).json({ success: false, message: "Unable to load watch progress" });
  }
}

// PUT /history/progress/:videoId -- accepts only a bounded media position;
// it never uses a frontend user id to decide whose record is updated.
export async function saveProgress(req, res) {
  try {
    const { videoId } = req.params;
    const position = Number(req.body.position);
    const duration = Number(req.body.duration);
    if (!mongoose.Types.ObjectId.isValid(videoId) || !Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) {
      return res.status(400).json({ success: false, message: "Valid video progress is required" });
    }
    const safeDuration = Math.min(duration, 60 * 60 * 24);
    const safePosition = Math.min(Math.max(position, 0), safeDuration);
    const completed = safePosition / safeDuration >= completionPercent() / 100;
    const history = await History.findOneAndUpdate(
      { viewer: req.authUserId, videoid: videoId },
      { $set: { progressSeconds: safePosition, durationSeconds: safeDuration, completed, likedon: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return res.json({ success: true, progress: { position: history.progressSeconds, duration: history.durationSeconds, completed: history.completed } });
  } catch (err) {
    console.error("saveProgress error:", err);
    return res.status(500).json({ success: false, message: "Unable to save watch progress" });
  }
}
