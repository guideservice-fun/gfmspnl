import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Play, Square, Clock, Calendar, Loader2 } from "lucide-react";
import type { Attendance, AttendanceWithUser } from "@shared/schema";

export default function AttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Fetch today's attendance
  const { data: todayAttendance, isLoading: todayLoading } = useQuery<Attendance | null>({
    queryKey: ["/api/attendance/today"],
  });

  // Fetch attendance history (admin sees all, staff sees their own)
  const { data: attendanceHistory = [], isLoading: historyLoading } = useQuery<AttendanceWithUser[]>({
    queryKey: ["/api/attendance"],
  });

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/attendance/clock-in");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      toast({ title: "Clocked Out", description: "You have successfully clocked out." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatTime = (date: Date | string | null) => {
    if (!date) return "--:--";
    return new Date(date).toLocaleTimeString("en-US", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const calculateDuration = (clockIn: Date | string, clockOut: Date | string | null) => {
    if (!clockOut) return "In Progress";
    const start = new Date(clockIn).getTime();
    const end = new Date(clockOut).getTime();
    const diff = end - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getStatusBadge = (attendance: Attendance) => {
    if (!attendance.clockOut) {
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Working</Badge>;
    }
    return <Badge variant="secondary">Completed</Badge>;
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <MainLayout>
      <div className="h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b">
          <div>
            <h1 className="text-2xl font-semibold">Attendance</h1>
            <p className="text-sm text-muted-foreground">
              Track your work hours and attendance history
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
              <SelectTrigger className="w-[120px]" data-testid="select-view-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="list">List View</SelectItem>
                <SelectItem value="calendar">Calendar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Today's Status Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">Today's Attendance</CardTitle>
                    <CardDescription>{formatDate(today)}</CardDescription>
                  </div>
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                {todayLoading ? (
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {!todayAttendance ? (
                      <Button 
                        onClick={() => clockInMutation.mutate()}
                        disabled={clockInMutation.isPending}
                        data-testid="button-clock-in"
                      >
                        {clockInMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Clock In
                      </Button>
                    ) : !todayAttendance.clockOut ? (
                      <Button 
                        onClick={() => clockOutMutation.mutate()}
                        disabled={clockOutMutation.isPending}
                        variant="secondary"
                        data-testid="button-clock-out"
                      >
                        {clockOutMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Square className="h-4 w-4 mr-2" />
                        )}
                        Clock Out
                      </Button>
                    ) : null}

                    {todayAttendance && (
                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Clock In: </span>
                          <span className="font-medium">{formatTime(todayAttendance.clockIn)}</span>
                        </div>
                        {todayAttendance.clockOut && (
                          <>
                            <div>
                              <span className="text-muted-foreground">Clock Out: </span>
                              <span className="font-medium">{formatTime(todayAttendance.clockOut)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Duration: </span>
                              <span className="font-medium">
                                {calculateDuration(todayAttendance.clockIn, todayAttendance.clockOut)}
                              </span>
                            </div>
                          </>
                        )}
                        {getStatusBadge(todayAttendance)}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attendance History */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">
                      {user?.isAdmin ? "All Attendance Records" : "Your Attendance History"}
                    </CardTitle>
                    <CardDescription>
                      {attendanceHistory.length} records found
                    </CardDescription>
                  </div>
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : attendanceHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-1">No attendance records</h3>
                    <p className="text-sm text-muted-foreground">
                      Clock in to start tracking your attendance
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {user?.isAdmin && <TableHead>Staff</TableHead>}
                          <TableHead>Date</TableHead>
                          <TableHead>Clock In</TableHead>
                          <TableHead>Clock Out</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceHistory.map((record) => (
                          <TableRow key={record.id} data-testid={`attendance-row-${record.id}`}>
                            {user?.isAdmin && (
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={record.user?.avatar || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {record.user?.name ? getInitials(record.user.name) : "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{record.user?.name}</span>
                                  <VerifiedBadge role={record.user?.role || null} size="sm" />
                                </div>
                              </TableCell>
                            )}
                            <TableCell>{formatDate(record.date)}</TableCell>
                            <TableCell>{formatTime(record.clockIn)}</TableCell>
                            <TableCell>{formatTime(record.clockOut)}</TableCell>
                            <TableCell>{calculateDuration(record.clockIn, record.clockOut)}</TableCell>
                            <TableCell>{getStatusBadge(record)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </MainLayout>
  );
}
