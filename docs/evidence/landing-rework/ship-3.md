# Ship 3: trust strip, product previews and the /features page

Date: 2026-10-06. Plan: workstreams B and C.

## Checks

- `pnpm typecheck && pnpm lint && pnpm test`: pass (16 of 16 tasks).
- `pnpm build` in `apps/web`: pass; `/features` is a static route (8.46 kB, 285 kB first load).
- `bash scripts/check-hex.sh`: pass. `bash scripts/check-brand.sh`: pass.
- Page width: no horizontal scroll at 1440 or 375 (`documentElement.scrollWidth` equals the viewport).

## Screenshots (Playwright, software WebGL)

- `ship3-features-{1440,375}-{top,s1,s2,s3}.png`, `ship3-landing-{1440,375}-{hero,verify}.png`.
- Captured with no `NEXT_PUBLIC_RPC_URL`, so "Markets listed" reads "–" or "…" and the ticker is absent. The red banner is that missing variable.

## What was built

- `TrustStrip`: markets listed (registry), contracts listed (count of `CONTRACTS` that have an address), network (`chains[env.chainId]`), audit status linking to `/docs#limits`. Used in the landing hero (desktop), in the landing "Verify it" section (mobile), and on `/features`.
- `ProductPreviews`: `PerpPreview`, `OptionsPreview`, `VaultPreview`. Each is a `Panel` with no signing control, only a link to the real screen.
  - Perp preview reads the first listed market (mark price, maintenance margin, leverage tiers, taker fee) and drops the `SAMPLE DATA` mark when it does. With no market listed it shows the illustrative position, labelled.
  - Options preview is always the illustrative straddle, labelled, drawn by the strategy builder's own `PayoffChart` (now exported). Option quotes need the pricing service.
  - Vault preview is always an illustrative position, labelled; its limits come from `env.creditExample`, the same numbers the lending page's calculator uses (`LtvBar` now exported).
  - Illustrative figures live in `lib/previewFixture.ts`.
- `/features` (`app/features/page.tsx`, inside `AppPage`): trust strip; the three modules with their previews, reusing the landing copy from `landing/content.ts`; four steps; risk and fees from `DocsLiveParameters` (read from the chain); supported markets (`SupportedMarkets`, from the registry); every contract with its explorer link; a reserved comment where the token section goes; FAQ; closing call to action. Added to the landing header nav and the footer.
- Ticker: not rendered when no market is listed or the registry cannot be read, so the first line of a page is no longer "No perpetual markets are listed yet."

## Not verified

- The live path of `PerpPreview` (a listed market) was not exercised: this machine has no RPC. It compiles and type-checks against `usePerpMarket` and `humeRead.fees.get`, and falls back to the labelled illustration while loading or on error. Check it once a market is listed.

## Deviations from the plan

- Previews are on `/features`, not inside the landing's snap sections: the 3D scene fills the right of those sections. The landing carries the trust strip and a "All features" link instead.
- No landing footer. The landing's "Verify it" section carries the trust strip and the unaudited line; `/features` has the footer.
- The `/features` page is not yet in the header's primary app nav (it is the 9th item at `xl`); it is in the landing nav and the footer.
- The seven-state grid in `UI_CONTRACT.md` Section 6 has no `/features` row yet.
