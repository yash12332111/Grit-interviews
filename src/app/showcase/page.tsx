import Link from "next/link";

export default function ShowcasePage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Showcase</h1>
      <p className="mt-2 text-sm text-muted-foreground">Coming in P7.</p>
      <Link href="/" className="mt-4 inline-block text-sm font-medium underline underline-offset-4">
        Back to personas
      </Link>
    </div>
  );
}
