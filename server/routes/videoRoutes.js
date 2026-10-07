import express from "express";
import { deleteVideo, getAllVideos, uploadVideo } from "../controllers/videoController.js";
import { upload } from "../filehelper/upload.js";

const router = express.Router();

router.get("/getall", getAllVideos);
router.post("/upload", upload.single("video"), uploadVideo);
router.delete("/:videoId", deleteVideo);

export default router;
