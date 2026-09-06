import express from "express";
import {
  getHistory,
  addHistory,
  addAnonymousView,
} from "../controllers/historyController.js";

const router = express.Router();

router.get("/:userId", getHistory);
router.post("/views/:videoId", addAnonymousView);
router.post("/:videoId", addHistory);

export default router;
