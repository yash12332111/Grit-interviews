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
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
      <InboxIcon className="size-8 text-muted-foreground" aria-hidden="true" />
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
