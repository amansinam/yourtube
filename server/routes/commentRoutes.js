import express from "express";
import {
  getComments,
  postComment,
  editComment,
  deleteComment,
} from "../controllers/commentController.js";

const router = express.Router();

router.get("/:videoid", getComments);
router.post("/postcomment", postComment);
router.post("/editcomment/:id", editComment);
router.delete("/deletecomment/:id", deleteComment);

export default router;
