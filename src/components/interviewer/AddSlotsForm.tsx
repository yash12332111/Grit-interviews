"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addSlots } from "@/actions/availability";

type AddSlotsFormProps = {
  /** Earliest pickable date and the default value, as "YYYY-MM-DD" in IST. */
  minDate: string;
  defaultDate: string;
};

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AddSlotsForm({ minDate, defaultDate }: AddSlotsFormProps) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const input = {
      date: String(form.get("date") ?? ""),
      from: String(form.get("from") ?? ""),
      to: String(form.get("to") ?? ""),
    };
    startTransition(async () => {
      const result = await addSlots(input);
      if (!result.ok) {
        setErrors(result.error.fields ?? {});
        if (!result.error.fields) toast.error(result.error.message);
        return;
      }
      setErrors({});
      const { created, skipped } = result.data;
      toast.success(`Added ${created} slots, skipped ${skipped} already existing`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-4" noValidate>
      <div>
        <h2 className="text-base font-semibold">Add availability</h2>
        <p className="text-sm text-muted-foreground">
          Slots are 30 minutes each, on the hour and half hour (IST).
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="date" label="Date" error={errors.date}>
          <Input id="date" name="date" type="date" min={minDate} defaultValue={defaultDate} required
            aria-invalid={errors.date ? true : undefined} />
        </Field>
        <Field id="from" label="From" error={errors.from}>
          <Input id="from" name="from" type="time" step={1800} defaultValue="15:00" required
            aria-invalid={errors.from ? true : undefined} />
        </Field>
        <Field id="to" label="To" error={errors.to}>
          <Input id="to" name="to" type="time" step={1800} defaultValue="17:00" required
            aria-invalid={errors.to ? true : undefined} />
        </Field>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add slots"}
      </Button>
    </form>
  );
}
