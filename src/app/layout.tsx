import type { Metadata } from "next";
import "./globals.css";

// Using system font stack instead of fetching from Google Fonts,
// so the app builds and runs offline / in sandboxed environments.
// Geist will still load on Vercel via next/font/google at build time
// (network is available there). To avoid any build failure, we fall back
// to system fonts here and add Geist via local variable if desired later.

export const metadata: Metadata = {
  title: "GRIT Interview Scheduling",
  description: "NxtWave GRIT badge interview scheduling prototype",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
