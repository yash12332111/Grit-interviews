import type { ReactNode } from "react";
import { guardRole } from "@/lib/session";
import { UserRole } from "@/domain/states";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  await guardRole(UserRole.STUDENT);
  return <>{children}</>;
}
