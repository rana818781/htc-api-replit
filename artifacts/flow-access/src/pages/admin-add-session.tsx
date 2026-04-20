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
import { ArrowLeft, ChevronUp, ChevronDown, Lock, AlertTriangle, Info, CheckCircle2 } from "lucide-react";

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

  const form = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
    defaultValues: { label: "", cookieData: "", isActive: true },
  });

  const onSubmit = (values: z.infer<typeof sessionSchema>) => {
    createMutation.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "API Added", description: `"${values.label}" is now live.` });
        queryClient.invalidateQueries({ queryKey: getListAdminSessionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        navigate("/admin");
      },
      onError: () => toast({ title: "Error", description: "Failed to add API.", variant: "destructive" }),
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

      <h1 className="text-3xl font-bold tracking-tight mb-1">Add Google API</h1>
      <p className="text-muted-foreground mb-8">
        Add your premium Google account API so users can access Google Flow.
      </p>

      {/* Why JSON only */}
      <div className="flex gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 mb-6">
        <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-400">কেন JSON format ব্যবহার করতে হবে?</p>
          <p className="text-sm text-blue-300/90 mt-1">
            লগিনের জন্য সবচেয়ে গুরুত্বপূর্ণ কুকি <code className="bg-blue-900/40 px-1 rounded text-xs">__Secure-next-auth.session-token</code> হলো{" "}
            <strong>httpOnly</strong> — এটি browser-এর JavaScript দিয়ে (<code className="bg-blue-900/40 px-1 rounded text-xs">document.cookie</code>) পাওয়া যায় না।
            শুধুমাত্র <strong>Cookie-Editor extension</strong> দিয়ে সব কুকি সহ JSON export করলেই কাজ হবে।
          </p>
        </div>
      </div>

      {/* Step-by-step guide */}
      <Collapsible open={guideOpen} onOpenChange={setGuideOpen} className="mb-6">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-muted/30 transition-colors">
              <div>
                <p className="font-semibold text-base">Cookie-Editor দিয়ে কিভাবে কুকি export করবেন</p>
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
                  <p className="font-semibold text-sm">Cookie-Editor Chrome Extension ইনস্টল করুন</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Chrome Web Store থেকে{" "}
                    <a
                      href="https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline hover:text-primary/80"
                    >
                      Cookie-Editor
                    </a>{" "}
                    extension ইনস্টল করুন। (অথবা EditThisCookie ব্যবহার করতে পারেন)
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <StepBadge n={2} />
                <div>
                  <p className="font-semibold text-sm">Premium Google Account দিয়ে লগিন করুন</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Chrome-এ{" "}
                    <a
                      href="https://labs.google/fx/tools/flow"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline hover:text-primary/80"
                    >
                      labs.google/fx/tools/flow
                    </a>{" "}
                    এ যান এবং আপনার premium Google account দিয়ে সম্পূর্ণ sign in করুন।
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <StepBadge n={3} />
                <div>
                  <p className="font-semibold text-sm">Cookie-Editor icon-এ ক্লিক করুন</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    labs.google পেজে থাকা অবস্থায় Chrome toolbar থেকে Cookie-Editor icon-এ ক্লিক করুন।
                    Popup-এ সব কুকি দেখতে পাবেন।
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-3">
                <StepBadge n={4} />
                <div className="flex-1">
                  <p className="font-semibold text-sm">"Export" বাটনে ক্লিক করুন</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-2">
                    Cookie-Editor popup-এর নিচে <strong>Export</strong> বাটন আছে।
                    ক্লিক করলে সব কুকি JSON format-এ clipboard-এ কপি হয়ে যাবে।
                  </p>
                  <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
                    <p className="text-xs text-primary flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      এভাবে export করলে <code className="bg-primary/20 px-1 rounded">__Secure-next-auth.session-token</code> সহ সব httpOnly কুকি পাওয়া যাবে।
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-3">
                <StepBadge n={5} />
                <div>
                  <p className="font-semibold text-sm">নিচের form-এ paste করুন</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Clipboard-এ কপি হওয়া JSON নিচের &quot;Cookie Data&quot; বক্সে{" "}
                    <Kbd>Ctrl+V</Kbd> দিয়ে paste করুন। শুরুতে <code className="text-xs bg-muted px-1 rounded">[</code> দিয়ে শুরু হওয়া JSON array হবে।
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
          <h2 className="font-semibold text-base">API Details</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">একটি label দিন এবং JSON কুকি paste করুন।</p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField control={form.control} name="label" render={({ field }) => (
              <FormItem>
                <FormLabel>API Label</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Premium Account 1 (myemail@gmail.com)" {...field} />
                </FormControl>
                <FormDescription>নিজে চেনার জন্য একটি নাম দিন।</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="cookieData" render={({ field }) => (
              <FormItem>
                <FormLabel>Cookie Data (JSON)</FormLabel>
                <FormControl>
                  <Textarea
                    className="h-40 font-mono text-xs"
                    placeholder={'Cookie-Editor থেকে export করা JSON এখানে paste করুন...\n\nউদাহরণ:\n[\n  {\n    "name": "__Secure-next-auth.session-token",\n    "value": "eyJ...",\n    "domain": "labs.google",\n    "httpOnly": true,\n    "secure": true\n  },\n  ...\n]'}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Cookie-Editor/EditThisCookie extension থেকে export করা JSON array হতে হবে। <code className="bg-muted px-1 rounded text-xs">[</code> দিয়ে শুরু হবে।
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
                {createMutation.isPending ? "Adding..." : "Add API to Pool"}
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
