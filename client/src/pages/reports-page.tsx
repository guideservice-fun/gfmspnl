import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Check, Loader2 } from "lucide-react";
import type { WorkReportWithUser } from "@shared/schema";

const reportSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(10, "Report must be at least 10 characters"),
});

type ReportFormData = z.infer<typeof reportSchema>;

export default function ReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const { data: reports = [], isLoading } = useQuery<WorkReportWithUser[]>({
    queryKey: ["/api/reports"],
  });

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const createReportMutation = useMutation({
    mutationFn: async (data: ReportFormData) => {
      const res = await apiRequest("POST", "/api/reports", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({ title: "Report Submitted", description: "Your work report has been submitted for review." });
      form.reset();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const markReviewedMutation = useMutation({
    mutationFn: async (reportId: number) => {
      const res = await apiRequest("PATCH", `/api/reports/${reportId}`, { status: "reviewed" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({ title: "Report Reviewed", description: "Report has been marked as reviewed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredReports = reports.filter((report) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return report.status === "pending";
    if (activeTab === "reviewed") return report.status === "reviewed";
    return true;
  });

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pendingCount = reports.filter(r => r.status === "pending").length;

  return (
    <MainLayout>
      <div className="h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b">
          <div>
            <h1 className="text-2xl font-semibold">Work Reports</h1>
            <p className="text-sm text-muted-foreground">
              {user?.isAdmin ? "Review staff work reports" : "Submit and track your work reports"}
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-report">
                <Plus className="h-4 w-4 mr-2" />
                New Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Submit Work Report</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createReportMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Report title" {...field} data-testid="input-report-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Report Content</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your work, accomplishments, and any blockers..." 
                            className="min-h-[200px] resize-none" 
                            {...field} 
                            data-testid="input-report-content"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createReportMutation.isPending} data-testid="button-submit-report">
                      {createReportMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Submit Report
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all">
                All ({reports.length})
              </TabsTrigger>
              <TabsTrigger value="pending" data-testid="tab-pending">
                Pending ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="reviewed" data-testid="tab-reviewed">
                Reviewed ({reports.length - pendingCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Reports List */}
        <ScrollArea className="flex-1 p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No reports found</h3>
              <p className="text-sm text-muted-foreground">
                {activeTab === "all" 
                  ? "Submit your first work report to get started" 
                  : `No ${activeTab} reports`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <Card key={report.id} data-testid={`report-card-${report.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base">{report.title}</CardTitle>
                          <Badge 
                            variant={report.status === "pending" ? "default" : "secondary"}
                            className="text-xs capitalize"
                          >
                            {report.status}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">
                          {formatDate(report.createdAt)}
                        </CardDescription>
                      </div>
                      
                      {user?.isAdmin && report.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markReviewedMutation.mutate(report.id)}
                          disabled={markReviewedMutation.isPending}
                          data-testid={`button-review-${report.id}`}
                        >
                          {markReviewedMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Mark Reviewed
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-3">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={report.user?.avatar || undefined} />
                        <AvatarFallback className="text-xs">
                          {report.user?.name ? getInitials(report.user.name) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{report.user?.name}</span>
                      <VerifiedBadge role={report.user?.role || null} size="sm" />
                    </div>
                    
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {report.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </MainLayout>
  );
}
