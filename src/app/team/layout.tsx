import type { ReactNode } from "react";
import { guardRole } from "@/lib/session";
import { UserRole } from "@/domain/states";

export default async function TeamLayout({ children }: { children: ReactNode }) {
  await guardRole(UserRole.TEAM_ADMIN);
  return <>{children}</>;
}
