import Link from "next/link";
import { Video } from "@/lib/types";
import VideoThumbnail from "./VideoThumbnail";

function formatViews(views: number) {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
  return `${views} view${views === 1 ? "" : "s"}`;
}

export default function RelatedVideos({
  videos,
  currentVideoId,
}: {
  videos: Video[];
  currentVideoId: string;
}) {
  const related = videos.filter((v) => v._id !== currentVideoId);

  if (related.length === 0) {
    return <p className="text-sm text-gray-500 px-2">No other videos yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {related.map((video) => (
        <Link key={video._id} href={`/watch/${video._id}`} className="flex gap-2 group">
          <div className="w-40 aspect-video rounded-lg shrink-0 overflow-hidden">
            <VideoThumbnail video={video} className="w-full h-full" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:underline">
              {video.videotitle}
            </h4>
            <p className="text-xs text-gray-600 mt-1 line-clamp-1">{video.videochanel}</p>
            <p className="text-xs text-gray-500">{formatViews(video.views)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
