"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { bookSlot, rescheduleBooking } from "@/actions/booking";
import { cn } from "@/lib/utils";
import type { OpenTimesDay } from "@/db/queries/slots";

type SlotPickerProps = {
  attemptId: string;
  badgeLabel: string;
  days: OpenTimesDay[];
  /** Set in reschedule mode: the booking being moved and a label for its current time. */
  reschedule?: { bookingId: string; currentLabel: string };
};

export function SlotPicker({ attemptId, badgeLabel, days, reschedule }: SlotPickerProps) {
  const router = useRouter();
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [timeIso, setTimeIso] = useState<string | null>(null);

  // Fall back to the first day when nothing (or a vanished day) is selected.
  const day = days.find((d) => d.key === dayKey) ?? days[0];
  const time = day?.times.find((t) => t.iso === timeIso) ?? null;

  if (!day) {
    return (
      <EmptyState
        title="No open times right now"
        description="Interviewers haven't opened any slots in the booking window yet. Please check back soon."
        action={
          <Link href="/student" className={buttonVariants({ variant: "outline" })}>
            Back to home
          </Link>
        }
      />
    );
  }

  const confirm = async (): Promise<boolean | void> => {
    if (!time) return false;
    const result = reschedule
      ? await rescheduleBooking({ bookingId: reschedule.bookingId, startAt: time.iso })
      : await bookSlot({ attemptId, startAt: time.iso });

    if (result.ok) {
      toast.success(reschedule ? "Interview rescheduled." : "Interview booked.");
      router.push("/student");
      return;
    }

    const { code, message } = result.error;
    if (code === "SLOT_TAKEN") {
      toast.error(message);
      setTimeIso(null);
      router.refresh(); // reload the list of open times from the server
      return;
    }
    if (code === "ALREADY_BOOKED") {
      toast.error(message, {
        action: { label: "View booking", onClick: () => router.push("/student") },
      });
      return false;
    }
    toast.error(message);
    if (code === "INVALID_TRANSITION") {
      router.refresh(); // already updated: show the latest state
      return;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-sm font-medium">1. Pick a date</h2>
        <div role="tablist" aria-label="Dates" className="flex gap-2 overflow-x-auto pb-1">
          {days.map((d) => (
            <button
              key={d.key}
              type="button"
              role="tab"
              aria-selected={d.key === day.key}
              onClick={() => {
                setDayKey(d.key);
                setTimeIso(null);
              }}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-2 text-sm transition",
                d.key === day.key
                  ? "border-foreground bg-foreground text-background"
                  : "bg-card hover:border-foreground/40",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium">2. Pick a time (IST)</h2>
        <div className="flex flex-wrap gap-2">
          {day.times.map((t) => (
            <button
              key={t.iso}
              type="button"
              aria-pressed={t.iso === time?.iso}
              onClick={() => setTimeIso(t.iso)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm transition",
                t.iso === time?.iso
                  ? "border-foreground bg-foreground text-background"
                  : "bg-card hover:border-foreground/40",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <ConfirmDialog
        trigger={<Button disabled={!time}>{reschedule ? "Reschedule interview" : "Book interview"}</Button>}
        title={reschedule ? "Move your interview?" : "Confirm your interview"}
        description={
          time
            ? reschedule
              ? `Move your ${badgeLabel} interview from ${reschedule.currentLabel} to ${day.label}, ${time.label} IST?`
              : `Book your ${badgeLabel} interview for ${day.label}, ${time.label} IST?`
            : ""
        }
        confirmLabel={reschedule ? "Confirm new time" : "Confirm booking"}
        onConfirm={confirm}
      />
    </div>
  );
}
