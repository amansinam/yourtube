import express from "express";
import { loginUser, updateUser, getUserById } from "../controllers/userController.js";

const router = express.Router();

router.post("/login", loginUser);
router.patch("/update/:id", updateUser);
// Added so the channel page can load ANY channel by id, not just the logged-in user
router.get("/:id", getUserById);

export default router;
