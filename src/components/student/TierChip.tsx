import { Badge } from "@/components/ui/badge";
import { Tier } from "@/domain/states";
import { cn } from "@/lib/utils";

/** "Qualiflyer" once a student holds at least one active track badge, otherwise "Pre-Qualiflyer". */
export function TierChip({ tier }: { tier: Tier }) {
  const qualiflyer = tier === Tier.QUALIFLYER;
  return (
    <Badge
      variant="secondary"
      title={
        qualiflyer
          ? "Qualiflyer: holds at least one track badge"
          : "Pre-Qualiflyer: registered, no track badge yet"
      }
      className={cn(
        "px-3 py-1 text-sm font-medium",
        qualiflyer ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900",
      )}
    >
      {qualiflyer ? "Qualiflyer" : "Pre-Qualiflyer"}
    </Badge>
  );
}
