import { useEffect, useState } from "react";
import Link from "next/link";
import { ThumbsUp, Clock, Check } from "lucide-react";
import { toast } from "sonner";
import { Video } from "@/lib/types";
import { useAuth } from "@/lib/AuthContext";
import api from "@/lib/api";

function formatViews(views: number) {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
  return `${views} view${views === 1 ? "" : "s"}`;
}

export default function VideoInfo({ video }: { video: Video }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(video.Like);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLikeCount(video.Like);
  }, [video.Like]);

  // Best-effort check of whether the current user already liked / saved this
  // video, so the buttons reflect real state instead of always starting off.
  useEffect(() => {
    if (!user) {
      setLiked(false);
      setSaved(false);
      return;
    }

    let cancelled = false;

    async function checkStatus() {
      try {
        const [likedRes, savedRes] = await Promise.all([
          api.get(`/like/${user!._id}`),
          api.get(`/watch/${user!._id}`),
        ]);
        if (cancelled) return;
        const likedIds = (likedRes.data?.videos || []).map((v: Video) => v._id);
        const savedIds = (savedRes.data?.videos || []).map((v: Video) => v._id);
        setLiked(likedIds.includes(video._id));
        setSaved(savedIds.includes(video._id));
      } catch (err) {
        console.error("Failed to check like/save status:", err);
      }
    }

    checkStatus();
    return () => {
      cancelled = true;
    };
  }, [user, video._id]);

  async function handleLike() {
    if (!user) {
      toast.error("Sign in to like videos");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post(`/like/${video._id}`, { userId: user._id });
      setLiked(data.liked);
      setLikeCount((c) => c + (data.liked ? 1 : -1));
    } catch (err) {
      console.error(err);
      toast.error("Couldn't update like");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!user) {
      toast.error("Sign in to save videos");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post(`/watch/${video._id}`, { userId: user._id });
      setSaved(data.saved);
      toast.success(data.saved ? "Saved to Watch Later" : "Removed from Watch Later");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't update Watch Later");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <h1 className="text-lg font-semibold text-gray-900">{video.videotitle}</h1>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
        <Link
          href={video.uploader ? `/channel/${video.uploader}` : "#"}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center font-semibold text-gray-700">
            {video.videochanel?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="font-medium text-sm text-gray-900">{video.videochanel}</p>
            <p className="text-xs text-gray-500">{formatViews(video.views)}</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLike}
            disabled={busy}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
              liked ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            <ThumbsUp size={16} />
            {likeCount}
          </button>
          <button
            onClick={handleSave}
            disabled={busy}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
              saved ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            {saved ? <Check size={16} /> : <Clock size={16} />}
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
