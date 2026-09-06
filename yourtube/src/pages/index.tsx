import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import CategoryTabs from "@/components/CategoryTabs";
import VideoGrid from "@/components/VideoGrid";
import api from "@/lib/api";
import { Video } from "@/lib/types";

export default function Home() {
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
        if (!cancelled) setVideos(data.videos || []);
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
    <Layout title="YourTube">
      <CategoryTabs />
      <VideoGrid
        videos={videos}
        loading={loading}
        error={error}
        emptyMessage="No videos have been uploaded yet. Be the first!"
      />
    </Layout>
  );
}
