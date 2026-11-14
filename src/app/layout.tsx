import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { FreshDemoGate } from "@/components/shared/FreshDemoGate";
import { DemoBanner } from "@/components/shared/DemoBanner";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";

// System font stack (see globals.css) so the app builds and runs offline.

export const metadata: Metadata = {
  title: "GRIT Interview Scheduling",
  description: "NxtWave GRIT badge interview scheduling prototype",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-background bg-grit-soft text-foreground">
        {/* Everything below reads the DB or cookies, so it is rendered per
            request (Cache Components: dynamic work lives inside <Suspense>). */}
        <Suspense fallback={<LoadingSkeleton />}>
          <FreshDemoGate>
            <Suspense fallback={<div className="h-[60px] bg-grit" />}>
              <DemoBanner />
            </Suspense>
            <main className="flex flex-1 flex-col">{children}</main>
          </FreshDemoGate>
        </Suspense>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
