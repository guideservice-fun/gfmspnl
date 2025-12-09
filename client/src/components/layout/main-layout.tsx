import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  LayoutDashboard, 
  MessageSquare, 
  CheckSquare, 
  Clock, 
  FileText, 
  User, 
  Settings,
  LogOut,
  Shield
} from "lucide-react";
import logoUrl from "@assets/grovefan_logo-modified-Photoroom_1765220095490.png";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/chat", icon: MessageSquare, label: "Chat" },
  { path: "/tasks", icon: CheckSquare, label: "Tasks" },
  { path: "/attendance", icon: Clock, label: "Attendance" },
  { path: "/reports", icon: FileText, label: "Reports" },
  { path: "/profile", icon: User, label: "Profile" },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Icon Sidebar - 64px */}
      <aside className="w-16 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-4">
        {/* Logo */}
        <div className="mb-6">
          <img 
            src={logoUrl} 
            alt="Grovefan" 
            className="w-10 h-10 object-contain"
            data-testid="img-logo"
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = location === item.path || 
              (item.path !== "/" && location.startsWith(item.path));
            
            return (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link href={item.path}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`relative ${
                        isActive 
                          ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                          : "text-muted-foreground"
                      }`}
                      data-testid={`nav-${item.label.toLowerCase()}`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r" />
                      )}
                      <item.icon className="h-5 w-5" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
          
          {/* Admin Panel Link */}
          {user?.isAdmin && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Link href="/admin">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`relative ${
                      location.startsWith("/admin")
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground"
                    }`}
                    data-testid="nav-admin"
                  >
                    {location.startsWith("/admin") && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r" />
                    )}
                    <Shield className="h-5 w-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Admin Panel
              </TooltipContent>
            </Tooltip>
          )}
        </nav>

        {/* Bottom Section - User Avatar & Logout */}
        <div className="flex flex-col items-center gap-2 mt-auto">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link href="/profile">
                <Avatar className="h-9 w-9 cursor-pointer" data-testid="avatar-user">
                  <AvatarImage src={user?.avatar || undefined} alt={user?.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user?.name ? getInitials(user.name) : "U"}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {user?.name || "Profile"}
            </TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                data-testid="button-logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              Logout
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
