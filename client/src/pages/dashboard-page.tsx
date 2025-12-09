import { useAuth } from "@/hooks/use-auth";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Clock, 
  CheckSquare, 
  FileText, 
  MessageSquare,
  ArrowRight,
  Play,
  Square,
  AlertCircle
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { TaskWithUsers, Attendance } from "@shared/schema";

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch today's attendance
  const { data: todayAttendance, isLoading: attendanceLoading } = useQuery<Attendance | null>({
    queryKey: ["/api/attendance/today"],
  });

  // Fetch user's tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<TaskWithUsers[]>({
    queryKey: ["/api/tasks", "my"],
  });

  // Fetch recent messages count
  const { data: messageStats } = useQuery<{ unreadCount: number }>({
    queryKey: ["/api/messages/stats"],
  });

  // Fetch pending work reports count (for staff - their pending, for admin - all pending)
  const { data: reportStats } = useQuery<{ pendingCount: number }>({
    queryKey: ["/api/reports/stats"],
  });

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/attendance/clock-in");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      toast({ title: "Clocked In", description: "You have successfully clocked in." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/attendance/clock-out");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      toast({ title: "Clocked Out", description: "You have successfully clocked out." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const pendingTasks = tasks.filter(t => t.status === "pending" || t.status === "in_progress");
  const completedTasks = tasks.filter(t => t.status === "completed");

  const getTimeString = (date: Date | string | null) => {
    if (!date) return "--:--";
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-6 max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold" data-testid="text-welcome">
              Welcome back, {user?.name?.split(" ")[0]}
            </h1>
            <p className="text-muted-foreground">
              Here's an overview of your day
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Attendance Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {attendanceLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : todayAttendance ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={todayAttendance.clockOut ? "secondary" : "default"} className="text-xs">
                        {todayAttendance.clockOut ? "Completed" : "Working"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      In: {getTimeString(todayAttendance.clockIn)}
                      {todayAttendance.clockOut && ` | Out: ${getTimeString(todayAttendance.clockOut)}`}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Not clocked in yet</div>
                )}
              </CardContent>
            </Card>

            {/* Tasks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <>
                    <div className="text-2xl font-semibold" data-testid="text-pending-tasks">
                      {pendingTasks.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {completedTasks.length} completed
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Messages */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{messageStats?.unreadCount || 0}</div>
                <p className="text-xs text-muted-foreground">unread messages</p>
              </CardContent>
            </Card>

            {/* Reports */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {user?.isAdmin ? "Pending Reviews" : "My Reports"}
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{reportStats?.pendingCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {user?.isAdmin ? "awaiting review" : "pending review"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Clock In/Out Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attendance</CardTitle>
              <CardDescription>Clock in to start your work day</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-4">
              {!todayAttendance ? (
                <Button 
                  onClick={() => clockInMutation.mutate()}
                  disabled={clockInMutation.isPending}
                  data-testid="button-clock-in"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Clock In
                </Button>
              ) : !todayAttendance.clockOut ? (
                <Button 
                  onClick={() => clockOutMutation.mutate()}
                  disabled={clockOutMutation.isPending}
                  variant="secondary"
                  data-testid="button-clock-out"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Clock Out
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary">Day Complete</Badge>
                  <span>
                    Worked from {getTimeString(todayAttendance.clockIn)} to {getTimeString(todayAttendance.clockOut)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recent Tasks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">Your Tasks</CardTitle>
                  <CardDescription>Tasks assigned to you</CardDescription>
                </div>
                <Link href="/tasks">
                  <Button variant="ghost" size="sm" data-testid="link-view-tasks">
                    View All <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : pendingTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <CheckSquare className="h-10 w-10 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No pending tasks</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingTasks.slice(0, 3).map((task) => (
                      <div 
                        key={task.id}
                        className="flex items-center gap-3 p-3 rounded-md bg-muted/50"
                        data-testid={`task-item-${task.id}`}
                      >
                        <div 
                          className={`w-1 h-10 rounded-full ${
                            task.priority === "high" 
                              ? "bg-red-500" 
                              : task.priority === "medium" 
                              ? "bg-yellow-500" 
                              : "bg-green-500"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{task.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">{task.status.replace("_", " ")}</p>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {task.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>Common tasks you might need</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/chat">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-go-chat">
                    <MessageSquare className="h-4 w-4 mr-3" />
                    Open Chat
                  </Button>
                </Link>
                <Link href="/reports">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-go-reports">
                    <FileText className="h-4 w-4 mr-3" />
                    Submit Work Report
                  </Button>
                </Link>
                <Link href="/attendance">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-go-attendance">
                    <Clock className="h-4 w-4 mr-3" />
                    View Attendance History
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
