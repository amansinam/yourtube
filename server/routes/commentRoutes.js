import express from "express";
import {
  getComments,
  postComment,
  editComment,
  deleteComment,
  toggleReaction,
} from "../controllers/commentController.js";
import { requireSession } from "../middleware/auth.js";

const router = express.Router();

router.get("/:videoid", getComments);
router.post("/postcomment", requireSession, postComment);
router.post("/editcomment/:id", requireSession, editComment);
router.delete("/deletecomment/:id", requireSession, deleteComment);
router.post("/:id/reaction", requireSession, toggleReaction);

export default router;
