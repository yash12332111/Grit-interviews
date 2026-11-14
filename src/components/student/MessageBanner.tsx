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
      className="relative flex items-start gap-3 overflow-hidden rounded-2xl border bg-card p-4 shadow-soft"
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-grit" />
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <BellIcon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
        {ctaLabel && ctaHref ? (
          external ? (
            <a
              href={ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ size: "sm" })}
            >
              {ctaLabel}
            </a>
          ) : (
            <Link href={ctaHref} className={buttonVariants({ size: "sm" })}>
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
