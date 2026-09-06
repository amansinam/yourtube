import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Video } from "@/lib/types";
import VideoThumbnail from "./VideoThumbnail";

function formatViews(views: number) {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
  return `${views} view${views === 1 ? "" : "s"}`;
}

export default function VideoCard({ video }: { video: Video }) {
  let timeAgo = "";
  try {
    timeAgo = formatDistanceToNow(new Date(video.createdAt), { addSuffix: true });
  } catch {
    timeAgo = "";
  }

  return (
    <Link href={`/watch/${video._id}`} className="block group">
      <div className="w-full aspect-video rounded-xl overflow-hidden">
        <VideoThumbnail video={video} className="w-full h-full" />
      </div>
      <div className="flex gap-3 mt-3">
        <div className="w-9 h-9 rounded-full bg-gray-300 shrink-0 flex items-center justify-center text-sm font-semibold text-gray-700">
          {video.videochanel?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:underline">
            {video.videotitle}
          </h3>
          <p className="text-xs text-gray-600 mt-1 line-clamp-1">{video.videochanel}</p>
          <p className="text-xs text-gray-600">
            {formatViews(video.views)}
            {timeAgo && ` • ${timeAgo}`}
          </p>
        </div>
      </div>
    </Link>
  );
}
