import { SparklesIcon, TrophyIcon } from "lucide-react";
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
        "h-auto gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
        qualiflyer
          ? "bg-grit text-white shadow-md"
          : "bg-white text-slate-700 ring-1 ring-slate-200",
      )}
    >
      {qualiflyer ? (
        <TrophyIcon className="size-4 text-spark" aria-hidden="true" />
      ) : (
        <SparklesIcon className="size-4 text-primary" aria-hidden="true" />
      )}
      {qualiflyer ? "Qualiflyer" : "Pre-Qualiflyer"}
    </Badge>
  );
}
