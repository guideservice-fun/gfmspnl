import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Check, 
  X, 
  Users, 
  Shield, 
  Palette, 
  Loader2,
  UserCheck,
  UserX,
  Clock
} from "lucide-react";
import type { AccessRequest, Role, UserWithRole } from "@shared/schema";

const roleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
});

type RoleFormData = z.infer<typeof roleSchema>;

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("requests");
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);

  // Fetch access requests
  const { data: accessRequests = [], isLoading: requestsLoading } = useQuery<AccessRequest[]>({
    queryKey: ["/api/access-requests"],
  });

  // Fetch all users
  const { data: allUsers = [], isLoading: usersLoading } = useQuery<UserWithRole[]>({
    queryKey: ["/api/users"],
  });

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const roleForm = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      color: "#3b82f6",
    },
  });

  // Approve access request
  const approveMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await apiRequest("POST", `/api/access-requests/${requestId}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/access-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Request Approved", description: "User has been approved and can now log in." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Reject access request
  const rejectMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await apiRequest("POST", `/api/access-requests/${requestId}/reject`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/access-requests"] });
      toast({ title: "Request Rejected", description: "Access request has been rejected." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Create role
  const createRoleMutation = useMutation({
    mutationFn: async (data: RoleFormData) => {
      const res = await apiRequest("POST", "/api/roles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Role Created", description: "New role has been created." });
      roleForm.reset({ name: "", color: "#3b82f6" });
      setIsRoleDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete role
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      await apiRequest("DELETE", `/api/roles/${roleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Role Deleted", description: "Role has been deleted." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Assign role to user
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: number; roleId: number | null }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/role`, { roleId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Role Updated", description: "User role has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const pendingRequests = accessRequests.filter(r => r.status === "pending");
  const approvedUsers = allUsers.filter(u => !u.isAdmin);

  return (
    <MainLayout>
      <div className="h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Admin Panel
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage access requests, users, and roles
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="requests" className="flex items-center gap-2" data-testid="tab-requests">
                <UserCheck className="h-4 w-4" />
                Requests
                {pendingRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {pendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2" data-testid="tab-users">
                <Users className="h-4 w-4" />
                Users ({approvedUsers.length})
              </TabsTrigger>
              <TabsTrigger value="roles" className="flex items-center gap-2" data-testid="tab-roles">
                <Palette className="h-4 w-4" />
                Roles ({roles.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          {activeTab === "requests" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Access Requests</CardTitle>
                <CardDescription>
                  Review and manage staff access requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : pendingRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <UserCheck className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-1">No pending requests</h3>
                    <p className="text-sm text-muted-foreground">
                      All access requests have been processed
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((request) => (
                        <TableRow key={request.id} data-testid={`request-row-${request.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {getInitials(request.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{request.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{request.username}</TableCell>
                          <TableCell>{request.email}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDate(request.requestedAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => approveMutation.mutate(request.id)}
                                disabled={approveMutation.isPending}
                                data-testid={`button-approve-${request.id}`}
                              >
                                {approveMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4 mr-1" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => rejectMutation.mutate(request.id)}
                                disabled={rejectMutation.isPending}
                                data-testid={`button-reject-${request.id}`}
                              >
                                {rejectMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <X className="h-4 w-4 mr-1" />
                                )}
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "users" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Staff Members</CardTitle>
                <CardDescription>
                  Manage staff members and assign roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : approvedUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-1">No staff members</h3>
                    <p className="text-sm text-muted-foreground">
                      Approve access requests to add staff
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff Member</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedUsers.map((staffUser) => (
                        <TableRow key={staffUser.id} data-testid={`user-row-${staffUser.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={staffUser.avatar || undefined} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(staffUser.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{staffUser.name}</span>
                              <VerifiedBadge role={staffUser.role} size="sm" />
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{staffUser.username}</TableCell>
                          <TableCell>{staffUser.email}</TableCell>
                          <TableCell>
                            <Select
                              value={staffUser.roleId?.toString() || "none"}
                              onValueChange={(value) => {
                                const roleId = value === "none" ? null : parseInt(value);
                                assignRoleMutation.mutate({ userId: staffUser.id, roleId });
                              }}
                            >
                              <SelectTrigger className="w-[160px]" data-testid={`select-role-${staffUser.id}`}>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Role</SelectItem>
                                {roles.map((role) => (
                                  <SelectItem key={role.id} value={role.id.toString()}>
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: role.color }}
                                      />
                                      {role.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "roles" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">Roles</CardTitle>
                  <CardDescription>
                    Create and manage custom roles with colors
                  </CardDescription>
                </div>
                <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-role">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Role
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Role</DialogTitle>
                    </DialogHeader>
                    <Form {...roleForm}>
                      <form 
                        onSubmit={roleForm.handleSubmit((data) => createRoleMutation.mutate(data))} 
                        className="space-y-4"
                      >
                        <FormField
                          control={roleForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Moderator, Editor" {...field} data-testid="input-role-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={roleForm.control}
                          name="color"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role Color</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-3">
                                  <Input
                                    type="color"
                                    className="w-12 h-9 p-1 cursor-pointer"
                                    {...field}
                                    data-testid="input-role-color"
                                  />
                                  <Input 
                                    value={field.value} 
                                    onChange={field.onChange}
                                    placeholder="#3b82f6"
                                    className="flex-1"
                                    data-testid="input-role-color-hex"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="pt-2">
                          <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                          <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                            <span className="font-medium">Staff Name</span>
                            <VerifiedBadge 
                              role={{ 
                                id: 0, 
                                name: roleForm.watch("name") || "Role", 
                                color: roleForm.watch("color") 
                              }} 
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            type="submit" 
                            disabled={createRoleMutation.isPending}
                            data-testid="button-submit-role"
                          >
                            {createRoleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Role
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {rolesLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : roles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Palette className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-1">No roles created</h3>
                    <p className="text-sm text-muted-foreground">
                      Create roles to assign to staff members
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roles.map((role) => (
                      <div 
                        key={role.id}
                        className="flex items-center justify-between p-4 rounded-md border"
                        data-testid={`role-card-${role.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: role.color }}
                          >
                            <Check className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">{role.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{role.color}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRoleMutation.mutate(role.id)}
                          disabled={deleteRoleMutation.isPending}
                          data-testid={`button-delete-role-${role.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </ScrollArea>
      </div>
    </MainLayout>
  );
}
