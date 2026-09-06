import mongoose from "mongoose";
import Video from "../Modals/Video.js";
import { normalizeFilename } from "../filehelper/pathHelper.js";

function serializeVideo(video) {
  const obj = video.toObject ? video.toObject() : video;
  return {
    ...obj,
    filename: normalizeFilename(obj.filepath || obj.filename),
  };
}

// GET /video/getall
// Supports optional query params:
//   ?q=searchTerm        -> filters by videotitle / channel (fixes mock-data search bug)
//   ?channel=userId       -> filters to one channel's videos (used by channel page)
export async function getAllVideos(req, res) {
  try {
    const { q, channel } = req.query;
    const filter = {};

    if (q) {
      filter.videotitle = { $regex: q, $options: "i" };
    }

    if (channel) {
      if (!mongoose.Types.ObjectId.isValid(channel)) {
        return res.status(400).json({ success: false, message: "Invalid channel id" });
      }
      filter.uploader = channel;
    }

    const videos = await Video.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      videos: videos.map(serializeVideo),
    });
  } catch (err) {
    console.error("getAllVideos error:", err);
    return res.status(500).json({ success: false, message: "Server error while fetching videos" });
  }
}

// POST /video/upload  (multipart/form-data, field name "video")
export async function uploadVideo(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No video file received" });
    }

    const { videotitle, videochanel, uploader } = req.body;

    if (!videotitle || !videochanel) {
      return res.status(400).json({ success: false, message: "videotitle and videochanel are required" });
    }

    if (uploader && !mongoose.Types.ObjectId.isValid(uploader)) {
      return res.status(400).json({ success: false, message: "Invalid uploader id" });
    }

    const video = await Video.create({
      videotitle,
      videochanel,
      uploader: uploader || undefined,
      filename: req.file.filename,
      filetype: req.file.mimetype,
      filepath: req.file.filename, // stored clean already (no backslashes) via multer diskStorage
      filesize: req.file.size,
    });

    return res.status(201).json({ success: true, video: serializeVideo(video) });
  } catch (err) {
    console.error("uploadVideo error:", err);
    return res.status(500).json({ success: false, message: "Server error while uploading video" });
  }
}
