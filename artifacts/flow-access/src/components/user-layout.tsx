import { Link } from "wouter";
import { useState, useRef, useEffect } from "react";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import {
  Settings,
  CreditCard,
  Users,
  History,
  Download,
  LogOut,
  ChevronDown,
} from "lucide-react";

export function UserLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn, signOut } = useAuth();
  const { data: apiUser } = useGetCurrentUser({ query: { enabled: isSignedIn } });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = user?.username || "User";
  const email = apiUser?.email || "";
  const planName = apiUser?.planName || "No Plan";
  const creditsUsed = apiUser?.creditsUsed ?? 0;
  const creditsTotal = apiUser?.creditsTotal ?? 0;
  const creditsRemaining = apiUser?.creditsRemaining ?? 0;
  const creditPercent = creditsTotal > 0 ? (creditsRemaining / creditsTotal) * 100 : 0;

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-white flex flex-col">
      <header className="flex items-center justify-between px-4 md:px-6 h-14 border-b border-[#1a1a1a] bg-[#0a0a0a] sticky top-0 z-50">
        <Link href="/dashboard">
          <img src="/navbar-logo.png" alt="HTC API" className="h-8 object-contain" />
        </Link>

        <div className="flex items-center gap-3" ref={dropdownRef}>
          <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-xs font-medium text-gray-300">
            {planName}
          </span>

          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5a3398] to-[#5547fd] flex items-center justify-center text-sm font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute top-12 right-4 md:right-6 w-64 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="p-4 border-b border-[#2a2a2a]">
                <p className="font-semibold text-white text-sm">{displayName}</p>
                {email && <p className="text-xs text-gray-500 mt-0.5">{email}</p>}

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-400 flex items-center gap-1">
                      <span className="text-yellow-500">⚡</span> Credits
                    </span>
                    <span className="font-mono font-bold text-white">
                      {creditsRemaining}
                      <span className="text-gray-500">/{creditsTotal}</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${creditPercent}%`,
                        background: creditPercent > 50
                          ? "linear-gradient(90deg, #a855f7, #6366f1)"
                          : creditPercent > 20
                          ? "#eab308"
                          : "#ef4444",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="py-1">
                <DropdownItem icon={<Settings className="h-4 w-4" />} label="Settings" href="/dashboard" onClick={() => setDropdownOpen(false)} />
                <DropdownItem icon={<CreditCard className="h-4 w-4" />} label="Plan & Pricing" href="/plans" onClick={() => setDropdownOpen(false)} />
                <DropdownItem icon={<Users className="h-4 w-4" />} label="Refer & Earn" href="/dashboard" onClick={() => setDropdownOpen(false)} />
                <DropdownItem icon={<History className="h-4 w-4" />} label="Generation History" href="/usage" onClick={() => setDropdownOpen(false)} />
                <DropdownItem icon={<Download className="h-4 w-4" />} label="Get Extension" href="https://chromewebstore.google.com/detail/veo-flow-api-%E2%80%94-google-flo/nhpbdcgjjbnoalanbgaeonkhbkbldmja" external onClick={() => setDropdownOpen(false)} />
              </div>

              <div className="border-t border-[#2a2a2a] py-1">
                <button
                  onClick={() => { setDropdownOpen(false); signOut(); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-[#1a1a1a] transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}

function DropdownItem({
  icon,
  label,
  href,
  onClick,
  external,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  onClick?: () => void;
  external?: boolean;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#1a1a1a] transition-colors"
      >
        {icon}
        {label}
      </a>
    );
  }
  return (
    <Link href={href} onClick={onClick}>
      <div className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#1a1a1a] transition-colors cursor-pointer">
        {icon}
        {label}
      </div>
    </Link>
  );
}
