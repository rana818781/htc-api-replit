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
import { Users, Plus, Calendar, TrendingUp, UserPlus } from "lucide-react";

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
  createdAt: string;
}

interface ResellerStats {
  totalUsersAdded: number;
  dailyStats: Array<{ date: string; count: number }>;
  resellerBreakdown: Array<{ resellerId: number; resellerName: string; count: number }>;
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
      setUsers(usersData);
      setStats(statsData);
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
              <TrendingUp className="h-5 w-5" />
              Reseller Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reseller</TableHead>
                  <TableHead className="text-right">Users Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.resellerBreakdown.map((r) => (
                  <TableRow key={r.resellerId}>
                    <TableCell className="font-medium">{r.resellerName}</TableCell>
                    <TableCell className="text-right">{r.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
                    <TableCell>{format(new Date(d.date), "MMM dd, yyyy")}</TableCell>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users ({users.length})
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
                  <TableHead>Role</TableHead>
                  <TableHead>Added On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
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
                      {u.isAdmin ? (
                        <Badge variant="destructive">Admin</Badge>
                      ) : u.isReseller ? (
                        <Badge className="bg-blue-600">Reseller</Badge>
                      ) : (
                        <Badge variant="outline">User</Badge>
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(u.createdAt), "MMM dd, yyyy HH:mm")}</TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
