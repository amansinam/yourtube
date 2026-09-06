import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import VideoPlayer from "@/components/VideoPlayer";
import VideoInfo from "@/components/VideoInfo";
import RelatedVideos from "@/components/RelatedVideos";
import Comments from "@/components/Comments";
import api from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { Video } from "@/lib/types";

export default function WatchPage() {
  const router = useRouter();
  const { id } = router.query;
  const videoId = typeof id === "string" ? id : "";
  const { user } = useAuth();

  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const viewRecordedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!videoId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // The spec's backend has no GET /video/:id, so - matching the
        // documented flow - we fetch all videos and select the matching id.
        const { data } = await api.get("/video/getall");
        if (cancelled) return;

        const videos: Video[] = data.videos || [];
        setAllVideos(videos);

        const match = videos.find((v) => v._id === videoId) || null;
        if (!match) {
          setError("Video not found.");
        }
        setVideo(match);
      } catch (err) {
        console.error("Failed to load video:", err);
        if (!cancelled) setError("Couldn't reach the server. Is the backend running?");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  // Record a view once per video load: authenticated history if signed in,
  // otherwise an anonymous view increment.
  useEffect(() => {
    if (!video || viewRecordedFor.current === video._id) return;
    viewRecordedFor.current = video._id;

    async function recordView() {
      try {
        if (user) {
          await api.post(`/history/${video!._id}`, { userId: user._id });
        } else {
          await api.post(`/history/views/${video!._id}`);
        }
      } catch (err) {
        console.error("Failed to record view:", err);
      }
    }

    recordView();
  }, [video, user]);

  return (
    <Layout title={video ? `${video.videotitle} - YourTube` : "YourTube"}>
      <div className="flex flex-col lg:flex-row gap-6 p-4">
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="w-full aspect-video bg-gray-200 rounded-xl animate-pulse" />
          ) : error || !video ? (
            <div className="w-full aspect-video bg-gray-100 rounded-xl flex items-center justify-center text-gray-500">
              {error || "Video not found."}
            </div>
          ) : (
            <>
              <VideoPlayer video={video} />
              <VideoInfo video={video} />
              <Comments videoId={video._id} />
            </>
          )}
        </div>

        <div className="w-full lg:w-96 shrink-0">
          {!loading && video && <RelatedVideos videos={allVideos} currentVideoId={video._id} />}
        </div>
      </div>
    </Layout>
  );
}
