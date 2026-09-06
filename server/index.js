import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import videoRoutes from "./routes/videoRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";
import likeRoutes from "./routes/likeRoutes.js";
import watchRoutes from "./routes/watchRoutes.js";
import { uploadDir } from "./filehelper/upload.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ---- CORS ----
// FRONTEND_URL must exactly match the deployed frontend origin (no trailing slash).
// Locally this defaults to the Next.js dev server.
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- Health check ----
app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", message: "YourTube backend is running" });
});

// ---- Static uploaded videos ----
app.use("/uploads", express.static(uploadDir));

// ---- API routes ----
app.use("/video", videoRoutes);
app.use("/user", userRoutes);
app.use("/comment", commentRoutes);
app.use("/history", historyRoutes);
app.use("/like", likeRoutes);
app.use("/watch", watchRoutes);

// Turn Multer validation failures into useful JSON for the frontend instead
// of Express's default HTML error response.
app.use((err, req, res, next) => {
  if (err?.name === "MulterError") {
    const message = err.code === "LIMIT_FILE_SIZE"
      ? "Video is too large. The maximum upload size is 50MB."
      : err.message;
    return res.status(400).json({ success: false, message });
  }
  if (err?.message === "Only MP4 video files are allowed") {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

// ---- 404 fallback (always return JSON, never a bare 404 HTML page) ----
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ---- Global error handler ----
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;
const DB_URL = process.env.DB_URL;

if (!DB_URL) {
  console.error("DB_URL is not set. Create server/.env from .env.example.");
  process.exit(1);
}

mongoose
  .connect(DB_URL)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server listening on port ${PORT}`);
      console.log(`CORS allowed origin: ${FRONTEND_URL}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
