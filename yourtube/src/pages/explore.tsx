import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import CategoryTabs from "@/components/CategoryTabs";
import VideoGrid from "@/components/VideoGrid";
import api from "@/lib/api";
import { Video } from "@/lib/types";

export default function Explore() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get("/video/getall");
        // "Explore" shows the same catalog sorted by views since there is no
        // separate trending/explore data source in the backend yet.
        const sorted = [...(data.videos || [])].sort((a, b) => b.views - a.views);
        if (!cancelled) setVideos(sorted);
      } catch (err) {
        console.error("Failed to load videos:", err);
        if (!cancelled) setError("Couldn't reach the server. Is the backend running?");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Layout title="Explore - YourTube">
      <CategoryTabs />
      <VideoGrid
        videos={videos}
        loading={loading}
        error={error}
        emptyMessage="No videos to explore yet."
      />
    </Layout>
  );
}
