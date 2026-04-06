import { Show, useClerk, useUser } from "@clerk/react";
import { Link, useLocation } from "wouter";
import { LogOut, LayoutDashboard, CreditCard, Activity, ShieldAlert, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdmin = user?.publicMetadata?.isAdmin === true || false; // simplified, we'll fetch from our API in pages

  const navItems = [
    { href: "/dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
    { href: "/plans", label: "প্ল্যানসমূহ", icon: CreditCard },
    { href: "/usage", label: "ব্যবহার লগ", icon: Activity },
  ];

  return (
    <div className="flex min-h-[100dvh] w-full bg-background flex-col md:flex-row">
      <Show when="signed-in">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border">
          <Link href="/dashboard" className="text-xl font-bold text-primary tracking-tight">FlowAccess</Link>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Sidebar */}
        <aside className={`${isMobileMenuOpen ? "flex" : "hidden"} md:flex flex-col w-full md:w-64 border-r border-border bg-sidebar shrink-0 p-4`}>
          <div className="hidden md:block mb-8 px-2">
            <Link href="/dashboard" className="text-2xl font-bold text-primary tracking-tight">FlowAccess</Link>
          </div>
          
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"}`}>
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
            
            <Show when="signed-in">
              <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${location === "/admin" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"}`}>
                  <ShieldAlert className="h-5 w-5" />
                  <span>অ্যাডমিন প্যানেল</span>
                </div>
              </Link>
            </Show>
          </nav>

          <div className="mt-auto pt-4 border-t border-border">
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {user?.firstName?.charAt(0) || user?.emailAddresses[0]?.emailAddress?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.fullName || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</p>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              লগ আউট
            </Button>
          </div>
        </aside>
      </Show>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
