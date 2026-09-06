import express from "express";
import { getWatchLater, toggleWatchLater } from "../controllers/watchLaterController.js";

const router = express.Router();

router.get("/:userId", getWatchLater);
router.post("/:videoId", toggleWatchLater);

export default router;
