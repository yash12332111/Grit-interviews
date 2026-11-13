"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { withdrawSlot } from "@/actions/availability";

type WithdrawSlotButtonProps = {
  slotId: string;
  /** Time label shown in the dialog, e.g. "Sat, 14 Nov, 3:00 pm IST". */
  whenLabel: string;
  /** Set when a student has this slot booked; a reason is then required. */
  studentName: string | null;
};

export function WithdrawSlotButton({ slotId, whenLabel, studentName }: WithdrawSlotButtonProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const booked = studentName !== null;

  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="xs" aria-label={`Withdraw slot ${whenLabel}`}>
          Withdraw
        </Button>
      }
      title="Withdraw this slot?"
      description={
        booked
          ? `${studentName} has booked ${whenLabel}. Withdrawing cancels their interview and asks them to pick a new time.`
          : `${whenLabel} will no longer be offered to students.`
      }
      confirmLabel="Withdraw slot"
      destructive
      confirmDisabled={booked && reason.trim().length === 0}
      onConfirm={async () => {
        setReasonError(null);
        const result = await withdrawSlot({ slotId, reason: booked ? reason : undefined });
        if (!result.ok) {
          if (result.error.fields?.reason) setReasonError(result.error.fields.reason);
          else toast.error(result.error.message);
          if (result.error.code === "INVALID_TRANSITION") {
            router.refresh(); // already updated: show the latest state
            return;
          }
          return false;
        }
        toast.success(
          result.data.hadBooking
            ? `Slot withdrawn. ${result.data.studentName ?? "The student"} has been asked to rebook.`
            : "Slot withdrawn.",
        );
      }}
    >
      {booked ? (
        <div className="space-y-1.5">
          <label htmlFor={`reason-${slotId}`} className="text-sm font-medium">
            Reason for the student (required)
          </label>
          <Textarea
            id={`reason-${slotId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="e.g. A conflict came up and I can't take this interview."
            aria-invalid={reasonError ? true : undefined}
          />
          {reasonError ? <p className="text-xs text-destructive">{reasonError}</p> : null}
        </div>
      ) : null}
    </ConfirmDialog>
  );
}
