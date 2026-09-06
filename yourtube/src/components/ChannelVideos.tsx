import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Video } from "@/lib/types";
import VideoGrid from "./VideoGrid";

export default function ChannelVideos({ channelId }: { channelId: string }) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Uses the ?channel= filter added to GET /video/getall so this shows
        // ONLY this channel's uploads (fixes bug #10 - channel page previously
        // only ever showed the logged-in user's own videos).
        const { data } = await api.get("/video/getall", {
          params: { channel: channelId },
        });
        if (!cancelled) setVideos(data.videos || []);
      } catch (err) {
        console.error("Failed to load channel videos:", err);
        if (!cancelled) setError("Couldn't load this channel's videos.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (channelId) load();
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  return (
    <VideoGrid
      videos={videos}
      loading={loading}
      error={error}
      emptyMessage="This channel hasn't uploaded any videos yet."
    />
  );
}
