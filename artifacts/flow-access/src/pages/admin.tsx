import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { 
  useGetCurrentUser,
  useGetAdminStats,
  useListAdminSessions,
  useUpdateAdminSession,
  useDeleteAdminSession,
  useGenerateSessionSyncKey,
  useListAdminUsers,
  useCreateAdminUser,
  useUpdateAdminUser,
  useDeleteAdminUser,
  useListAdminUsage,
  useListPlans,
  getListAdminSessionsQueryKey,
  getListAdminUsersQueryKey,
  getGetAdminStatsQueryKey
} from "@workspace/api-client-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Users, Key, Activity, Plus, Edit, Trash2, ExternalLink, RefreshCw, Copy, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow, differenceInHours } from "date-fns";

const sessionSchema = z.object({
  label: z.string().min(1, "Label is required"),
  cookieData: z.string().min(1, "Cookie data is required").refine((val) => {
    try { const p = JSON.parse(val); return Array.isArray(p) && p.length > 0; } catch { return false; }
  }, "Must be a valid JSON array (export from EditThisCookie or Cookie-Editor)"),
  isActive: z.boolean().default(true),
});

function extractEmailFromCookies(cookieData: string): string {
  try {
    const cookies = JSON.parse(cookieData) as Array<{ name: string; value: string }>;
    const emailCookie = cookies.find(c => c.name === "EMAIL" || c.name === "email");
    if (emailCookie?.value) return decodeURIComponent(emailCookie.value).replace(/^"|"$/g, "");
  } catch {}
  return "";
}

function parseCookieCount(cookieData: string): number {
  try { return JSON.parse(cookieData).length; } catch { return 0; }
}

const userSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  planId: z.string().optional(),
  creditsTotal: z.coerce.number().min(0).default(0),
  isAdmin: z.boolean().default(false),
  isReseller: z.boolean().default(false),
});

const editUserSchema = z.object({
  planId: z.string().optional(),
  creditsTotal: z.coerce.number().min(0).default(0),
  creditsUsed: z.coerce.number().min(0).default(0),
  isAdmin: z.boolean().default(false),
  isReseller: z.boolean().default(false),
  newPassword: z.string().optional().refine(val => !val || val.length >= 6, { message: "Password must be at least 6 characters" }),
});

export default function Admin() {
  const { data: user, isLoading: isUserLoading } = useGetCurrentUser();
  
  if (isUserLoading) {
    return <div className="p-8 max-w-6xl mx-auto"><Skeleton className="h-[400px]" /></div>;
  }

  if (!user?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground mt-2">This page is for administrators only.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-8 w-8 text-primary" /> Admin Panel
        </h1>
        <p className="text-muted-foreground mt-1">Manage platform sessions, users, and monitor activity.</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="usage">Usage Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="sessions">
          <SessionsTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="usage">
          <UsageTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab() {
  const { data: stats, isLoading } = useGetAdminStats();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
          <Key className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalSessions || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
          <Key className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.activeSessions || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalUsage || 0}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function SessionForm({ form, onSubmit, isPending, submitLabel }: {
  form: ReturnType<typeof useForm<z.infer<typeof sessionSchema>>>;
  onSubmit: (v: z.infer<typeof sessionSchema>) => void;
  isPending: boolean;
  submitLabel: string;
}) {
  const cookieData = form.watch("cookieData");
  const detectedEmail = cookieData ? extractEmailFromCookies(cookieData) : "";
  const cookieCount = cookieData ? parseCookieCount(cookieData) : 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="label" render={({ field }) => (
          <FormItem>
            <FormLabel>Session Label</FormLabel>
            <FormControl><Input placeholder="e.g. Account 1 - rana@veo.gemisubex.com" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="cookieData" render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center justify-between">
              <span>Cookie Data (JSON)</span>
              {cookieCount > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  {cookieCount} cookies detected {detectedEmail && `· ${detectedEmail}`}
                </span>
              )}
            </FormLabel>
            <FormControl>
              <Textarea
                className="h-48 font-mono text-xs"
                placeholder={'[\n  {\n    "domain": "labs.google",\n    "name": "__Secure-next-auth.session-token",\n    "value": "...",\n    "httpOnly": true,\n    "secure": true,\n    "session": false\n  }\n]'}
                {...field}
              />
            </FormControl>
            <FormDescription className="text-xs">
              Paste the full JSON array exported from <strong>EditThisCookie</strong> or <strong>Cookie-Editor</strong> extension on labs.google.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )} />

        {detectedEmail && (
          <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <Key className="h-4 w-4 text-primary shrink-0" />
            <span className="text-muted-foreground">Account:</span>
            <span className="font-medium">{detectedEmail}</span>
          </div>
        )}

        <FormField control={form.control} name="isActive" render={({ field }) => (
          <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel className="cursor-pointer">Active (users will be assigned this session)</FormLabel>
            </div>
          </FormItem>
        )} />

        <Button type="submit" className="w-full" disabled={isPending}>{submitLabel}</Button>
      </form>
    </Form>
  );
}

function getHealthStatus(session: { cookieUpdatedAt?: string | null; createdAt: string; isActive: boolean }) {
  if (!session.isActive) return { label: "Inactive", color: "text-gray-400", icon: XCircle, bg: "bg-gray-500/10" };
  const updatedAt = session.cookieUpdatedAt || session.createdAt;
  const hours = differenceInHours(new Date(), new Date(updatedAt));
  if (hours < 12) return { label: "Fresh", color: "text-green-400", icon: CheckCircle, bg: "bg-green-500/10" };
  if (hours < 48) return { label: "Good", color: "text-blue-400", icon: CheckCircle, bg: "bg-blue-500/10" };
  if (hours < 168) return { label: "Aging", color: "text-yellow-400", icon: AlertTriangle, bg: "bg-yellow-500/10" };
  return { label: "Stale", color: "text-red-400", icon: XCircle, bg: "bg-red-500/10" };
}

function SessionsTab() {
  const { data: sessions, isLoading } = useListAdminSessions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateAdminSession();
  const deleteMutation = useDeleteAdminSession();
  const syncKeyMutation = useGenerateSessionSyncKey();
  
  const [editSessionId, setEditSessionId] = useState<number | null>(null);
  const [syncDialogSessionId, setSyncDialogSessionId] = useState<number | null>(null);

  const editForm = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
    defaultValues: { label: "", cookieData: "", isActive: true },
  });

  const onEditSubmit = (values: z.infer<typeof sessionSchema>) => {
    if (!editSessionId) return;
    updateMutation.mutate({ id: editSessionId, data: values }, {
      onSuccess: () => {
        toast({ title: "Session Updated" });
        setEditSessionId(null);
        queryClient.invalidateQueries({ queryKey: getListAdminSessionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      },
      onError: () => toast({ title: "Error", description: "Failed to update session.", variant: "destructive" }),
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Session Deleted" });
        queryClient.invalidateQueries({ queryKey: getListAdminSessionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      },
      onError: () => toast({ title: "Error", description: "Failed to delete session.", variant: "destructive" }),
    });
  };

  const handleToggleActive = (session: { id: number; label: string; cookieData: string; isActive: boolean }) => {
    updateMutation.mutate({ id: session.id, data: { ...session, isActive: !session.isActive } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminSessionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      }
    });
  };

  const handleGenerateSyncKey = (sessionId: number) => {
    syncKeyMutation.mutate({ id: sessionId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminSessionsQueryKey() });
        toast({ title: "Sync Key Generated" });
      },
      onError: () => toast({ title: "Error", description: "Failed to generate sync key.", variant: "destructive" }),
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const syncSession = sessions?.find(s => s.id === syncDialogSessionId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Session Health Monitor</CardTitle>
            <CardDescription>
              Overview of all Google session cookies — health, age, and auto-sync status.
            </CardDescription>
          </div>
          <Link href="/admin/sessions/new">
            <Button size="sm" data-testid="btn-new-session">
              <Plus className="h-4 w-4 mr-2" /> Add Session
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
            <>
              {(!sessions || sessions.length === 0) && (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
                  <Key className="h-12 w-12 opacity-20" />
                  <p className="text-sm">No sessions yet. Add a Google session to get started.</p>
                </div>
              )}
              {sessions && sessions.length > 0 && (
                <div className="space-y-3">
                  {sessions.map(session => {
                    const email = extractEmailFromCookies(session.cookieData);
                    const count = parseCookieCount(session.cookieData);
                    const health = getHealthStatus(session);
                    const HealthIcon = health.icon;
                    const cookieAge = session.cookieUpdatedAt
                      ? formatDistanceToNow(new Date(session.cookieUpdatedAt), { addSuffix: true })
                      : formatDistanceToNow(new Date(session.createdAt), { addSuffix: true });

                    return (
                      <div key={session.id} className={`rounded-xl border p-4 ${health.bg} border-border`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`mt-0.5 ${health.color}`}>
                              <HealthIcon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">{session.label}</span>
                                <Badge variant={session.isActive ? "default" : "secondary"} className="text-xs cursor-pointer" onClick={() => handleToggleActive(session)}>
                                  {session.isActive ? "Active" : "Inactive"}
                                </Badge>
                                <Badge variant="outline" className={`text-xs ${health.color}`}>{health.label}</Badge>
                                {session.syncKey && (
                                  <Badge variant="outline" className="text-xs text-blue-400 border-blue-400/30">
                                    <RefreshCw className="h-3 w-3 mr-1" /> Auto-Sync
                                  </Badge>
                                )}
                              </div>
                              {email && <p className="text-xs text-muted-foreground mt-0.5">{email}</p>}
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> Cookie: {cookieAge}
                                </span>
                                <span>{count} cookies</span>
                                <span>{session.usageCount} uses</span>
                                <span>
                                  Last used: {session.lastUsedAt ? format(new Date(session.lastUsedAt), "dd MMM, h:mm a") : "Never"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Auto-Sync Setup" onClick={() => setSyncDialogSessionId(session.id)}>
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Dialog open={editSessionId === session.id} onOpenChange={(open) => {
                              if (open) {
                                editForm.reset({ label: session.label, cookieData: session.cookieData, isActive: session.isActive });
                                setEditSessionId(session.id);
                              } else {
                                setEditSessionId(null);
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-xl">
                                <DialogHeader>
                                  <DialogTitle>Edit Session</DialogTitle>
                                  <DialogDescription>Update cookie data or label for this session.</DialogDescription>
                                </DialogHeader>
                                <SessionForm form={editForm} onSubmit={onEditSubmit} isPending={updateMutation.isPending} submitLabel="Update Session" />
                              </DialogContent>
                            </Dialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete "{session.label}"?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This session will be permanently removed. Users assigned to it will lose access until a new session is available.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(session.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={syncDialogSessionId !== null} onOpenChange={(open) => { if (!open) setSyncDialogSessionId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Auto Cookie Sync Setup</DialogTitle>
            <DialogDescription>
              Install the "Session Keeper" extension on your session account's browser. It will automatically send fresh cookies to this session.
            </DialogDescription>
          </DialogHeader>
          {syncSession && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Session: {syncSession.label}</p>
                {syncSession.cookieUpdatedAt && (
                  <p className="text-xs text-muted-foreground">
                    Last cookie update: {formatDistanceToNow(new Date(syncSession.cookieUpdatedAt), { addSuffix: true })}
                  </p>
                )}
              </div>

              {syncSession.syncKey ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Sync Key</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input value={syncSession.syncKey} readOnly className="font-mono text-xs" />
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(syncSession.syncKey!)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">API URL</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input value={`${window.location.origin}/api/sync/cookies`} readOnly className="font-mono text-xs" />
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(`${window.location.origin}/api/sync/cookies`)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/50 p-3">
                    <p className="text-sm font-medium mb-2">Setup Steps:</p>
                    <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                      <li><a href="/session-keeper-extension.zip" download className="text-primary underline font-medium">Download the Session Keeper extension</a></li>
                      <li>Unzip and install it on the browser where your session account is logged into Google Flow</li>
                      <li>Open the Session Keeper popup and paste the <strong>Sync Key</strong> and <strong>API URL</strong> above</li>
                      <li>It will automatically sync cookies every 30 minutes</li>
                    </ol>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => handleGenerateSyncKey(syncSession.id)}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Regenerate Sync Key
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate a sync key to enable auto cookie sync for this session.
                  </p>
                  <Button onClick={() => handleGenerateSyncKey(syncSession.id)} disabled={syncKeyMutation.isPending}>
                    <Key className="h-4 w-4 mr-2" /> Generate Sync Key
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UsersTab() {
  const { data: users, isLoading } = useListAdminUsers();
  const { data: plans } = useListPlans();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createMutation = useCreateAdminUser();
  const updateMutation = useUpdateAdminUser();
  const deleteMutation = useDeleteAdminUser();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);

  const createForm = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: { username: "", password: "", creditsTotal: 0, isAdmin: false, isReseller: false, planId: "" },
  });

  const editForm = useForm<z.infer<typeof editUserSchema>>({
    resolver: zodResolver(editUserSchema),
  });

  const onCreateSubmit = (values: z.infer<typeof userSchema>) => {
    const payload = {
      ...values,
      planId: values.planId && values.planId !== "none" ? parseInt(values.planId) : undefined
    };
    createMutation.mutate({ data: payload }, {
      onSuccess: () => {
        toast({ title: "Success", description: "User created." });
        setIsCreateOpen(false);
        createForm.reset();
        queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      }
    });
  };

  const onEditSubmit = (values: z.infer<typeof editUserSchema>) => {
    if (!editUserId) return;
    const { newPassword, ...rest } = values;
    const payload: Record<string, unknown> = {
      ...rest,
      planId: values.planId && values.planId !== "none" ? parseInt(values.planId) : null
    };
    if (newPassword && newPassword.length >= 6) {
      payload.newPassword = newPassword;
    }
    updateMutation.mutate({ id: editUserId, data: payload as any }, {
      onSuccess: () => {
        toast({ title: "Success", description: "User updated." });
        setEditUserId(null);
        queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage platform users and their credits.</CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> New User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New User</DialogTitle></DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField control={createForm.control} name="username" render={({ field }) => (
                  <FormItem><FormLabel>Username</FormLabel><FormControl><Input type="text" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={createForm.control} name="password" render={({ field }) => (
                  <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={createForm.control} name="planId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Plan</SelectItem>
                          {plans?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={createForm.control} name="creditsTotal" render={({ field }) => (
                    <FormItem><FormLabel>Total Credits</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="flex gap-4">
                  <FormField control={createForm.control} name="isAdmin" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 flex-1">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none"><FormLabel>Admin</FormLabel></div>
                    </FormItem>
                  )} />
                  <FormField control={createForm.control} name="isReseller" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 flex-1">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none"><FormLabel>Reseller</FormLabel></div>
                    </FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>Create</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-[300px]" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Credits (Used/Total)</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username || u.email}</TableCell>
                  <TableCell>{u.planName || "N/A"}</TableCell>
                  <TableCell>{u.creditsUsed} / {u.creditsTotal}</TableCell>
                  <TableCell>
                    {(u as any).planExpiresAt ? (
                      <span className={new Date((u as any).planExpiresAt) <= new Date() ? "text-red-500 text-xs" : "text-muted-foreground text-xs"}>
                        {new Date((u as any).planExpiresAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="space-x-1">
                    {u.isAdmin && <Badge variant="default">Admin</Badge>}
                    {u.isReseller && <Badge className="bg-blue-600">Reseller</Badge>}
                    {!u.isAdmin && !u.isReseller && <Badge variant="outline">User</Badge>}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Dialog open={editUserId === u.id} onOpenChange={(open) => {
                      if(open) {
                        editForm.reset({ 
                          planId: u.planId ? u.planId.toString() : "none", 
                          creditsTotal: u.creditsTotal, 
                          creditsUsed: u.creditsUsed,
                          isAdmin: u.isAdmin,
                          isReseller: u.isReseller,
                          newPassword: "",
                        });
                        setEditUserId(u.id);
                      } else setEditUserId(null);
                    }}>
                      <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
                        <Form {...editForm}>
                          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <FormField control={editForm.control} name="planId" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Plan</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Plan" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      <SelectItem value="none">No Plan</SelectItem>
                                      {plans?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )} />
                              <FormField control={editForm.control} name="isAdmin" render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 rounded-md border p-3 mt-8 h-10">
                                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                  <FormLabel className="!mt-0">Admin</FormLabel>
                                </FormItem>
                              )} />
                            </div>
                            <FormField control={editForm.control} name="isReseller" render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 rounded-md border p-3">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <FormLabel className="!mt-0">Reseller</FormLabel>
                              </FormItem>
                            )} />
                            <div className="grid grid-cols-2 gap-4">
                              <FormField control={editForm.control} name="creditsTotal" render={({ field }) => (
                                <FormItem><FormLabel>Total Credits</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                              )} />
                              <FormField control={editForm.control} name="creditsUsed" render={({ field }) => (
                                <FormItem><FormLabel>Used Credits</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                              )} />
                            </div>
                            <FormField control={editForm.control} name="newPassword" render={({ field }) => (
                              <FormItem>
                                <FormLabel>New Password</FormLabel>
                                <FormControl><Input type="password" placeholder="Leave empty to keep current" {...field} /></FormControl>
                              </FormItem>
                            )} />
                            <Button type="submit" className="w-full" disabled={updateMutation.isPending}>Update</Button>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Confirm Delete</AlertDialogTitle><AlertDialogDescription>This user will be permanently deleted.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => {
                            deleteMutation.mutate({ id: u.id }, {
                              onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() })
                            });
                          }} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function UsageTab() {
  const { data: logs, isLoading } = useListAdminUsage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Logs</CardTitle>
        <CardDescription>Credit usage for all users.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-[300px]" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="text-right">Credits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs?.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(log.createdAt), "dd MMM yyyy, h:mm a")}
                  </TableCell>
                  <TableCell className="font-medium">{log.userEmail}</TableCell>
                  <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                  <TableCell className="text-right font-bold text-destructive">-{log.creditsUsed}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
