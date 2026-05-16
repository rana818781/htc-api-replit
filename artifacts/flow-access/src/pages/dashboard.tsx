import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  useGetCurrentUser, 
  useGetExtensionToken, 
  useGetUserUsage,
} from "@workspace/api-client-react";
import { Activity, Download, Play, AlertCircle, Zap, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { toast } = useToast();

  const { data: user, isLoading: isUserLoading } = useGetCurrentUser();
  const { data: tokenData } = useGetExtensionToken();
  const { data: usageData, isLoading: isUsageLoading } = useGetUserUsage();

  // Store API token in localStorage so the extension's site_bridge.js can auto-connect
  useEffect(() => {
    if (tokenData?.token) {
      localStorage.setItem("__veoflowapi_token__", tokenData.token);
    }
  }, [tokenData]);

  // Just open Google Flow — the Chrome extension auto-injects the session cookies
  // The extension's background.js tabs.onUpdated listener handles cookie injection + credit deduction
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

  if (isUserLoading) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const creditsPercentage = user ? (user.creditsUsed / user.creditsTotal) * 100 : 0;
  const isOutOfCredits = user && user.creditsRemaining <= 0;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.username || user?.email?.split('@')[0] || 'User'}</h1>
          <p className="text-muted-foreground mt-1">Here is your HTC API dashboard.</p>
        </div>
        
        <Button 
          size="lg" 
          onClick={handleGenerateVideo} 
          disabled={!!(user && user.creditsRemaining <= 0)}
          className="shadow-lg shadow-primary/20"
          data-testid="button-generate-video"
        >
          <span className="flex items-center gap-2">
            <Play className="h-5 w-5 fill-current" /> Create Video
          </span>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card className="col-span-1 md:col-span-2 lg:col-span-1 border-primary/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" /> Credit Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-2 space-y-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-muted-foreground">Used / Total Credits</span>
                <span className="font-bold">
                  {user?.creditsUsed} / {user?.creditsTotal}
                </span>
              </div>
              <Progress 
                value={creditsPercentage} 
                className={`h-3 ${creditsPercentage >= 90 ? "[&>[data-slot=indicator]]:bg-destructive" : creditsPercentage >= 75 ? "[&>[data-slot=indicator]]:bg-orange-500" : ""}`}
              />
              
              {isOutOfCredits ? (
                <div className="flex items-center gap-2 text-sm text-destructive mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>You have no credits remaining.</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">
                  {user?.creditsRemaining} credit{user?.creditsRemaining !== 1 ? "s" : ""} remaining.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-muted-foreground" /> Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-2 flex flex-col justify-between h-[100px]">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {user?.planName || "No Plan"}
                </p>
                {user?.planName && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-primary" /> Active Subscription
                  </p>
                )}
              </div>
              <div className="mt-auto">
                <Link href="/plans">
                  <Button variant="link" className="p-0 h-auto text-primary" data-testid="link-upgrade">
                    {user?.planId ? "View Other Plans" : "Upgrade Plan"} →
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-2 flex flex-col justify-between h-[100px]">
              {isUsageLoading ? (
                <Skeleton className="h-10 w-24" />
              ) : (
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    {usageData?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Recent activity
                  </p>
                </div>
              )}
              <div className="mt-auto">
                <Link href="/usage">
                  <Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary" data-testid="link-view-usage">
                    View all logs →
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/30 bg-primary/5 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Chrome Extension</CardTitle>
          <CardDescription className="text-base text-foreground/80">
            Install our Chrome extension to access Google Flow AI without your own Google account via HTC API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center bg-background p-8 rounded-lg border border-border shadow-sm">
            <Download className="h-10 w-10 text-primary mb-4" />
            <Button asChild size="lg" className="w-full max-w-xs" data-testid="button-get-extension">
              <a
                href="https://chromewebstore.google.com/detail/veo-flow-api-%E2%80%94-google-flo/nhpbdcgjjbnoalanbgaeonkhbkbldmja"
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Extension
              </a>
            </Button>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Clicking this will take you to the Chrome Web Store to install the extension.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
