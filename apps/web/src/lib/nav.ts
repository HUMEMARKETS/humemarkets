export type NavLink = { label: string; href: string };
export type NavEntry = NavLink | { label: string; items: NavLink[] };

/// The primary navigation. A group is a disclosure menu in the header and a titled section in the mobile
/// sheet. The route paths are unchanged: only the grouping is new. Copy trading joins Social when its
/// route exists.
export const NAV: NavEntry[] = [
  { label: "Markets", href: "/markets" },
  {
    label: "Trade",
    items: [
      { label: "Perpetuals", href: "/perpetuals" },
      { label: "Options", href: "/options" },
      { label: "Strategies", href: "/strategies" },
      { label: "Pons", href: "/pons" },
    ],
  },
  { label: "Capital", items: [{ label: "Lending", href: "/lending" }] },
  { label: "Social", items: [{ label: "Leaderboard", href: "/leaderboard" }] },
  { label: "Portfolio", href: "/portfolio" },
];

/// Pages with no slot in the bar. The footer lists them, and so does the mobile sheet, because the
/// terminals have no footer.
export const MORE_LINKS: NavLink[] = [
  { label: "Activity", href: "/activity" },
  { label: "Docs", href: "/docs" },
  { label: "Features", href: "/features" },
];

export const isCurrent = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
