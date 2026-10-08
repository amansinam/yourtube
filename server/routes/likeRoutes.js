import express from "express";
import { getLikedVideos, toggleLike } from "../controllers/likeController.js";
import { requireSession } from "../middleware/auth.js";

const router = express.Router();

router.get("/:userId", requireSession, getLikedVideos);
router.post("/:videoId", requireSession, toggleLike);

export default router;
