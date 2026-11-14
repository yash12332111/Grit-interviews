import { getActor } from "@/lib/session";
import { getWeekSlots } from "@/db/queries/interviewer";
import { UserRole } from "@/domain/states";
import { addIstDays, istDayKey } from "@/lib/time";
import { AddSlotsForm } from "@/components/interviewer/AddSlotsForm";
import { WeekGrid } from "@/components/interviewer/WeekGrid";
import { CalendarRangeIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

export default async function AvailabilityPage() {
  // The layout redirects other roles; this just narrows the type.
  const actor = await getActor();
  if (!actor || actor.role !== UserRole.INTERVIEWER) return null;

  const { from, slots } = await getWeekSlots(actor.id);
  const now = new Date();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <PageHeader
        icon={CalendarRangeIcon}
        title="Availability"
        description="Add the times you can interview. Students pick from the pooled open times, and a booked slot can still be withdrawn with a reason."
      />
      <AddSlotsForm minDate={istDayKey(now)} defaultDate={istDayKey(addIstDays(now, 1))} />
      <WeekGrid from={from} slots={slots} now={now} />
    </div>
  );
}
