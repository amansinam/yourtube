import { getVideoUrl } from "@/lib/videoUrl";
import { Video } from "@/lib/types";

export default function VideoPlayer({ video }: { video: Video }) {
  const src = getVideoUrl(video.filename || video.filepath);

  return (
    <div className="w-full bg-black rounded-xl overflow-hidden aspect-video">
      {src ? (
        <video
          key={video._id}
          src={src}
          controls
          autoPlay
          className="w-full h-full"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
          Video source unavailable
        </div>
      )}
    </div>
  );
}
