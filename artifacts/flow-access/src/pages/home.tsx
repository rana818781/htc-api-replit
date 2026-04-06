import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, Play } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-xl items-center justify-between px-4 md:px-8 mx-auto">
          <div className="flex items-center gap-2">
            <Play className="h-6 w-6 text-primary fill-primary" />
            <span className="font-bold text-xl tracking-tight">FlowAccess</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/plans" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Plans
            </Link>
            <Link href="/sign-in">
              <Button variant="ghost" className="text-sm font-medium" data-testid="link-login">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button className="text-sm font-medium" data-testid="link-register">
                Get Started
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center py-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
        <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm text-primary mb-8 font-medium">
          <Zap className="mr-1 h-3.5 w-3.5" />
          For Power Users
        </div>
        
        <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl mb-6 text-balance">
          Create Advanced <span className="text-primary">AI Videos</span>
        </h1>
        
        <p className="max-w-2xl text-lg sm:text-xl text-muted-foreground mb-10 text-balance">
          A premium platform for accessing Google Flow AI video tools. Exclusive access, seamless experience.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/sign-up">
            <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base font-bold shadow-lg shadow-primary/25" data-testid="button-hero-signup">
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/plans">
            <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base font-bold border-border/50 bg-background/50 hover:bg-accent" data-testid="button-hero-plans">
              View Plans
            </Button>
          </Link>
        </div>
      </main>

      <footer className="border-t border-border/40 py-8 px-4 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} FlowAccess. All rights reserved.</p>
      </footer>
    </div>
  );
}
