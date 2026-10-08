import express from "express";
import { deleteVideo, getAllVideos, uploadVideo } from "../controllers/videoController.js";
import { upload } from "../filehelper/upload.js";
import { requireSession } from "../middleware/auth.js";

const router = express.Router();

router.get("/getall", getAllVideos);
router.post("/upload", requireSession, upload.single("video"), uploadVideo);
router.delete("/:videoId", requireSession, deleteVideo);

export default router;
