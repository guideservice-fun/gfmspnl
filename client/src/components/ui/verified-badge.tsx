import { CheckCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Role } from "@shared/schema";

interface VerifiedBadgeProps {
  role: Role | null;
  size?: "sm" | "md" | "lg";
}

export function VerifiedBadge({ role, size = "md" }: VerifiedBadgeProps) {
  if (!role) return null;

  const sizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <span 
          className="inline-flex items-center"
          data-testid="badge-verified"
        >
          <CheckCircle 
            className={sizeClasses[size]} 
            style={{ color: role.color }}
            fill={role.color}
            stroke="hsl(var(--background))"
            strokeWidth={2}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        <span style={{ color: role.color }}>{role.name}</span>
      </TooltipContent>
    </Tooltip>
  );
}
