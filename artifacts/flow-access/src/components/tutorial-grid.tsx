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
    title: "How Can Used Flow Ultra in Your Mobile Device",
    url: "https://www.youtube.com/watch?v=Qv4V-tZCGE8",
    videoId: "Qv4V-tZCGE8",
  },
  {
    kind: "video",
    title: "How To Use Flow in PC/Laptop tutorial",
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

export function TutorialGrid({
  tutorials = TUTORIALS,
  columns = "md:grid-cols-2",
}: {
  tutorials?: Tutorial[];
  columns?: string;
}) {
  return (
    <div className={`grid grid-cols-1 ${columns} gap-4`}>
      {tutorials.map((tut, i) =>
        tut.kind === "video" ? (
          <a
            key={i}
            href={tut.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative bg-[#141414] rounded-xl overflow-hidden border border-[#1e1e1e] hover:border-[#333] transition-colors"
          >
            <div className="relative aspect-video bg-[#0d0d0d] overflow-hidden">
              <img
                src={`https://img.youtube.com/vi/${tut.videoId}/hqdefault.jpg`}
                alt={tut.title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = `https://img.youtube.com/vi/${tut.videoId}/0.jpg`;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="h-6 w-6 text-white fill-white ml-0.5" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <span className="px-1.5 py-0.5 bg-white/10 backdrop-blur-sm rounded text-[10px] text-gray-200">
                  Tutorial
                </span>
              </div>
            </div>
            <div className="p-3">
              <h3 className="text-sm font-medium text-gray-200 line-clamp-2">{tut.title}</h3>
            </div>
          </a>
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
