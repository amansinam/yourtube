import express from "express";
import {
  getComments,
  postComment,
  editComment,
  deleteComment,
  toggleReaction,
} from "../controllers/commentController.js";

const router = express.Router();

router.get("/:videoid", getComments);
router.post("/postcomment", postComment);
router.post("/editcomment/:id", editComment);
router.delete("/deletecomment/:id", deleteComment);
router.post("/:id/reaction", toggleReaction);

export default router;
