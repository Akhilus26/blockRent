import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        pending: "bg-warning/10 text-warning border border-warning/20",
        approved: "bg-success/10 text-success border border-success/20",
        rejected: "bg-destructive/10 text-destructive border border-destructive/20",
        finalized: "bg-primary/10 text-primary border border-primary/20",
        negotiating: "bg-accent/10 text-accent-foreground border border-accent/20",
        accepted: "bg-success/10 text-success border border-success/20",
      },
    },
    defaultVariants: {
      variant: "pending",
    },
  }
);

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
}

const statusLabels: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  finalized: "Finalized",
  negotiating: "Negotiating",
  accepted: "Accepted",
};

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const variant = status as "pending" | "approved" | "rejected" | "finalized" | "negotiating" | "accepted";
  
  return (
    <span
      className={cn(statusBadgeVariants({ variant }), className)}
      {...props}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabels[status] || status}
    </span>
  );
}
