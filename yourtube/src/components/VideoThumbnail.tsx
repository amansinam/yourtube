import { useState } from "react";
import { Video } from "@/lib/types";
import { getVideoUrl } from "@/lib/videoUrl";

/**
 * Uses the video's first decodable frame as a thumbnail. This keeps existing
 * uploads useful without requiring a separate image migration or a thumbnail
 * service. A text fallback is only shown when the video itself cannot load.
 */
export default function VideoThumbnail({
  video,
  className = "",
}: {
  video: Video;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`bg-gray-900 flex items-center justify-center ${className}`}>
        <span className="text-gray-400 text-xs px-2 text-center line-clamp-2">
          {video.videotitle}
        </span>
      </div>
    );
  }

  return (
    <video
      src={getVideoUrl(video.filename || video.filepath)}
      muted
      playsInline
      preload="metadata"
      aria-label={`${video.videotitle} preview`}
      className={`bg-gray-900 object-cover ${className}`}
      onLoadedMetadata={(event) => {
        // Seek past a potentially black first frame when video metadata loads.
        event.currentTarget.currentTime = 0.1;
      }}
      onError={() => setFailed(true)}
    />
  );
}
