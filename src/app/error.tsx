"use client";

import { ErrorState } from "@/components/shared/ErrorState";

export default function RootError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <ErrorState onRetry={retry} />
    </div>
  );
}
