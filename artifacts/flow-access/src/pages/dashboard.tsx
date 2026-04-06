import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  useGetCurrentUser, 
  useGetExtensionToken, 
  useInjectSession,
  useGetUserUsage,
  getGetCurrentUserQueryKey,
  getGetUserUsageQueryKey
} from "@workspace/api-client-react";
import { Activity, Download, Play, AlertCircle, Zap, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import type { ApiError } from "@workspace/api-client-react";

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: user, isLoading: isUserLoading } = useGetCurrentUser();
  const { data: tokenData } = useGetExtensionToken();
  const { data: usageData, isLoading: isUsageLoading } = useGetUserUsage();
  
  const injectSession = useInjectSession();

  // Store token for extension
  useEffect(() => {
    if (tokenData?.token) {
      localStorage.setItem("__flowaccess_token__", tokenData.token);
    }
  }, [tokenData]);

  const handleGenerateVideo = () => {
    injectSession.mutate(undefined, {
      onSuccess: () => {
        // Refresh user and usage data since credits might have changed
        if (user?.id) {
          queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetUserUsageQueryKey() });
        }
        window.open("https://labs.google/fx/tools/flow", "_blank");
      },
      onError: (error: ApiError) => {
        const status = error?.response?.status;
        if (status === 403) {
          toast({
            title: "ত্রুটি",
            description: "আপনার ক্রেডিট শেষ হয়ে গেছে। আপগ্রেড করুন।",
            variant: "destructive",
          });
        } else if (status === 404) {
          toast({
            title: "ত্রুটি",
            description: "কোনো সক্রিয় সেশন নেই।",
            variant: "destructive",
          });
        } else {
          toast({
            title: "ত্রুটি",
            description: "ভিডিও তৈরি করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।",
            variant: "destructive",
          });
        }
      }
    });
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
          <h1 className="text-3xl font-bold tracking-tight">স্বাগতম, {user?.email.split('@')[0]}</h1>
          <p className="text-muted-foreground mt-1">আপনার ড্যাশবোর্ডে আপনাকে স্বাগতম।</p>
        </div>
        
        <Button 
          size="lg" 
          onClick={handleGenerateVideo} 
          disabled={injectSession.isPending}
          className="shadow-lg shadow-primary/20"
          data-testid="button-generate-video"
        >
          {injectSession.isPending ? (
            <span className="flex items-center gap-2">অপেক্ষা করুন...</span>
          ) : (
            <span className="flex items-center gap-2">
              <Play className="h-5 w-5 fill-current" /> ভিডিও তৈরি করুন
            </span>
          )}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {/* Credits Card */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-1 border-primary/20 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" /> ক্রেডিট স্ট্যাটাস
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-2 space-y-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-muted-foreground">ক্রেডিট ব্যবহৃত / মোট ক্রেডিট</span>
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
                  <span>আপনার ক্রেডিট শেষ হয়ে গেছে।</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">
                  আর {user?.creditsRemaining} টি ক্রেডিট বাকি আছে।
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plan Info Card */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-muted-foreground" /> বর্তমান প্ল্যান
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-2 flex flex-col justify-between h-[100px]">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {user?.planName || "কোনো প্ল্যান নেই"}
                </p>
                {user?.planName && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-primary" /> অ্যাক্টিভ সাবস্ক্রিপশন
                  </p>
                )}
              </div>
              <div className="mt-auto">
                <Link href="/plans">
                  <Button variant="link" className="p-0 h-auto text-primary" data-testid="link-upgrade">
                    {user?.planId ? "অন্য প্ল্যান দেখুন" : "প্ল্যান আপগ্রেড করুন"} →
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Stats Card */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" /> সাম্প্রতিক ব্যবহার
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
                    সাম্প্রতিক সেশন সংখ্যা
                  </p>
                </div>
              )}
              <div className="mt-auto">
                <Link href="/usage">
                  <Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary" data-testid="link-view-usage">
                    সব লগ দেখুন →
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Extension Install Card */}
      <Card className="border-primary/30 bg-primary/5 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Chrome এক্সটেনশন</CardTitle>
          <CardDescription className="text-base text-foreground/80">
            Google Flow AI ব্যবহার করতে আপনাকে প্রথমে আমাদের এক্সটেনশনটি ইনস্টল করতে হবে।
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
            <div className="space-y-3 flex-1">
              <div className="grid gap-2 text-sm font-medium">
                <div className="flex items-center gap-2 p-2 rounded bg-background/50 border border-border">
                  <span className="flex items-center justify-center bg-primary text-primary-foreground rounded-full w-6 h-6 text-xs shrink-0">১</span>
                  ধাপ ১: এক্সটেনশনটি ডাউনলোড করুন এবং আনজিপ করুন
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-background/50 border border-border">
                  <span className="flex items-center justify-center bg-primary text-primary-foreground rounded-full w-6 h-6 text-xs shrink-0">২</span>
                  ধাপ ২: Chrome এ chrome://extensions খুলুন
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-background/50 border border-border">
                  <span className="flex items-center justify-center bg-primary text-primary-foreground rounded-full w-6 h-6 text-xs shrink-0">৩</span>
                  ধাপ ৩: Developer Mode চালু করুন (উপরের ডান কোণায়)
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-background/50 border border-border">
                  <span className="flex items-center justify-center bg-primary text-primary-foreground rounded-full w-6 h-6 text-xs shrink-0">৪</span>
                  ধাপ ৪: Load unpacked ক্লিক করুন এবং আনজিপ করা ফোল্ডারটি সিলেক্ট করুন
                </div>
              </div>
            </div>
            
            <div className="w-full md:w-auto shrink-0 flex flex-col items-center justify-center bg-background p-6 rounded-lg border border-border shadow-sm">
              <Download className="h-10 w-10 text-primary mb-4" />
              <Button asChild size="lg" className="w-full" data-testid="button-download-extension">
                <a href="/flowaccess-extension.zip" download>
                  এক্সটেনশন ডাউনলোড করুন
                </a>
              </Button>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                .zip ফাইল (আকার: 10KB)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

