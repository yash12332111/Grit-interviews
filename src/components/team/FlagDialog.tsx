"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { flagMalpractice } from "@/actions/team";

type FlagDialogProps = {
  badgeAwardId: string;
  studentName: string;
  badgeLabel: string;
};

const REASON_MAX = 500;

/** Row action on PASSED rows: nullify the badge, with a mandatory reason. */
export function FlagDialog({ badgeAwardId, studentName, badgeLabel }: FlagDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive" size="xs">
          Flag malpractice
        </Button>
      }
      title="Flag malpractice?"
      description={`${studentName}'s ${badgeLabel} badge will be nullified, any higher badge in this track will be locked again, and ${studentName.split(" ")[0]} will be notified.`}
      confirmLabel="Nullify badge"
      destructive
      confirmDisabled={reason.trim().length === 0}
      onConfirm={async () => {
        setError(null);
        const result = await flagMalpractice({ badgeAwardId, reason });
        if (!result.ok) {
          if (result.error.fields?.reason) setError(result.error.fields.reason);
          else toast.error(result.error.message);
          return false;
        }
        toast.success(`${badgeLabel} badge nullified for ${studentName}.`);
        setReason("");
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor={`flag-reason-${badgeAwardId}`} className="text-sm font-medium">
          Reason (required)
        </label>
        <Textarea
          id={`flag-reason-${badgeAwardId}`}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError(null);
          }}
          maxLength={REASON_MAX}
          placeholder="What was found, and where was it reported?"
          aria-invalid={error ? true : undefined}
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </ConfirmDialog>
  );
}
