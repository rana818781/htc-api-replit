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
  useCreateAdminSession,
  useUpdateAdminSession,
  useDeleteAdminSession,
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
import { ShieldAlert, Users, Key, Activity, Plus, Edit, Trash2 } from "lucide-react";

const sessionSchema = z.object({
  label: z.string().min(1, "Label is required"),
  cookieData: z.string().min(1, "Cookie data is required"),
  isActive: z.boolean().default(true),
});

const userSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  planId: z.string().optional(),
  creditsTotal: z.coerce.number().min(0).default(0),
  isAdmin: z.boolean().default(false),
});

const editUserSchema = z.object({
  planId: z.string().optional(),
  creditsTotal: z.coerce.number().min(0).default(0),
  creditsUsed: z.coerce.number().min(0).default(0),
  isAdmin: z.boolean().default(false),
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
        <h1 className="text-2xl font-bold">অ্যাক্সেস নেই</h1>
        <p className="text-muted-foreground mt-2">এই পৃষ্ঠাটি শুধুমাত্র অ্যাডমিনদের জন্য।</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-8 w-8 text-primary" /> অ্যাডমিন প্যানেল
        </h1>
        <p className="text-muted-foreground mt-1">প্ল্যাটফর্ম পরিচালনা এবং ডেটা মনিটর করুন।</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">ওভারভিউ</TabsTrigger>
          <TabsTrigger value="sessions">সেশন</TabsTrigger>
          <TabsTrigger value="users">ব্যবহারকারী</TabsTrigger>
          <TabsTrigger value="usage">ব্যবহার লগ</TabsTrigger>
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
          <CardTitle className="text-sm font-medium">মোট সেশন</CardTitle>
          <Key className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalSessions || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">অ্যাক্টিভ সেশন</CardTitle>
          <Key className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.activeSessions || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">মোট ব্যবহারকারী</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">মোট ব্যবহার</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalUsage || 0}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function SessionsTab() {
  const { data: sessions, isLoading } = useListAdminSessions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateAdminSession();
  const updateMutation = useUpdateAdminSession();
  const deleteMutation = useDeleteAdminSession();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editSessionId, setEditSessionId] = useState<number | null>(null);

  const createForm = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
    defaultValues: { label: "", cookieData: "", isActive: true },
  });

  const editForm = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
  });

  const onCreateSubmit = (values: z.infer<typeof sessionSchema>) => {
    createMutation.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "সফল", description: "সেশন যোগ করা হয়েছে।" });
        setIsCreateOpen(false);
        createForm.reset();
        queryClient.invalidateQueries({ queryKey: getListAdminSessionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      }
    });
  };

  const onEditSubmit = (values: z.infer<typeof sessionSchema>) => {
    if (!editSessionId) return;
    updateMutation.mutate({ id: editSessionId, data: values }, {
      onSuccess: () => {
        toast({ title: "সফল", description: "সেশন আপডেট করা হয়েছে।" });
        setEditSessionId(null);
        queryClient.invalidateQueries({ queryKey: getListAdminSessionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "সফল", description: "সেশন ডিলিট করা হয়েছে।" });
        queryClient.invalidateQueries({ queryKey: getListAdminSessionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>সেশন ম্যানেজমেন্ট</CardTitle>
          <CardDescription>Google Flow অ্যাক্সেস করার জন্য কুকি সেশন পরিচালনা করুন।</CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="btn-new-session"><Plus className="h-4 w-4 mr-2" /> নতুন সেশন</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>নতুন সেশন যোগ করুন</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>লেবেল</FormLabel>
                      <FormControl><Input placeholder="ex: Account 1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="cookieData"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>কুকি ডেটা</FormLabel>
                      <FormControl><Textarea className="h-32 font-mono text-xs" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>অ্যাক্টিভ</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>সংরক্ষণ করুন</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>লেবেল</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead>ব্যবহার</TableHead>
                <TableHead>সর্বশেষ ব্যবহার</TableHead>
                <TableHead className="text-right">অ্যাকশন</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions?.map(session => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.label}</TableCell>
                  <TableCell>
                    <Badge variant={session.isActive ? "default" : "secondary"}>
                      {session.isActive ? "অ্যাক্টিভ" : "ইনঅ্যাক্টিভ"}
                    </Badge>
                  </TableCell>
                  <TableCell>{session.usageCount}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {session.lastUsedAt ? format(new Date(session.lastUsedAt), "dd MMM, h:mm a") : "-"}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Dialog open={editSessionId === session.id} onOpenChange={(open) => {
                      if(open) {
                        editForm.reset({ label: session.label, cookieData: session.cookieData, isActive: session.isActive });
                        setEditSessionId(session.id);
                      } else {
                        setEditSessionId(null);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>সেশন এডিট করুন</DialogTitle>
                        </DialogHeader>
                        <Form {...editForm}>
                          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                            <FormField
                              control={editForm.control}
                              name="label"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>লেবেল</FormLabel>
                                  <FormControl><Input {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={editForm.control}
                              name="cookieData"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>কুকি ডেটা</FormLabel>
                                  <FormControl><Textarea className="h-32 font-mono text-xs" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={editForm.control}
                              name="isActive"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                  <div className="space-y-1 leading-none"><FormLabel>অ্যাক্টিভ</FormLabel></div>
                                </FormItem>
                              )}
                            />
                            <Button type="submit" className="w-full" disabled={updateMutation.isPending}>আপডেট করুন</Button>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>আপনি কি নিশ্চিত?</AlertDialogTitle>
                          <AlertDialogDescription>এই সেশনটি মুছে ফেলা হবে। এই কাজ বাতিল করা যাবে না।</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>বাতিল</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(session.id)} className="bg-destructive text-destructive-foreground">ডিলিট করুন</AlertDialogAction>
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
    defaultValues: { email: "", password: "", creditsTotal: 0, isAdmin: false, planId: "" },
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
        toast({ title: "সফল", description: "ব্যবহারকারী তৈরি করা হয়েছে।" });
        setIsCreateOpen(false);
        createForm.reset();
        queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      }
    });
  };

  const onEditSubmit = (values: z.infer<typeof editUserSchema>) => {
    if (!editUserId) return;
    const payload = {
      ...values,
      planId: values.planId && values.planId !== "none" ? parseInt(values.planId) : null
    };
    updateMutation.mutate({ id: editUserId, data: payload }, {
      onSuccess: () => {
        toast({ title: "সফল", description: "ব্যবহারকারী আপডেট করা হয়েছে।" });
        setEditUserId(null);
        queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>ব্যবহারকারী ম্যানেজমেন্ট</CardTitle>
          <CardDescription>প্ল্যাটফর্মের ব্যবহারকারী এবং তাদের ক্রেডিট পরিচালনা করুন।</CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> নতুন ব্যবহারকারী</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>নতুন ব্যবহারকারী</DialogTitle></DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField control={createForm.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>ইমেইল</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={createForm.control} name="password" render={({ field }) => (
                  <FormItem><FormLabel>পাসওয়ার্ড</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={createForm.control} name="planId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>প্ল্যান</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="প্ল্যান নির্বাচন করুন" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">কোনো প্ল্যান নেই</SelectItem>
                          {plans?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={createForm.control} name="creditsTotal" render={({ field }) => (
                    <FormItem><FormLabel>মোট ক্রেডিট</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={createForm.control} name="isAdmin" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none"><FormLabel>অ্যাডমিন</FormLabel></div>
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>তৈরি করুন</Button>
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
                <TableHead>ইমেইল</TableHead>
                <TableHead>প্ল্যান</TableHead>
                <TableHead>ক্রেডিট (ব্যবহৃত/মোট)</TableHead>
                <TableHead>অ্যাডমিন</TableHead>
                <TableHead className="text-right">অ্যাকশন</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>{u.planName || "N/A"}</TableCell>
                  <TableCell>{u.creditsUsed} / {u.creditsTotal}</TableCell>
                  <TableCell><Badge variant={u.isAdmin ? "default" : "outline"}>{u.isAdmin ? "Yes" : "No"}</Badge></TableCell>
                  <TableCell className="text-right space-x-2">
                    <Dialog open={editUserId === u.id} onOpenChange={(open) => {
                      if(open) {
                        editForm.reset({ 
                          planId: u.planId ? u.planId.toString() : "none", 
                          creditsTotal: u.creditsTotal, 
                          creditsUsed: u.creditsUsed,
                          isAdmin: u.isAdmin 
                        });
                        setEditUserId(u.id);
                      } else setEditUserId(null);
                    }}>
                      <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>ব্যবহারকারী এডিট করুন</DialogTitle></DialogHeader>
                        <Form {...editForm}>
                          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <FormField control={editForm.control} name="planId" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>প্ল্যান</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="প্ল্যান" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      <SelectItem value="none">কোনো প্ল্যান নেই</SelectItem>
                                      {plans?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )} />
                              <FormField control={editForm.control} name="isAdmin" render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 rounded-md border p-3 mt-8 h-10">
                                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                  <FormLabel className="!mt-0">অ্যাডমিন</FormLabel>
                                </FormItem>
                              )} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <FormField control={editForm.control} name="creditsTotal" render={({ field }) => (
                                <FormItem><FormLabel>মোট ক্রেডিট</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                              )} />
                              <FormField control={editForm.control} name="creditsUsed" render={({ field }) => (
                                <FormItem><FormLabel>ব্যবহৃত ক্রেডিট</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                              )} />
                            </div>
                            <Button type="submit" className="w-full" disabled={updateMutation.isPending}>আপডেট করুন</Button>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>নিশ্চিত করুন</AlertDialogTitle><AlertDialogDescription>এই ব্যবহারকারী মুছে ফেলা হবে।</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>বাতিল</AlertDialogCancel>
                          <AlertDialogAction onClick={() => {
                            deleteMutation.mutate({ id: u.id }, {
                              onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() })
                            });
                          }} className="bg-destructive text-destructive-foreground">ডিলিট</AlertDialogAction>
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
        <CardTitle>ব্যবহার লগ</CardTitle>
        <CardDescription>সব ব্যবহারকারীর ক্রেডিট ব্যবহারের তালিকা।</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-[300px]" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>তারিখ</TableHead>
                <TableHead>ব্যবহারকারী</TableHead>
                <TableHead>অ্যাকশন</TableHead>
                <TableHead className="text-right">ক্রেডিট</TableHead>
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
