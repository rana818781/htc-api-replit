import { useEffect } from "react";
import { useGetCurrentUser, useGetExtensionToken } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Play, MessageCircle } from "lucide-react";

const TUTORIALS = [
  {
    title: "How Can Used Flow Ultra in Your Mobile Device",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    title: "How To Use Flow in PC/Laptop tutorial",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    title: "Flow setup for Mobile user's",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    title: "Credit Problem & Flow Login Problem solution tutorial",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
];

export default function UserDashboard() {
  const { toast } = useToast();
  const { data: user, isLoading } = useGetCurrentUser();
  const { data: tokenData } = useGetExtensionToken();

  useEffect(() => {
    if (tokenData?.token) {
      localStorage.setItem("__veoflowapi_token__", tokenData.token);
    }
  }, [tokenData]);

  const handleGenerateVideo = () => {
    if (user && user.creditsRemaining <= 0) {
      toast({
        title: "Out of Credits",
        description: "You have no credits remaining. Please upgrade your plan.",
        variant: "destructive",
      });
      return;
    }
    window.open("https://labs.google/fx/tools/flow", "_blank");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-12">
      <div className="relative w-full h-48 md:h-64 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#1a1025] to-[#0d1a2a]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiM3YzNhZWQiIHN0b3Atb3BhY2l0eT0iMC4xIi8+PHN0b3Agb2Zmc2V0PSI1MCUiIHN0b3AtY29sb3I9IiMzYjgyZjYiIHN0b3Atb3BhY2l0eT0iMC4wNSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2VmNDQ0NCIgc3RvcC1vcGFjaXR5PSIwLjEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iNjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==')] bg-cover opacity-60" />
        <div className="absolute top-4 right-4 w-32 h-32 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-purple-600/20 to-blue-600/20 blur-3xl" />

        <div className="relative z-10 h-full flex flex-col justify-center px-6 md:px-12 max-w-4xl">
          <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight">
            Welcome to Veo Flow API
          </h1>
          <p className="text-sm md:text-base text-gray-400 mt-2 md:mt-3 max-w-lg leading-relaxed">
            Access Google Flow AI video generation with your managed session.
            Create stunning videos with just a few clicks.
          </p>
        </div>
      </div>

      <div className="px-4 md:px-8 -mt-5 relative z-20">
        <button
          onClick={handleGenerateVideo}
          disabled={!!(user && user.creditsRemaining <= 0)}
          className="w-full max-w-xl mx-auto flex items-center justify-center gap-3 py-3.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-full text-white font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Play className="h-5 w-5" />
          Generate Video
        </button>
      </div>

      <div className="px-4 md:px-8 mt-10">
        <h2 className="text-lg font-semibold text-white mb-4">Made with Flow</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TUTORIALS.map((tut, i) => (
            <a
              key={i}
              href={tut.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative bg-[#141414] rounded-xl overflow-hidden border border-[#1e1e1e] hover:border-[#333] transition-colors"
            >
              <div className="relative aspect-video bg-[#0d0d0d] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800/50 to-gray-900/80 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="h-6 w-6 text-white fill-white ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">Tutorial</span>
                  </div>
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium text-gray-200 line-clamp-1">{tut.title}</h3>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-8 mt-10">
        <h2 className="text-lg font-semibold text-white mb-4">Contact Support</h2>
        <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center shrink-0">
            <MessageCircle className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Contact Your Reseller</h3>
            <p className="text-xs text-gray-500 mt-0.5">Reach out to your reseller for support</p>
          </div>
        </div>
      </div>
    </div>
  );
}
