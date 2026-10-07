import { DragEvent, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, FileVideo, Tag, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/router";
import axios from "axios";
import api from "@/lib/api";
import { VIDEO_CATEGORIES } from "@/lib/categories";
import { useAuth } from "@/lib/AuthContext";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function readableSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

export default function VideoUploader({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function selectFile(selected?: File) {
    if (!selected) return;
    if (selected.type !== "video/mp4" && !selected.name.toLowerCase().endsWith(".mp4")) return toast.error("Choose an MP4 video file");
    if (selected.size > MAX_FILE_SIZE) return toast.error("This file is too large. The limit is 50 MB.");
    setFile(selected);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  }

  async function handleUpload() {
    if (!user) return toast.error("Sign in to upload a video");
    if (!title.trim() || !file) return toast.error("Add a title and choose an MP4 file");
    setUploading(true);
    setProgress(0);
    const formData = new FormData();
    formData.append("video", file);
    formData.append("videotitle", title.trim());
    formData.append("videochanel", user.channelname || user.name || user.email);
    formData.append("uploader", user._id);
    if (category) formData.append("category", category);
    try {
      const { data } = await api.post("/video/upload", formData, { onUploadProgress: (event) => { if (event.total) setProgress(Math.round((event.loaded / event.total) * 100)); } });
      toast.success("Video uploaded successfully");
      onClose();
      if (data?.video?._id) router.push(`/watch/${data.video._id}`);
    } catch (error) {
      console.error(error);
      toast.error(axios.isAxiosError(error) ? error.response?.data?.message || error.message : "Upload failed. Please try again.");
    } finally { setUploading(false); }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && !uploading && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[60]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[70] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5"><div><Dialog.Title className="text-xl font-bold text-gray-900">Upload a video</Dialog.Title><Dialog.Description className="mt-1 text-sm text-gray-500">Share an MP4 with your channel. Add a category to help viewers discover it.</Dialog.Description></div><button onClick={onClose} disabled={uploading} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50" aria-label="Close upload dialog"><X size={20} /></button></div>
          <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
            <button type="button" onClick={() => fileInputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop} disabled={uploading} className={`w-full rounded-xl border-2 border-dashed p-6 text-center transition ${dragging ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-400 hover:bg-blue-50/50"} disabled:opacity-50`}>
              <input ref={fileInputRef} type="file" accept="video/mp4,.mp4" onChange={(event) => selectFile(event.target.files?.[0])} className="sr-only" />
              {file ? <CheckCircle2 className="mx-auto text-emerald-600" size={34} /> : <UploadCloud className="mx-auto text-blue-600" size={34} />}<p className="mt-3 font-semibold text-gray-900">{file ? file.name : "Drop your video here, or choose a file"}</p><p className="mt-1 text-sm text-gray-500">MP4 only · Maximum 50 MB</p>{file && <p className="mt-2 text-xs font-medium text-emerald-700">Ready to upload · {readableSize(file.size)}</p>}
            </button>
            <div><label htmlFor="video-title" className="text-sm font-semibold text-gray-800">Title <span className="font-normal text-gray-500">(required)</span></label><input id="video-title" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="Give your video a clear, descriptive title" disabled={uploading} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50" /><p className="mt-1 text-right text-xs text-gray-400">{title.length}/120</p></div>
            <div><label htmlFor="video-category" className="flex items-center gap-2 text-sm font-semibold text-gray-800"><Tag size={15} /> Category <span className="font-normal text-gray-500">(optional)</span></label><select id="video-category" value={category} onChange={(event) => setCategory(event.target.value)} disabled={uploading} className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"><option value="">No category</option>{VIDEO_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select><p className="mt-1 text-xs text-gray-500">Categorized videos appear when visitors use the filters on the home page.</p></div>
            {uploading && <div className="rounded-lg bg-blue-50 p-3"><div className="mb-2 flex justify-between text-xs font-medium text-blue-800"><span>Uploading your video…</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} /></div></div>}
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4"><p className="hidden text-xs text-gray-500 sm:flex sm:items-center sm:gap-1"><FileVideo size={14} /> Your video will be published after upload.</p><button onClick={handleUpload} disabled={uploading || !title.trim() || !file} className="ml-auto rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{uploading ? `Uploading ${progress}%` : "Publish video"}</button></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
