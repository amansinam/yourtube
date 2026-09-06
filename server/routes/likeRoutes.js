import express from "express";
import { getLikedVideos, toggleLike } from "../controllers/likeController.js";

const router = express.Router();

router.get("/:userId", getLikedVideos);
router.post("/:videoId", toggleLike);

export default router;
