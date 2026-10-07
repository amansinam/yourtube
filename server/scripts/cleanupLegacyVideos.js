import dotenv from "dotenv";
import mongoose from "mongoose";
import Comment from "../Modals/Comment.js";
import History from "../Modals/History.js";
import Like from "../Modals/Like.js";
import Video from "../Modals/Video.js";
import WatchLater from "../Modals/WatchLater.js";

dotenv.config();

const confirmed = process.argv.includes("--confirm");

async function main() {
  if (!process.env.DB_URL) {
    throw new Error("DB_URL is not set. Run this command from the server directory with server/.env configured.");
  }

  await mongoose.connect(process.env.DB_URL);

  const legacyVideos = await Video.find({
    $or: [{ videoUrl: { $exists: false } }, { videoUrl: "" }, { videoUrl: null }],
  }).select("_id videotitle filepath").lean();

  console.log(`Found ${legacyVideos.length} video records without a Cloudinary URL:`);
  for (const video of legacyVideos) {
    console.log(`- ${video._id} | ${video.videotitle} | ${video.filepath}`);
  }

  if (!confirmed) {
    console.log("Dry run only. Review this list, then run `npm run cleanup:legacy-videos -- --confirm` to delete these videos and related comments, likes, history, and Watch Later records.");
    return;
  }

  if (legacyVideos.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  const videoIds = legacyVideos.map((video) => video._id);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Comment.deleteMany({ videoid: { $in: videoIds } }, { session });
      await History.deleteMany({ videoid: { $in: videoIds } }, { session });
      await Like.deleteMany({ videoid: { $in: videoIds } }, { session });
      await WatchLater.deleteMany({ videoid: { $in: videoIds } }, { session });
      await Video.deleteMany({ _id: { $in: videoIds } }, { session });
    });
  } finally {
    await session.endSession();
  }

  console.log(`Deleted ${legacyVideos.length} legacy video records and their related records.`);
}

main()
  .catch((err) => {
    console.error("Legacy video cleanup failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });