import express from "express";
import { getWatchLater, toggleWatchLater } from "../controllers/watchLaterController.js";
import { requireSession } from "../middleware/auth.js";

const router = express.Router();

router.get("/:userId", requireSession, getWatchLater);
router.post("/:videoId", requireSession, toggleWatchLater);

export default router;
