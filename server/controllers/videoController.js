import mongoose from "mongoose";
import fs from "fs/promises";
import { v2 as cloudinary } from "cloudinary";
import Video from "../Modals/Video.js";
import Comment from "../Modals/Comment.js";
import Like from "../Modals/Like.js";
import History from "../Modals/History.js";
import WatchLater from "../Modals/WatchLater.js";
import { normalizeFilename } from "../filehelper/pathHelper.js";

function serializeVideo(video) {
  const obj = video.toObject ? video.toObject() : video;
  return {
    ...obj,
    filename: obj.videoUrl ? obj.filename : normalizeFilename(obj.filepath || obj.filename),
  };
}

function configureCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET on the backend.");
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

// GET /video/getall
// Supports optional query params:
//   ?q=searchTerm        -> filters by videotitle / channel (fixes mock-data search bug)
//   ?channel=userId       -> filters to one channel's videos (used by channel page)
//   ?category=Music       -> filters to a chosen upload category
export async function getAllVideos(req, res) {
  try {
    const { q, channel, category } = req.query;
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

    if (category) {
      filter.category = { $regex: `^${escapeRegex(String(category).trim())}$`, $options: "i" };
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
  let cloudinaryPublicId;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No video file received" });
    }

    const { videotitle, videochanel, category } = req.body;
    const uploader = req.authUserId;

    if (!videotitle || !videochanel) {
      return res.status(400).json({ success: false, message: "videotitle and videochanel are required" });
    }

    if (uploader && !mongoose.Types.ObjectId.isValid(uploader)) {
      return res.status(400).json({ success: false, message: "Invalid uploader id" });
    }

    if (category && String(category).trim().length > 50) {
      return res.status(400).json({ success: false, message: "Category must be 50 characters or fewer" });
    }

    configureCloudinary();
    const uploaded = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "video",
      folder: "yourtube/videos",
    });
    cloudinaryPublicId = uploaded.public_id;

    const thumbnailUrl = cloudinary.url(uploaded.public_id, {
      resource_type: "video",
      format: "jpg",
      transformation: [{ start_offset: "0" }],
      secure: true,
    });

    const video = await Video.create({
      videotitle,
      videochanel,
      category: String(category || "").trim(),
      uploader: uploader || undefined,
      filename: req.file.filename,
      filetype: req.file.mimetype,
      filepath: uploaded.secure_url,
      videoUrl: uploaded.secure_url,
      thumbnailUrl,
      cloudinaryPublicId: uploaded.public_id,
      filesize: req.file.size,
    });

    return res.status(201).json({ success: true, video: serializeVideo(video) });
  } catch (err) {
    console.error("uploadVideo error:", err);
    if (cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(cloudinaryPublicId, { resource_type: "video" });
      } catch (cleanupError) {
        console.error("Failed to clean up unreferenced Cloudinary video:", cleanupError);
      }
    }
    const message = err.message?.includes("Cloudinary is not configured")
      ? err.message
      : "Server error while uploading video";
    return res.status(500).json({ success: false, message });
  } finally {
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        if (cleanupError.code !== "ENOENT") {
          console.error("Failed to remove staged video:", cleanupError);
        }
      }
    }
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// DELETE /video/:videoId
// The request must name the same app user recorded as this video's uploader.
// Firebase token verification should be added before exposing this publicly.
export async function deleteVideo(req, res) {
  try {
    const { videoId } = req.params;
    const userId = req.authUserId;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ success: false, message: "Invalid video id" });
    }
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Valid userId is required" });
    }

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" });
    }
    if (!video.uploader || String(video.uploader) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Only the uploader can delete this video" });
    }

    await Promise.all([
      Comment.deleteMany({ videoid: video._id }),
      Like.deleteMany({ videoid: video._id }),
      History.deleteMany({ videoid: video._id }),
      WatchLater.deleteMany({ videoid: video._id }),
    ]);
    await Video.findByIdAndDelete(video._id);

    if (video.cloudinaryPublicId) {
      try {
        configureCloudinary();
        await cloudinary.uploader.destroy(video.cloudinaryPublicId, { resource_type: "video" });
      } catch (cleanupError) {
        console.error("Video record deleted but Cloudinary cleanup failed:", cleanupError);
      }
    }

    return res.status(200).json({ success: true, message: "Video deleted" });
  } catch (err) {
    console.error("deleteVideo error:", err);
    return res.status(500).json({ success: false, message: "Server error while deleting video" });
  }
}
