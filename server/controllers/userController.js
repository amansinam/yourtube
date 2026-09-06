import mongoose from "mongoose";
import User from "../Modals/User.js";

// POST /user/login  -> create-or-find user by email (called after Firebase Google login)
export async function loginUser(req, res) {
  try {
    const { email, name, image } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "email is required" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        name: name || "",
        image: image || "",
        channelname: name || email.split("@")[0],
      });
    }

    return res.status(200).json({ success: true, user });
  } catch (err) {
    console.error("loginUser error:", err);
    // Two requests for a newly authenticated user can arrive at the same
    // time. If the other request created the user first, return that record
    // instead of turning a successful sign-in into a 500 response.
    if (err?.code === 11000 && req.body?.email) {
      const existingUser = await User.findOne({ email: req.body.email });
      if (existingUser) {
        return res.status(200).json({ success: true, user: existingUser });
      }
    }
    return res.status(500).json({ success: false, message: "Server error while logging in" });
  }
}

// PATCH /user/update/:id -> update channel name/description/image
export async function updateUser(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const { channelname, description, image, name } = req.body;

    const updated = await User.findByIdAndUpdate(
      id,
      {
        ...(channelname !== undefined && { channelname }),
        ...(description !== undefined && { description }),
        ...(image !== undefined && { image }),
        ...(name !== undefined && { name }),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, user: updated });
  } catch (err) {
    console.error("updateUser error:", err);
    return res.status(500).json({ success: false, message: "Server error while updating user" });
  }
}

// GET /user/:id -> fetch a single user/channel by id (needed to fix channel page
// only showing the logged-in user instead of the channel in the URL)
export async function getUserById(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, user });
  } catch (err) {
    console.error("getUserById error:", err);
    return res.status(500).json({ success: false, message: "Server error while fetching user" });
  }
}
