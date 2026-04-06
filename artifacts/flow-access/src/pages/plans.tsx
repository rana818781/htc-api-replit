import { useListPlans, useGetCurrentUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Check, Zap } from "lucide-react";
import { useUser } from "@clerk/react";
import { Link } from "wouter";

export default function Plans() {
  const { data: plans, isLoading: isPlansLoading } = useListPlans();
  const { data: currentUser } = useGetCurrentUser({ query: { enabled: true, queryKey: getGetCurrentUserQueryKey() } });
  const { isSignedIn } = useUser();

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto w-full">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">সাবস্ক্রিপশন <span className="text-primary">প্ল্যানসমূহ</span></h1>
        <p className="text-lg text-muted-foreground">
          আপনার প্রয়োজনীয়তা অনুযায়ী সঠিক প্ল্যানটি বেছে নিন এবং আনলিমিটেড AI ভিডিও তৈরি শুরু করুন।
        </p>
      </div>

      {isPlansLoading ? (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="flex flex-col h-[400px]">
              <CardHeader>
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-10 w-1/3" />
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 items-start">
          {plans?.map((plan) => {
            const isCurrentPlan = currentUser?.planId === plan.id;
            const isPopular = plan.creditsPerMonth > 100 && plan.creditsPerMonth < 1000; // Just some logic to highlight middle tier
            
            return (
              <Card 
                key={plan.id} 
                className={`flex flex-col relative transition-all hover:border-primary/50 overflow-hidden ${
                  isCurrentPlan ? 'border-primary shadow-md shadow-primary/10' : 
                  isPopular ? 'border-border shadow-sm' : 'border-border/50'
                }`}
                data-testid={`card-plan-${plan.id}`}
              >
                {isCurrentPlan && (
                  <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center text-xs font-bold py-1 px-4">
                    বর্তমান প্ল্যান
                  </div>
                )}
                {isPopular && !isCurrentPlan && (
                  <div className="absolute top-0 left-0 right-0 bg-muted text-muted-foreground text-center text-xs font-bold py-1 px-4">
                    জনপ্রিয়
                  </div>
                )}
                
                <CardHeader className={`pb-4 ${isCurrentPlan || isPopular ? 'pt-8' : ''}`}>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="min-h-[40px] text-sm mt-2">{plan.description}</CardDescription>
                  <div className="mt-4 flex items-baseline text-4xl font-extrabold">
                    ${plan.priceUsd}
                    <span className="ml-1 text-sm font-medium text-muted-foreground">/মাস</span>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1">
                  <div className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <Zap className="h-5 w-5 text-primary" />
                    <span className="font-bold">{plan.creditsPerMonth} <span className="text-muted-foreground font-normal">ক্রেডিট/মাস</span></span>
                  </div>
                  
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>গুগল ফ্লো অ্যাক্সেস</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>ফুল HD রেজোলিউশন</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>প্রাইওরিটি সাপোর্ট</span>
                    </li>
                  </ul>
                </CardContent>
                
                <CardFooter>
                  {!isSignedIn ? (
                    <Button asChild className="w-full" variant={isPopular ? "default" : "outline"} data-testid={`button-plan-signup-${plan.id}`}>
                      <Link href="/sign-up">শুরু করুন</Link>
                    </Button>
                  ) : isCurrentPlan ? (
                    <Button className="w-full" disabled variant="secondary">
                      বর্তমান প্ল্যান
                    </Button>
                  ) : (
                    <Button className="w-full" variant={isPopular ? "default" : "outline"} data-testid={`button-plan-select-${plan.id}`}>
                      আপগ্রেড করুন
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
