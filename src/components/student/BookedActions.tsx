"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { cancelBooking } from "@/actions/booking";

type BookedActionsProps = {
  attemptId: string;
  bookingId: string;
  whenLabel: string;
  badgeLabel: string;
  canReschedule: boolean;
  canCancel: boolean;
};

/** Reschedule and Cancel for a booked interview. Disabled once the change cutoff passes. */
export function BookedActions({
  attemptId,
  bookingId,
  whenLabel,
  badgeLabel,
  canReschedule,
  canCancel,
}: BookedActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {canReschedule ? (
        <Link
          href={`/student/book/${attemptId}?mode=reschedule&bookingId=${bookingId}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Reschedule
        </Link>
      ) : (
        <Button variant="outline" disabled>
          Reschedule
        </Button>
      )}

      {canCancel ? (
        <ConfirmDialog
          trigger={<Button variant="outline">Cancel booking</Button>}
          title="Cancel this interview?"
          description={`Your ${badgeLabel} interview on ${whenLabel} will be cancelled and the slot released. You can book a new time whenever you're ready.`}
          confirmLabel="Cancel interview"
          cancelLabel="Keep booking"
          destructive
          onConfirm={async () => {
            const result = await cancelBooking({ bookingId });
            if (!result.ok) {
              toast.error(result.error.message);
              return false;
            }
            toast.success("Interview cancelled.");
          }}
        />
      ) : (
        <Button variant="outline" disabled>
          Cancel booking
        </Button>
      )}
    </div>
  );
}
