import { Link, useLocation } from "wouter";
import { LogOut, LayoutDashboard, CreditCard, Activity, ShieldAlert, UserPlus, Menu, X, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn, signOut } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: apiUser } = useGetCurrentUser({ query: { enabled: isSignedIn } });

  const isAdmin = apiUser?.isAdmin === true;
  const isReseller = apiUser?.isReseller === true;

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/plans", label: "Plans", icon: CreditCard },
    { href: "/usage", label: "Usage Logs", icon: Activity },
  ];

  return (
    <div className="flex min-h-[100dvh] w-full bg-background flex-col md:flex-row">
      {isLoaded && isSignedIn && (
        <>
          <div className="md:hidden flex items-center justify-between p-4 border-b border-border">
            <Link href="/dashboard">
              <img src="/navbar-logo.png" alt="Veo Flow API" className="h-8 object-contain" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>

          <aside
            className={`${
              isMobileMenuOpen ? "flex" : "hidden"
            } md:flex flex-col w-full md:w-64 md:h-[100dvh] md:sticky md:top-0 border-r border-border bg-sidebar shrink-0 p-4 overflow-y-auto`}
          >
            <div className="hidden md:block mb-8 px-2">
              <Link href="/dashboard">
                <img src="/navbar-logo.png" alt="Veo Flow API" className="h-9 object-contain" />
              </Link>
            </div>

            <nav className="flex-1 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}

              {(isReseller || isAdmin) && (
                <Link href="/reseller" onClick={() => setIsMobileMenuOpen(false)}>
                  <div
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                      location === "/reseller"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                    }`}
                  >
                    <UserPlus className="h-5 w-5" />
                    <span>Reseller Panel</span>
                  </div>
                </Link>
              )}

              {isAdmin && (
                <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}>
                  <div
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                      location === "/admin"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                    }`}
                  >
                    <ShieldAlert className="h-5 w-5" />
                    <span>Admin Panel</span>
                  </div>
                </Link>
              )}

              {(isReseller || isAdmin) && (
                <Link href="/tutorials" onClick={() => setIsMobileMenuOpen(false)}>
                  <div
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                      location === "/tutorials"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                    }`}
                  >
                    <PlayCircle className="h-5 w-5" />
                    <span>Updated Tutorials</span>
                  </div>
                </Link>
              )}
            </nav>

            <div className="mt-auto pt-4 border-t border-border">
              <div className="flex items-center gap-3 px-3 py-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  {user?.username?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium truncate">
                    {user?.username || "User"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-foreground"
                onClick={() => signOut()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </aside>
        </>
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto md:h-[100dvh]">
        {children}
      </main>
    </div>
  );
}
