"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { BellIcon, XIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { dismissMessage } from "@/actions/messages";

type MessageBannerProps = {
  title: string;
  body: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  /** When set, the banner can be dismissed (marks the notification as read). */
  notificationId?: string;
};

/** The message shown at the top of the student home. */
export function MessageBanner({ title, body, ctaLabel, ctaHref, notificationId }: MessageBannerProps) {
  const [pending, startTransition] = useTransition();
  const external = ctaHref?.startsWith("http");

  const dismiss = () => {
    if (!notificationId) return;
    startTransition(async () => {
      const result = await dismissMessage({ notificationId });
      if (!result.ok) toast.error(result.error.message);
    });
  };

  return (
    <section
      aria-label="Latest message"
      className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sky-950"
    >
      <BellIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-sm">{body}</p>
        {ctaLabel && ctaHref ? (
          external ? (
            <a
              href={ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {ctaLabel}
            </a>
          ) : (
            <Link href={ctaHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
              {ctaLabel}
            </Link>
          )
        ) : null}
      </div>
      {notificationId ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={dismiss}
          disabled={pending}
          aria-label="Dismiss message"
        >
          <XIcon />
        </Button>
      ) : null}
    </section>
  );
}
