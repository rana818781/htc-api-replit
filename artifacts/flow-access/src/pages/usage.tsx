import { useGetUserUsage } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Usage() {
  const { data: usageLogs, isLoading } = useGetUserUsage();

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Usage Logs</h1>
        <p className="text-muted-foreground mt-1">View your past credit usage and API logs.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log History</CardTitle>
          <CardDescription>
            All recent account activity is shown here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : usageLogs && usageLogs.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageLogs.map((log) => (
                    <TableRow key={log.id} data-testid={`row-usage-${log.id}`}>
                      <TableCell className="font-medium">
                        {format(new Date(log.createdAt), "dd MMM yyyy, h:mm a")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.action === "inject_session" ? "default" : "outline"}>
                          {log.action === "inject" || log.action === "inject_session" ? "API Access" : log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-destructive font-semibold">
                        -{log.creditsUsed}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-md bg-muted/20">
              <p className="text-muted-foreground">No logs found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
