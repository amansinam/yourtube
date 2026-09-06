import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set UPLOAD_DIR on a host with persistent storage. Locally we keep uploads
// in server/uploads so no additional setup is required.
const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// NOTE (production): this writes to local disk. On Render this storage is
// ephemeral and files can disappear after a restart/redeploy. Swap this
// storage engine for Cloudinary / AWS S3 / Azure Blob Storage before relying
// on this in production. See README "Known limitations".
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const ALLOWED_MIME_TYPES = ["video/mp4"];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error("Only MP4 video files are allowed"));
  }
  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

export { uploadDir };
