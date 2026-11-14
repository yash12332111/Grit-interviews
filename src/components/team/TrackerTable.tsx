import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangleIcon } from "lucide-react";
import { StateBadge } from "@/components/shared/StateBadge";
import { formatDateTime } from "@/lib/time";
import type { TrackerRow } from "@/db/queries/team";
import { FlagDialog } from "./FlagDialog";

/** One row per (student, badge). Flag malpractice appears only on PASSED rows. */
export function TrackerTable({ rows }: { rows: TrackerRow[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Student</TableHead>
            <TableHead>Badge</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Slot (IST)</TableHead>
            <TableHead>Interviewer</TableHead>
            <TableHead className="text-right">Days since eligible</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key} className={row.outcomeOverdue ? "bg-rose-50/60" : undefined}>
              <TableCell className="font-medium">{row.studentName}</TableCell>
              <TableCell>{row.badgeLabel}</TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-1.5">
                  <StateBadge state={row.state} />
                  {row.outcomeOverdue ? (
                    <span
                      data-slot="badge"
                      className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-white"
                    >
                      <AlertTriangleIcon className="size-3.5" aria-hidden="true" />
                      Outcome overdue
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>{row.slotStart ? formatDateTime(row.slotStart) : "—"}</TableCell>
              <TableCell>{row.interviewerName ?? "—"}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{row.daysSinceEligible}</TableCell>
              <TableCell className="text-right">
                {row.badgeAwardId ? (
                  <FlagDialog
                    badgeAwardId={row.badgeAwardId}
                    studentName={row.studentName}
                    badgeLabel={row.badgeLabel}
                  />
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
