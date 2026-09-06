import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/router";
import axios from "axios";
import api from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB, matches backend limit

export default function VideoUploader({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Some browsers/Windows file associations leave File.type empty even for
    // valid MP4 files, so also accept the trusted .mp4 extension here.
    if (selected.type !== "video/mp4" && !selected.name.toLowerCase().endsWith(".mp4")) {
      toast.error("Only MP4 files are supported");
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      toast.error("File is too large (max 50MB)");
      return;
    }
    setFile(selected);
  }

  async function handleUpload() {
    if (!user) {
      toast.error("Sign in to upload");
      return;
    }
    if (!title.trim() || !file) {
      toast.error("Add a title and choose an MP4 file");
      return;
    }

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("video", file);
    formData.append("videotitle", title.trim());
    formData.append("videochanel", user.channelname || user.name || user.email);
    formData.append("uploader", user._id);

    try {
      const { data } = await api.post("/video/upload", formData, {
        onUploadProgress: (evt) => {
          if (evt.total) {
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        },
      });

      toast.success("Video uploaded");
      onClose();
      if (data?.video?._id) {
        router.push(`/watch/${data.video._id}`);
      }
    } catch (err) {
      console.error(err);
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : "Upload failed. Please try again.";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && !uploading && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[60]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl w-full max-w-md p-6 z-[70]">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">Upload video</Dialog.Title>
            <button onClick={onClose} disabled={uploading} className="p-1 hover:bg-gray-100 rounded-full">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Video title"
                className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">MP4 file</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,.mp4"
                onChange={handleFileChange}
                className="sr-only"
                aria-label="Choose an MP4 video"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-1 w-full border border-dashed border-gray-300 rounded-md px-3 py-3 text-sm text-gray-700 hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
              >
                {file ? `Selected: ${file.name}` : "Choose video (MP4, max 50MB)"}
              </button>
            </div>

            {uploading && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full bg-blue-600 text-white rounded-full py-2 text-sm font-medium disabled:opacity-50"
            >
              {uploading ? `Uploading... ${progress}%` : "Upload"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
