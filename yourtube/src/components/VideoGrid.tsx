import { Video } from "@/lib/types";
import VideoCard from "./VideoCard";

interface Props {
  videos: Video[];
  loading: boolean;
  error?: string | null;
  emptyMessage?: string;
}

export default function VideoGrid({ videos, loading, error, emptyMessage }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="w-full aspect-video bg-gray-200 rounded-xl" />
            <div className="flex gap-3 mt-3">
              <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <p className="text-gray-700 font-medium">Something went wrong loading videos.</p>
        <p className="text-gray-500 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <p className="text-gray-700 font-medium">
          {emptyMessage || "No videos here yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
      {videos.map((video) => (
        <VideoCard key={video._id} video={video} />
      ))}
    </div>
  );
}
