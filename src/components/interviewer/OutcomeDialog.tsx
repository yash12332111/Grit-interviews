"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { recordOutcome } from "@/actions/outcome";
import { RETAKE_COOLDOWN_DAYS } from "@/domain/config";
import { cn } from "@/lib/utils";

type OutcomeValue = "pass" | "fail" | "retake_later";

type OutcomeDialogProps = {
  bookingId: string;
  studentName: string;
  badgeLabel: string;
  bonusMiles: number;
};

const NOTES_MAX = 1000;

const OPTIONS: { value: OutcomeValue; label: string; hint: string }[] = [
  { value: "pass", label: "Pass", hint: "Cleared the badge" },
  { value: "retake_later", label: "Retake later", hint: "Close, but not yet" },
  { value: "fail", label: "Fail", hint: "Not ready for this badge" },
];

const OUTCOME_LABEL: Record<OutcomeValue, string> = {
  pass: "Pass",
  fail: "Fail",
  retake_later: "Retake later",
};

/** Two steps: choose the outcome (with optional notes), then confirm a one-line consequence. */
export function OutcomeDialog({ bookingId, studentName, badgeLabel, bonusMiles }: OutcomeDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"choose" | "confirm">("choose");
  const [outcome, setOutcome] = useState<OutcomeValue | null>(null);
  const [notes, setNotes] = useState("");
  const [notesError, setNotesError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const first = studentName.split(" ")[0];
  const consequence: Record<OutcomeValue, string> = {
    pass: `${first} will earn the ${badgeLabel} badge and +${bonusMiles} bonus miles, and this can't be changed afterwards.`,
    fail: `${first}'s eligibility for the ${badgeLabel} badge will be revoked, and they will need to re-qualify through skill contests.`,
    retake_later: `${first} can rebook the ${badgeLabel} interview after a ${RETAKE_COOLDOWN_DAYS}-day cooldown, without re-clearing skills.`,
  };

  const reset = () => {
    setStep("choose");
    setOutcome(null);
    setNotes("");
    setNotesError(null);
  };

  const submit = () => {
    if (!outcome) return;
    startTransition(async () => {
      const result = await recordOutcome({ bookingId, outcome, notes: notes.trim() || undefined });
      if (result.ok) {
        toast.success(`Recorded ${OUTCOME_LABEL[outcome]} for ${studentName}.`);
        setOpen(false);
        reset();
        return;
      }
      if (result.error.fields?.notes) {
        setNotesError(result.error.fields.notes);
        setStep("choose");
        return;
      }
      toast.error(result.error.message);
      // Already updated (e.g. a second tab) → nothing left to do here.
      if (result.error.code === "INVALID_TRANSITION") {
        setOpen(false);
        reset();
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm">Record outcome</Button>} />
      <DialogContent>
        {step === "choose" ? (
          <>
            <DialogHeader>
              <DialogTitle>Record outcome</DialogTitle>
              <DialogDescription>
                {studentName} · {badgeLabel} interview
              </DialogDescription>
            </DialogHeader>

            <div role="radiogroup" aria-label="Outcome" className="grid gap-2">
              {OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={outcome === o.value}
                  onClick={() => setOutcome(o.value)}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition",
                    outcome === o.value
                      ? "border-foreground bg-foreground/5"
                      : "hover:border-foreground/40",
                  )}
                >
                  <span className="font-medium">{o.label}</span>
                  <span className="text-xs text-muted-foreground">{o.hint}</span>
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <label htmlFor={`notes-${bookingId}`} className="text-sm font-medium">
                Notes for the student (optional)
              </label>
              <Textarea
                id={`notes-${bookingId}`}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setNotesError(null);
                }}
                maxLength={NOTES_MAX}
                placeholder="Share what went well and what to revise."
                aria-invalid={notesError ? true : undefined}
              />
              <p className="text-xs text-muted-foreground">
                {notes.length}/{NOTES_MAX}
              </p>
              {notesError ? <p className="text-xs text-destructive">{notesError}</p> : null}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={!outcome} onClick={() => setStep("confirm")}>
                Continue
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Confirm: {outcome ? OUTCOME_LABEL[outcome] : ""}</DialogTitle>
              <DialogDescription>{outcome ? consequence[outcome] : ""}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" disabled={pending} onClick={() => setStep("choose")}>
                Back
              </Button>
              <Button disabled={pending} onClick={submit}>
                {pending ? "Saving…" : "Confirm outcome"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
