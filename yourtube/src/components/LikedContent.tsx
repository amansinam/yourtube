import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { Video } from "@/lib/types";
import VideoGrid from "./VideoGrid";

export default function LikedContent() {
  const { user, loading: authLoading } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get(`/like/${user!._id}`);
        if (!cancelled) setVideos(data.videos || []);
      } catch (err) {
        console.error("Failed to load liked videos:", err);
        if (!cancelled) setError("Couldn't load your liked videos.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <p className="text-gray-700 font-medium">Sign in to see videos you've liked.</p>
      </div>
    );
  }

  return (
    <VideoGrid
      videos={videos}
      loading={loading || authLoading}
      error={error}
      emptyMessage="Videos you like will show up here."
    />
  );
}
