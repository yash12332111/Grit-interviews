"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { resetDemoData } from "@/actions/demo";

export function ResetDemoButton() {
  const router = useRouter();

  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm">
          <RotateCcwIcon data-icon="inline-start" />
          Reset demo data
        </Button>
      }
      title="Reset the demo data?"
      description="This puts every student, slot and booking back to the starting scenario. Your selected persona stays the same."
      confirmLabel="Reset demo data"
      onConfirm={async () => {
        const result = await resetDemoData();
        if (!result.ok) {
          toast.error(result.error.message);
          return false;
        }
        toast.success("Demo data reset to the starting scenario.");
        router.refresh();
      }}
    />
  );
}
