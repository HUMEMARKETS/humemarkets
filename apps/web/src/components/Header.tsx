"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { useDismiss } from "@/hooks/useDismiss";
import { APP_GUTTER, CHIP_LABEL, LANDING_FRAME } from "@/lib/frame";
import { X_URL } from "@/lib/social";
import { chip, cn, interactive, menuItem } from "@hume/ui";
import { ArrowIcon } from "./ArrowIcon";
import { ContractAddressBadge } from "./ContractAddressBadge";
import { Logo } from "./Logo";
import { MenuIcon } from "./MenuIcon";
import { ModeMenu } from "./ModeMenu";
import { WalletButton } from "./WalletButton";
import { XIcon } from "./XIcon";

/// PROJECT_BRIEF.md Section 22, plus the strategy builder from Section 41.
const items: Array<{ label: string; href: string; wideOnly?: boolean }> = [
  { label: "Markets", href: "/markets" },
  { label: "Options", href: "/options" },
  { label: "Perpetuals", href: "/perpetuals" },
  { label: "Strategies", href: "/strategies" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Lending", href: "/lending" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Activity", href: "/activity" },
  // Ninth item: it does not fit beside the other eight and the buttons at 1280 px, so the bar shows it from
  // 2xl. Below that it is in the footer line, and in the mobile sheet.
  { label: "Features", href: "/features", wideOnly: true },
];

/// Primary nav is plain text on the header's own blur, not another row of boxes: full-brightness
/// text, an accent hairline under the current page, accent text on hover. The hairline is the only
/// thing that moves between states, so nothing shifts size or position when a page changes.
const navLink = (current: boolean) =>
  cn(
    interactive,
    "flex h-full items-center border-b-2 px-1 text-base font-medium",
    current ? "border-accent text-accent" : "border-transparent text-text hover:text-accent",
  );

const isCurrent = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/// The header keeps one accent-filled action, not two: Connect wallet is it (the actual next step
/// for a new visitor), so Trade takes the same secondary chip look as the X icon next to it, rather
/// than competing for the same colour.
const tradeLink = cn(chip, CHIP_LABEL, "h-11 shrink-0 gap-2 px-4");

export function Header() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const [open, setOpen] = useState(false);
  // On the landing page the header floats over the hero only, so the hero reads as the whole first
  // screen; on every other page — and once the landing page scrolls past its hero — it sits in the
  // normal flow above content. The nav text carries no fill of its own, so the bar needs one soft,
  // even scrim behind everything to stay readable over whatever sits under it.
  const landing = pathname === "/";
  const ref = useRef<HTMLElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  // A tap on a link changes the page; the sheet has done its job.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      ref={ref}
      className={cn(
        "z-40 shrink-0 border-b border-line bg-ground/70 backdrop-blur-md",
        landing ? "absolute inset-x-0 top-0" : "relative",
      )}
    >
      <div className={cn("flex items-center justify-between gap-3", landing ? `h-[96px] ${LANDING_FRAME}` : `h-20 ${APP_GUTTER}`)}>
        <div className="flex h-full items-center gap-6">
          <Link href="/" aria-label="Hume home" className="flex h-full shrink-0 items-center">
            <Logo />
          </Link>
          {landing ? (
            <div className="hidden h-10 items-center gap-6 border-l border-line pl-6 lg:flex">
              <ContractAddressBadge className="py-1" />
            </div>
          ) : (
            <nav aria-label="Primary" className="hidden h-full items-center gap-5 xl:flex 2xl:gap-8">
              {items.map((item) => {
                const current = isCurrent(pathname, item.href);
                return (
                  <Link key={item.href} href={item.href} aria-current={current ? "page" : undefined} className={cn(navLink(current), item.wideOnly && "max-2xl:hidden")}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-3 sm:gap-6">
          {landing ? (
            <nav aria-label="Landing" className="hidden items-center gap-6 text-sm xl:flex">
              <Link href="/features" className="text-muted transition-colors duration-150 hover:text-text">
                Features
              </Link>
              <a href="#contracts" className="text-muted transition-colors duration-150 hover:text-text">
                Contracts
              </a>
              <Link href="/markets" className="text-muted transition-colors duration-150 hover:text-text">
                Markets
              </Link>
            </nav>
          ) : null}
          <ModeMenu />
          <a
            href={X_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Hume on X"
            className={cn(chip, "size-11 shrink-0 justify-center rounded-control! max-xl:size-10")}
          >
            <XIcon />
          </a>
          {/* On a phone the wallet button lives at the bottom of the menu, which leaves the bar to the logo, X and the menu button — Trade goes with it, since "Markets"/"Perpetuals" in the sheet already cover that entry point on mobile. */}
          <div className="hidden items-center gap-3 xl:flex 2xl:gap-6">
            {landing ? null : (
              <Link href="/perpetuals" className={cn(tradeLink, "max-2xl:hidden")}>
                Terminal
                <ArrowIcon />
              </Link>
            )}
            <WalletButton variant={landing ? "secondary" : "primary"} />
          </div>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
            className={cn(chip, "relative size-10 justify-center rounded-control! xl:hidden")}
          >
            <MenuIcon open={open} />
            {/* A connected wallet is out of sight in the menu, so the button says so. */}
            {isConnected && !open ? <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-2 rounded-full bg-up" /> : null}
          </button>
        </div>
      </div>
      {open ? (
        <nav id="mobile-nav" aria-label="Primary mobile" className="absolute inset-x-0 top-full max-h-[calc(100dvh-7.125rem)] overflow-y-auto bg-ground xl:hidden">
          {items.map((item) => {
            const current = isCurrent(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex h-12 items-center px-4 text-base font-medium",
                  current ? "bg-accent text-accent-ink" : cn("bg-raised text-muted", menuItem),
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="p-4">
            <WalletButton className="h-12! rounded-control! text-[13px]! uppercase tracking-[0.04em]" block menuAbove />
          </div>
        </nav>
      ) : null}
    </header>
  );
}
