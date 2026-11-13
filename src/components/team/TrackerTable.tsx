import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JOURNEY_STATE_LABEL } from "@/domain/states";
import { formatDateTime } from "@/lib/time";
import type { TrackerRow } from "@/db/queries/team";
import { FlagDialog } from "./FlagDialog";

/** One row per (student, badge). Flag malpractice appears only on PASSED rows. */
export function TrackerTable({ rows }: { rows: TrackerRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
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
            <TableRow key={row.key}>
              <TableCell className="font-medium">{row.studentName}</TableCell>
              <TableCell>{row.badgeLabel}</TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary">{JOURNEY_STATE_LABEL[row.state]}</Badge>
                  {row.outcomeOverdue ? <Badge variant="destructive">Outcome overdue</Badge> : null}
                </div>
              </TableCell>
              <TableCell>{row.slotStart ? formatDateTime(row.slotStart) : "—"}</TableCell>
              <TableCell>{row.interviewerName ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{row.daysSinceEligible}</TableCell>
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
