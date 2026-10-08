import express from "express";
import {
  getHistory,
  addHistory,
  addAnonymousView,
  getProgress,
  saveProgress,
} from "../controllers/historyController.js";
import { requireSession } from "../middleware/auth.js";

const router = express.Router();

router.get("/progress/:videoId", requireSession, getProgress);
router.put("/progress/:videoId", requireSession, saveProgress);
router.post("/views/:videoId", addAnonymousView);
router.post("/:videoId", requireSession, addHistory);
router.get("/:userId", requireSession, getHistory);

export default router;
