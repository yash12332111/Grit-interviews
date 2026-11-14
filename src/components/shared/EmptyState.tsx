import type { ReactNode } from "react";
import { InboxIcon } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description?: string;
  /** Optional call to action (a Button or Link) so an empty screen is never a dead end. */
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card/70 px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary"><InboxIcon className="size-7" aria-hidden="true" /></span>
      <div className="space-y-1">
        <p className="text-base font-medium">{title}</p>
        {description ? (
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
