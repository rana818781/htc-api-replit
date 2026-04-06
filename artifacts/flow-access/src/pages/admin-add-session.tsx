import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useLocation } from "wouter";
import { 
  useCreateAdminSession,
  getListAdminSessionsQueryKey,
  getGetAdminStatsQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronUp, ChevronDown, Copy, Lock, AlertTriangle, CheckCircle2 } from "lucide-react";

const CONSOLE_SNIPPET = "copy(document.cookie);";

const sessionSchema = z.object({
  label: z.string().min(1, "Label is required"),
  cookieData: z.string().min(10, "Cookie data is required"),
  isActive: z.boolean().default(true),
});

export default function AdminAddSession() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateAdminSession();
  const [guideOpen, setGuideOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const form = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
    defaultValues: { label: "", cookieData: "", isActive: true },
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(CONSOLE_SNIPPET).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const onSubmit = (values: z.infer<typeof sessionSchema>) => {
    createMutation.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Session Added", description: `"${values.label}" is now live.` });
        queryClient.invalidateQueries({ queryKey: getListAdminSessionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        navigate("/admin");
      },
      onError: () => toast({ title: "Error", description: "Failed to add session.", variant: "destructive" }),
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto w-full">
      {/* Back */}
      <Link href="/admin">
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Admin
        </button>
      </Link>

      <h1 className="text-3xl font-bold tracking-tight mb-1">Add Google Session</h1>
      <p className="text-muted-foreground mb-8">
        Add your premium Google account session so users can access Google Flow.
      </p>

      {/* Step-by-step guide */}
      <Collapsible open={guideOpen} onOpenChange={setGuideOpen} className="mb-6">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-muted/30 transition-colors">
              <div>
                <p className="font-semibold text-base">How to get your session cookies from Chrome</p>
                <p className="text-xs text-muted-foreground mt-0.5">Step-by-step instructions</p>
              </div>
              {guideOpen
                ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-5 pb-5 space-y-5 border-t border-border pt-4">
              {/* Step 1 */}
              <div className="flex gap-3">
                <StepBadge n={1} />
                <div>
                  <p className="font-semibold text-sm">আপনার Premium Google একাউন্ট দিয়ে লগিন করুন</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Chrome-এ নতুন Tab খুলুন এবং{" "}
                    <a
                      href="https://labs.google/fx/tools/flow"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline hover:text-primary/80"
                    >
                      labs.google/fx/tools/flow
                    </a>{" "}
                    এ যান। আপনার premium Google একাউন্ট দিয়ে sign in করুন।
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <StepBadge n={2} />
                <div>
                  <p className="font-semibold text-sm">Chrome DevTools খুলুন</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Keyboard shortcut:{" "}
                    <Kbd>F12</Kbd> অথবা <Kbd>Ctrl + Shift + I</Kbd> (Windows) /{" "}
                    <Kbd>Cmd + Option + I</Kbd> (Mac)
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <StepBadge n={3} />
                <div>
                  <p className="font-semibold text-sm">Application tab-এ যান</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    DevTools-এ উপরে <strong>Application</strong> ট্যাবে ক্লিক করুন। বাম দিকে{" "}
                    <strong>Cookies</strong>-এ ক্লিক করন, তারপর{" "}
                    <strong>https://labs.google</strong> সিলেক্ট করুন।
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-3">
                <StepBadge n={4} />
                <div className="flex-1">
                  <p className="font-semibold text-sm">Console tab-এ কুকি কপি করুন</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-2">
                    DevTools-এ <strong>Console</strong> ট্যাবে যান এবং নিচের কোডটি রান করুন:
                  </p>
                  <div className="flex items-center justify-between bg-[#1a1a2e] border border-border rounded-md px-4 py-3 gap-3">
                    <code className="text-sm font-mono leading-relaxed flex-1 overflow-x-auto">
                      <span className="text-green-400">{"// Run this in Chrome DevTools Console on labs.google"}</span>
                      <br />
                      <span className="text-white">{CONSOLE_SNIPPET}</span>
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={handleCopy}
                    >
                      {copied
                        ? <><CheckCircle2 className="h-4 w-4 mr-1 text-primary" /> Copied</>
                        : <><Copy className="h-4 w-4 mr-1" /> Copy</>}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    এই command চালালে আপনার সব cookies automatically clipboard-এ কপি হয়ে যাবে।
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-3">
                <StepBadge n={5} />
                <div>
                  <p className="font-semibold text-sm">নিচের form-এ paste করুন</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Clipboard-এ কপি হওয়া কুকি নিচের &quot;Cookie Data&quot; বক্সে{" "}
                    <Kbd>Ctrl+V</Kbd> দিয়ে paste করুন।
                  </p>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Warning */}
      <div className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 mb-6">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-destructive">Important</p>
          <p className="text-sm text-destructive/90 mt-0.5">
            These cookies give full access to your Google account. Never share them publicly. Only paste them here in your admin panel.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-base">Session Details</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">একটি label দিন এবং কুকি paste করুন।</p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField control={form.control} name="label" render={({ field }) => (
              <FormItem>
                <FormLabel>Session Label</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Premium Account 1 (myemail@gmail.com)" {...field} />
                </FormControl>
                <FormDescription>নিজে চেনার জন্য একটি নাম দিন।</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="cookieData" render={({ field }) => (
              <FormItem>
                <FormLabel>Cookie Data</FormLabel>
                <FormControl>
                  <Textarea
                    className="h-36 font-mono text-xs"
                    placeholder={"Console থেকে কপি করা কুকি এখানে paste করুন...\n\nউদাহরণ: __Secure-1PSID=...; SID=...; HSID=...\n\nঅথবা EditThisCookie থেকে JSON format-ও চলবে।"}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  উপরের Step 4-এর console script চালিয়ে যা পাবেন সেটি এখানে paste করুন।
                </FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate("/admin")}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add Session to Pool"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">
      {n}
    </span>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{children}</code>
  );
}
