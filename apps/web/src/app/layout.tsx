import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Playfair_Display } from "next/font/google";
import { preconnect } from "react-dom";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { env } from "@/lib/env";
import { X_HANDLE } from "@/lib/social";
import { THEME_SCRIPT } from "@/lib/theme-script";
import { THEME_GROUND } from "@/lib/theme-colors";
import { Providers } from "../providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// The display face for headings and big figures: an editorial serif set at 600 to 700 for short phrases
// (see the --font-display comment in globals.css).
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-playfair", display: "swap" });
// Verifiable data only (contract addresses, chain name, tech-stack tags) — Geist's own mono companion,
// so it pairs with the sans instead of reading as a bolted-on font.
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "HUME — Markets are beliefs in motion",
  description: "Global markets, onchain.",
  openGraph: {
    title: "HUME — Markets are beliefs in motion",
    description: "Global markets, onchain.",
    siteName: "HUME",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: X_HANDLE,
    creator: X_HANDLE,
    title: "HUME — Markets are beliefs in motion",
    description: "Global markets, onchain.",
  },
};

export const viewport: Viewport = { themeColor: THEME_GROUND };

/// Open the connections to the chain RPC and the API while the page is still loading, so the first
/// read does not also pay for DNS and TLS (about two seconds cold, against about 0.3 s warm).
const origin = (url: string | undefined) => {
  try {
    return url ? new URL(url).origin : undefined;
  } catch {
    return undefined;
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  for (const target of new Set([origin(env.readRpcUrl), origin(env.apiUrl)])) {
    if (target) preconnect(target, { crossOrigin: "anonymous" });
  }
  return (
    // The theme script sets data-theme before hydration, so React must not flag the attribute as a mismatch.
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${playfair.variable} ${geistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
