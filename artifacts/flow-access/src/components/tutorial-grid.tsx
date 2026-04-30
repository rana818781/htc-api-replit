import { useState } from "react";
import { Play, Clock } from "lucide-react";

export type Tutorial =
  | {
      kind: "video";
      title: string;
      url: string;
      videoId: string;
    }
  | {
      kind: "upcoming";
      title?: string;
    };

export const TUTORIALS: Tutorial[] = [
  {
    kind: "video",
    title: "Veo3 Ultra - বাংলাদেশে এই প্রথম এই ধরনের একটা সিস্টেম আমরা নিয়ে এসেছি - Veo Flow API...",
    url: "https://www.youtube.com/watch?v=Qv4V-tZCGE8",
    videoId: "Qv4V-tZCGE8",
  },
  {
    kind: "video",
    title: "আপনি কি একজন Veo3 Ultra Subscription Reseller? আপনি কি আপনার পেইজ বা ওয়েবসাইটে Veo3 Ultra sell করেন?",
    url: "https://www.youtube.com/watch?v=JrkQKKB5gHU",
    videoId: "JrkQKKB5gHU",
  },
  {
    kind: "upcoming",
    title: "More tutorials coming soon",
  },
  {
    kind: "upcoming",
    title: "More tutorials coming soon",
  },
];

function VideoCard({
  videoId,
  title,
  isActive,
  onPlay,
}: {
  videoId: string;
  title: string;
  isActive: boolean;
  onPlay: () => void;
}) {
  return (
    <div className="group relative bg-[#141414] rounded-xl overflow-hidden border border-[#1e1e1e]">
      <div className="relative aspect-video bg-[#0d0d0d] overflow-hidden">
        {isActive ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          <button
            type="button"
            onClick={onPlay}
            aria-label={`Play: ${title}`}
            className="absolute inset-0 w-full h-full cursor-pointer"
          >
            <img
              src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
              alt={title}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (img.src.includes("maxresdefault")) {
                  img.src = `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`;
                } else if (img.src.includes("sddefault")) {
                  img.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="h-6 w-6 text-white fill-white ml-0.5" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
              <span className="px-1.5 py-0.5 bg-white/10 backdrop-blur-sm rounded text-[10px] text-gray-200">
                Tutorial
              </span>
            </div>
          </button>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-200 line-clamp-2">{title}</h3>
      </div>
    </div>
  );
}

export function TutorialGrid({
  tutorials = TUTORIALS,
  columns = "md:grid-cols-2",
}: {
  tutorials?: Tutorial[];
  columns?: string;
}) {
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  return (
    <div className={`grid grid-cols-1 ${columns} gap-4`}>
      {tutorials.map((tut, i) =>
        tut.kind === "video" ? (
          <VideoCard
            key={i}
            videoId={tut.videoId}
            title={tut.title}
            isActive={activeVideoId === tut.videoId}
            onPlay={() => setActiveVideoId(tut.videoId)}
          />
        ) : (
          <div
            key={i}
            className="relative bg-[#0f0f0f] rounded-xl overflow-hidden border border-dashed border-[#2a2a2a]"
          >
            <div className="relative aspect-video bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-center px-4">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-gray-500" />
                </div>
                <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                  Upcoming
                </span>
              </div>
            </div>
            <div className="p-3">
              <h3 className="text-sm font-medium text-gray-500 line-clamp-1">
                {tut.title || "Coming soon"}
              </h3>
            </div>
          </div>
        )
      )}
    </div>
  );
}
