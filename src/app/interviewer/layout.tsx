import type { ReactNode } from "react";
import { guardRole } from "@/lib/session";
import { UserRole } from "@/domain/states";

export default async function InterviewerLayout({ children }: { children: ReactNode }) {
  await guardRole(UserRole.INTERVIEWER);
  return <>{children}</>;
}
