import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Video } from "@/lib/types";
import VideoGrid from "./VideoGrid";

export default function SearchResult({ query }: { query: string }) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function search() {
      if (!query) {
        setVideos([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Fixes bug #7: this used to search hardcoded sample videos.
        // Now it hits GET /video/getall?q=... which does a real Mongo
        // regex match against videotitle.
        const { data } = await api.get("/video/getall", { params: { q: query } });
        if (!cancelled) setVideos(data.videos || []);
      } catch (err) {
        console.error("Search failed:", err);
        if (!cancelled) setError("Something went wrong while searching.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    search();
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div>
      <p className="px-4 pt-4 text-sm text-gray-600">
        {loading ? "Searching..." : `Results for "${query}"`}
      </p>
      <VideoGrid
        videos={videos}
        loading={loading}
        error={error}
        emptyMessage={`No results found for "${query}".`}
      />
    </div>
  );
}
