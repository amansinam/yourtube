import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { Video } from "@/lib/types";
import VideoGrid from "./VideoGrid";

interface HistoryEntry {
  _id: string;
  videoid: Video | null;
  createdAt: string;
}

export default function HistoryContent() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
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
        const { data } = await api.get(`/history/${user!._id}`);
        if (!cancelled) setEntries(data.history || []);
      } catch (err) {
        console.error("Failed to load history:", err);
        if (!cancelled) setError("Couldn't load your watch history.");
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
        <p className="text-gray-700 font-medium">Sign in to see your watch history.</p>
      </div>
    );
  }

  const videos = entries.map((e) => e.videoid).filter((v): v is Video => Boolean(v));

  return (
    <VideoGrid
      videos={videos}
      loading={loading || authLoading}
      error={error}
      emptyMessage="Videos you watch will show up here."
    />
  );
}
