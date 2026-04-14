import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth";
import { useListPlans } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Calendar, UserPlus, ArrowLeft, ChevronRight } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

function useResellerApi() {
  const { token } = useAuth();

  const apiFetch = useCallback(async (path: string, options: RequestInit = {}) => {
    const res = await fetch(`${BASE_URL}/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(data.error || "Request failed");
    }
    return res.json();
  }, [token]);

  return apiFetch;
}

interface ResellerUser {
  id: number;
  username: string;
  email: string | null;
  isAdmin: boolean;
  isReseller: boolean;
  addedBy: number | null;
  planId: number | null;
  planName: string | null;
  creditsTotal: number;
  creditsUsed: number;
  planExpiresAt: string | null;
  createdAt: string;
}

interface ResellerStats {
  totalUsersAdded: number;
  dailyStats: Array<{ date: string; count: number }>;
  resellerBreakdown: Array<{ resellerId: number; resellerName: string; count: number }>;
}

interface ResellerDetail {
  reseller: { id: number; username: string };
  users: ResellerUser[];
  dailyStats: Array<{ date: string; count: number }>;
  totalUsers: number;
}

function ResellerDetailView({ resellerId, resellerName, onBack, apiFetch }: {
  resellerId: number;
  resellerName: string;
  onBack: () => void;
  apiFetch: (path: string, options?: RequestInit) => Promise<unknown>;
}) {
  const [detail, setDetail] = useState<ResellerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch(`/reseller/users/${resellerId}`) as ResellerDetail;
        setDetail(data);
      } catch {
        toast({ title: "Error", description: "Failed to load reseller details", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [resellerId, apiFetch, toast]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">{resellerName}</h2>
          <p className="text-sm text-muted-foreground">
            Total {detail.totalUsers} users added
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Addition History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {detail.dailyStats.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Users Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.dailyStats.map((d) => (
                  <TableRow key={d.date}>
                    <TableCell>{format(new Date(d.date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-right font-medium">{d.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm py-4 text-center">No additions yet</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users Added ({detail.users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Added On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.username}</TableCell>
                    <TableCell>
                      {u.planName ? (
                        <Badge variant="secondary">{u.planName}</Badge>
                      ) : (
                        <span className="text-muted-foreground">No plan</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.creditsTotal - u.creditsUsed} / {u.creditsTotal}
                    </TableCell>
                    <TableCell>{format(new Date(u.createdAt), "dd MMM yyyy, HH:mm")}</TableCell>
                  </TableRow>
                ))}
                {detail.users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No users added yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResellerPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const apiFetch = useResellerApi();
  const { data: plans } = useListPlans();

  const [users, setUsers] = useState<ResellerUser[]>([]);
  const [stats, setStats] = useState<ResellerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  const [selectedReseller, setSelectedReseller] = useState<{ id: number; name: string } | null>(null);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPlanId, setNewPlanId] = useState<string>("");
  const [newCredits, setNewCredits] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [usersData, statsData] = await Promise.all([
        apiFetch("/reseller/users"),
        apiFetch("/reseller/stats"),
      ]);
      setUsers(usersData as ResellerUser[]);
      setStats(statsData as ResellerStats);
    } catch {
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddUser = async () => {
    if (!newUsername || !newPassword) {
      toast({ title: "Error", description: "Username and password are required", variant: "destructive" });
      return;
    }

    setAddLoading(true);
    try {
      await apiFetch("/reseller/users", {
        method: "POST",
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          planId: newPlanId ? parseInt(newPlanId) : null,
          creditsTotal: newCredits ? parseInt(newCredits) : 0,
        }),
      });
      toast({ title: "Success", description: "User added successfully" });
      setAddOpen(false);
      setNewUsername("");
      setNewPassword("");
      setNewPlanId("");
      setNewCredits("");
      loadData();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to add user", variant: "destructive" });
    } finally {
      setAddLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const isAdmin = user?.isAdmin === true;

  if (selectedReseller) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <ResellerDetailView
          resellerId={selectedReseller.id}
          resellerName={selectedReseller.name}
          onBack={() => setSelectedReseller(null)}
          apiFetch={apiFetch}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Reseller Panel
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage users and track additions
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Username</label>
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Plan</label>
                <Select value={newPlanId} onValueChange={setNewPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans?.map((plan: { id: number; name: string }) => (
                      <SelectItem key={plan.id} value={String(plan.id)}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Credits</label>
                <Input
                  type="number"
                  value={newCredits}
                  onChange={(e) => setNewCredits(e.target.value)}
                  placeholder="Total credits"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAddUser} disabled={addLoading}>
                {addLoading ? "Adding..." : "Add User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Total Users Added</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.totalUsersAdded ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Added Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {stats?.dailyStats?.find(d => d.date === new Date().toISOString().split("T")[0])?.count ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {stats?.dailyStats?.slice(0, 7).reduce((sum, d) => sum + d.count, 0) ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {isAdmin && stats?.resellerBreakdown && stats.resellerBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Resellers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reseller Name</TableHead>
                  <TableHead className="text-right">Users Added</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.resellerBreakdown.map((r) => (
                  <TableRow
                    key={r.resellerId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedReseller({ id: r.resellerId, name: r.resellerName })}
                  >
                    <TableCell className="font-medium">{r.resellerName}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{r.count}</Badge>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Daily Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.dailyStats && stats.dailyStats.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Users Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.dailyStats.map((d) => (
                    <TableRow key={d.date}>
                      <TableCell>{format(new Date(d.date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-right">{d.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">No data yet</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            {isAdmin ? "All Users" : "My Users"} ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Role</TableHead>
                  {isAdmin && <TableHead>Added By</TableHead>}
                  <TableHead>Added On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const addedByName = isAdmin && u.addedBy
                    ? stats?.resellerBreakdown?.find(r => r.resellerId === u.addedBy)?.resellerName || `#${u.addedBy}`
                    : null;

                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.username}</TableCell>
                      <TableCell>
                        {u.planName ? (
                          <Badge variant="secondary">{u.planName}</Badge>
                        ) : (
                          <span className="text-muted-foreground">No plan</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {u.creditsTotal - u.creditsUsed} / {u.creditsTotal}
                      </TableCell>
                      <TableCell>
                        {u.planExpiresAt ? (
                          <span className={new Date(u.planExpiresAt) <= new Date() ? "text-red-500" : "text-muted-foreground"}>
                            {format(new Date(u.planExpiresAt), "dd MMM yyyy")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {u.isAdmin ? (
                          <Badge variant="destructive">Admin</Badge>
                        ) : u.isReseller ? (
                          <Badge className="bg-blue-600">Reseller</Badge>
                        ) : (
                          <Badge variant="outline">User</Badge>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          {addedByName ? (
                            <span
                              className="text-primary cursor-pointer hover:underline"
                              onClick={() => {
                                if (u.addedBy) {
                                  setSelectedReseller({ id: u.addedBy, name: addedByName });
                                }
                              }}
                            >
                              {addedByName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>{format(new Date(u.createdAt), "dd MMM yyyy, HH:mm")}</TableCell>
                    </TableRow>
                  );
                })}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-8">
                      No users added yet. Click "Add User" to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
