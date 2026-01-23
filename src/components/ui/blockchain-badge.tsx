import { Shield, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface BlockchainBadgeProps {
  hash?: string;
  timestamp?: string;
  className?: string;
  compact?: boolean;
}

export function BlockchainBadge({ hash, timestamp, className, compact = false }: BlockchainBadgeProps) {
  if (compact) {
    return (
      <div className={cn("inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary", className)}>
        <Shield className="h-3 w-3" />
        Blockchain Secured
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-primary/20 bg-primary/5 p-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Blockchain Secured</p>
          <p className="text-xs text-muted-foreground">Immutable Agreement</p>
        </div>
        <Lock className="ml-auto h-4 w-4 text-primary" />
      </div>
      
      {hash && (
        <div className="space-y-2">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Transaction Hash</p>
            <p className="font-mono text-xs text-foreground bg-muted/50 rounded px-2 py-1 break-all">
              {hash}
            </p>
          </div>
          {timestamp && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Timestamp</p>
              <p className="text-xs text-foreground">{timestamp}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
