"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { recordOutcome } from "@/actions/outcome";
import { RETAKE_COOLDOWN_DAYS } from "@/domain/config";

type NoShowButtonProps = { bookingId: string; studentName: string };

/** "Student didn't join" records Retake later with reason no_show (A-11). */
export function NoShowButton({ bookingId, studentName }: NoShowButtonProps) {
  const router = useRouter();
  const first = studentName.split(" ")[0];
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm">
          Student didn&apos;t join
        </Button>
      }
      title={`${first} didn't join?`}
      description={`This records Retake later with the reason "no-show". ${first} can rebook after a ${RETAKE_COOLDOWN_DAYS}-day cooldown.`}
      confirmLabel="Record no-show"
      onConfirm={async () => {
        const result = await recordOutcome({
          bookingId,
          outcome: "retake_later",
          reason: "no_show",
        });
        if (!result.ok) {
          toast.error(result.error.message);
          if (result.error.code === "INVALID_TRANSITION") {
            router.refresh(); // already updated: show the latest state
            return;
          }
          return false;
        }
        toast.success(`Recorded no-show for ${studentName}.`);
      }}
    />
  );
}
