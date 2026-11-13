import type { ReactNode } from "react";
import Link from "next/link";
import { guardRole } from "@/lib/session";
import { UserRole } from "@/domain/states";

export default async function InterviewerLayout({ children }: { children: ReactNode }) {
  await guardRole(UserRole.INTERVIEWER);
  return (
    <>
      <nav className="border-b">
        <div className="mx-auto flex max-w-6xl gap-4 px-4 py-2 text-sm font-medium">
          <Link href="/interviewer/schedule" className="hover:underline">
            Daily schedule
          </Link>
          <Link href="/interviewer/availability" className="hover:underline">
            Availability
          </Link>
        </div>
      </nav>
      {children}
    </>
  );
}
