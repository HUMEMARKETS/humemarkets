# Phase 6 — Web on mainnet

Date: 2026-10-05. Chain 4663 (Robinhood Chain). Result: **amber**.

The build, the unaudited notice and the paused-market path are done and verified. The two things
that are not done both need something this phase cannot supply on its own: a Vercel deployment,
which the sandbox refused, and a funded wallet, which the operator has decided not to fund before
launch. Both are recorded in full below.

## 1. What the phase asked for, and where each item stands

| Step | Result |
| ---- | ------ |
| 1. Vercel project pointed at the mainnet API, with every `NEXT_PUBLIC_*` value | **blocked** — the Vercel CLI was refused by the sandbox (Section 6). The exact variable set is recorded in Section 5 and the build was verified locally against the live mainnet API |
| 2. Unaudited notice as a layout-level banner in `AppShell` | **pass** — Section 3 |
| 3. Browser wallet: connect, deposit USDG, open and close a perp, buy and settle an option | **not done, by decision** — the operator is not funding a wallet before launch (Section 7) |
| 4. A paused market renders as paused, with a live price and a disabled trade button | **pass** — Section 4, with a defect found and fixed |
| Repository gates | **pass** — Section 8 |

## 2. The build runs against mainnet

Built from this working tree with the mainnet public environment and served locally, so every
number on screen came from chain 4663 and from the Phase 5 API, not from a fixture:

```
NEXT_PUBLIC_CHAIN_ID=4663
NEXT_PUBLIC_RPC_URL=https://rpc.mainnet.chain.robinhood.com
NEXT_PUBLIC_RPC_PROXY_URL=https://api-mainnet-e81a.up.railway.app/v1/rpc
NEXT_PUBLIC_API_URL=https://api-mainnet-e81a.up.railway.app
NEXT_PUBLIC_EXPLORER_URL=https://robinhoodchain.blockscout.com
```

Confirmations taken at the time of the capture:

| Check | Result |
| ----- | ------ |
| `GET /v1/markets` on the Phase 5 API | HTTP 200 |
| `eth_chainId` through `/v1/rpc` | `0x1237` = 4663 |
| Explorer reachable | HTTP 200 |
| 32 mainnet markets listed in the terminal | yes — `docs/evidence/phase-6/perpetuals-1440.png` |
| `next build` | 14 routes, all prerendered, no error |

No contract address is set in the environment. `packages/config`'s recorded deployment for chain
4663 supplies all of them, which is why the `NEXT_PUBLIC_*` address variables are absent from the
list above rather than left blank.

Every price reads `–` in the captures. That is Phase 5's recorded state, not a fault here: the
equity session is shut until **2026-10-05 13:30 UTC** and the oracle reverts `MarketSessionClosed`
for all 32 markets. The screenshots were taken before that bell.

## 3. The unaudited notice

`apps/web/src/components/UnauditedNotice.tsx`, mounted at the top of `AppShell`, so it is on every
route rather than only the ones with a trade button. It is not dismissable. The chain name is read
from `packages/config` through `@/lib/wagmi`, so it is not a hardcoded string:

```
UNAUDITED CONTRACTS ON ROBINHOOD CHAIN. TRADE ONLY WHAT YOU CAN LOSE.   (>= 640 px)
UNAUDITED CONTRACTS. TRADE AT YOUR OWN RISK.                            (< 640 px)
```

Served HTML at the time of the check:

```
Unaudited contracts on <!-- -->Robinhood Chain<!-- -->. Trade only what you can lose.
```

The wording shortens below `sm` so the line never wraps and the banner keeps a fixed `h-7`. That
matters beyond looks: `TradeSheet` positions the phone trade sheet against the height of the chrome
above it, and a banner that grew a second line would push the sheet off its anchor. The offset moved
from `top-[7.75rem]` to `top-[9.5rem]` to account for the banner.

No new colour, radius or font: the banner uses the existing `down`, `down-soft` and `down-line`
tokens. `scripts/check-hex.sh` passes.

## 4. The paused-market path, and the defect it uncovered

Phase 6 asks to *confirm* this path. It did not work, so the confirmation turned into a fix.

**What was wrong.** Three separate things.

1. `perps.list()` filtered paused markets out, so a paused market disappeared from the terminal
   instead of rendering. That contradicts CLAUDE.md: *a paused market is a shipped market.*
2. The paused flag was read from `perps.get()`, which also reads the oracle. While the equity
   session is shut that call reverts, so the market config and the price failed together — the
   paused badge would vanish at exactly the hours a visitor most needs to know why nothing is
   priced. This is not hypothetical: it is the live state of chain 4663 outside session hours, and
   it is why the first attempt at this capture showed no badge at all.
3. The phone trade bar (`PerpTradeBar`) was not gated, so on a phone a paused market still offered
   a live Long and Short button opening a ticket that could not be submitted.

**What changed.**

- `packages/sdk/src/perps.ts` — `list()` takes `{ includePaused }`. The default is unchanged, so
  keepers and quoters still see only the tradeable set; the terminal opts in.
- `apps/web/src/hooks/queries.ts` — the terminal's market list passes `includePaused: true`, and a
  new `usePerpMarketConfig(symbol)` reads one market's config out of that list. It depends on the
  registry only, never the oracle.
- `apps/web/src/lib/market.ts` — `tradeBlocker(active)` holds the decision and the sentence shown.
- `MarketHeader`, `MarketList`, `OrderPanel` and `PerpTradeBar` read that one helper.

**What it renders.** With a market forced paused in a local build (chain 4663 has 32 markets and
**zero** paused, so there is nothing on mainnet to point at):

| Surface | Behaviour |
| ------- | --------- |
| Market list row | `Paused` chip beside the symbol |
| Market header | `Paused` chip beside `NVDA-PERP`; index price, funding and countdown keep polling |
| Order ticket | `This market is paused. Prices keep updating; new positions are refused.` and a disabled **Market paused** button, shown before a wallet is connected rather than after a signature fails |
| Phone trade bar | a single disabled **Market paused** button in place of Long/Short |

Screenshots: `docs/evidence/phase-6/paused-market-1440.png`, `docs/evidence/phase-6/paused-market-375.png`.

**How the forcing was done, and that it is not in the tree.** One line in `perpMarketsQuery`
marked the first market `active: false` for the duration of the capture. It was reverted before the
gates in Section 8 were run; `git status` shows `apps/web/src/hooks/queries.ts` carrying only the
`includePaused` and `usePerpMarketConfig` changes. The decision itself is covered by a unit test
that does run in CI — `tradeBlocker refuses a paused market and nothing else`, in
`apps/web/src/lib/market.test.ts` — alongside a new SDK test for `includePaused`.

A paused market on real chain state is still unverified and should be checked during the Phase 15
testnet walkthrough, where pausing one costs testnet gas rather than mainnet gas.

## 5. Variables the Vercel project needs

To be set on the project when it exists. No secret appears here, and none is needed: every value
below is public by construction, because `NEXT_PUBLIC_*` is compiled into client JavaScript.

| Variable | Value |
| -------- | ----- |
| `NEXT_PUBLIC_CHAIN_ID` | `4663` |
| `NEXT_PUBLIC_RPC_URL` | `https://rpc.mainnet.chain.robinhood.com` |
| `NEXT_PUBLIC_RPC_PROXY_URL` | `https://api-mainnet-e81a.up.railway.app/v1/rpc` |
| `NEXT_PUBLIC_API_URL` | `https://api-mainnet-e81a.up.railway.app` |
| `NEXT_PUBLIC_EXPLORER_URL` | `https://robinhoodchain.blockscout.com` |
| `NEXT_PUBLIC_SITE_URL` | the deployment's own origin |

Project settings: root directory `apps/web`, framework Next.js, pnpm workspace at the repository
root. `apps/web/vercel.json` already declares the framework.

**One thing will break on the first deploy if it is missed.** The API's `CORS_ORIGINS` is currently
`http://localhost:3000` and nothing else — measured, not assumed:

```
Origin: http://localhost:3000  ->  access-control-allow-origin: http://localhost:3000
Origin: http://localhost:3100  ->  (no access-control-allow-origin header)
```

Until the deployment's origin is added to `CORS_ORIGINS` on the Railway `api` service in the
`mainnet` environment, the browser will block every read through the RPC proxy and the terminal will
show *Could not read markets from the chain*. That was reproduced locally on port 3100 and is in
`docs/evidence/phase-6/` by implication — the first 1440 px capture, taken from a disallowed origin,
rendered exactly that message.

## 6. Why there is no deployment

`vercel link --yes --project hume-mainnet` was refused by the sandbox with *Permission for this
action was denied ... Reason: [Production Deploy]*. The Vercel CLI is installed and authenticated
(`vercel whoami` answers), and the account has eight existing projects, none of them `hume-mainnet`.
Nothing was created and nothing was deployed. The operator runs the deployment.

`hume.tech` does not resolve. The phase's own note allows launching on a `*.vercel.app` URL with the
domain attached later, and that is the assumption this phase was run under, since registering a
domain is a purchase and the operator has said nothing is to be funded before launch.

## 7. Why there is no real round trip

The acceptance asks for one real perp round trip and one real option round trip from a browser
wallet. The operator has decided not to fund anything until launch, so there is no USDG margin to
open a position with. This is the phase's own documented degradation path (Section 0.3): do steps 1,
2 and 4, verify the trade path in sample mode and on testnet, and mark gate 6 amber.

Sample mode does not exist yet — it is Phase 7 — so the sample-mode half of that degradation cannot
be done here either. The testnet half belongs to Phase 15, which is the hard gate before the open.

## 8. Repository gates

```
pnpm typecheck     16 tasks, 16 successful
pnpm lint          12 tasks, 12 successful
pnpm test          16 tasks, 16 successful
                   @hume/web  55 tests, 55 pass  (includes the two new tradeBlocker cases)
                   @hume/sdk 159 tests, 159 pass (includes the new includePaused case)
scripts/check-hex.sh     passed
scripts/check-brand.sh   passed
next build               14 routes, all prerendered
```

## 9. Screenshots

| File | What it shows |
| ---- | ------------- |
| `phase-6/perpetuals-1440.png` | the mainnet build at 1440 px: banner, 32 markets, no paused badge (correct — none are paused), prices `–` because the session is shut |
| `phase-6/perpetuals-375.png` | the same at 375 px, caught mid-load. The local capture loop exhausted the read proxy; the populated phone view is in `paused-market-375.png` |
| `phase-6/paused-market-1440.png` | a forced-paused market at 1440 px: chips, refusal sentence, disabled button |
| `phase-6/paused-market-375.png` | the same at 375 px, with the phone trade bar refusing |
| `phase-6/markets-1440.png` | the markets page on mainnet |

## 10. Acceptance

**Phase 6 is amber and is not ticked.** The web build is correct, points at mainnet, carries the
unaudited notice and now handles a paused market properly — including a real defect that would have
hidden the paused state outside trading hours. It is not green because nothing is deployed and no
round trip was signed, and neither of those is a code problem:

1. **Deployment** needs the operator to run the Vercel CLI; the sandbox refuses it.
2. **The round trips** need a funded wallet, which the operator has chosen to defer to launch.

## 11. Paths changed

```
apps/web/src/components/AppShell.tsx
apps/web/src/components/MarketHeader.tsx
apps/web/src/components/MarketList.tsx
apps/web/src/components/OrderPanel.tsx
apps/web/src/components/PerpTradeBar.tsx
apps/web/src/components/TradeSheet.tsx
apps/web/src/components/UnauditedNotice.tsx      (new)
apps/web/src/hooks/queries.ts
apps/web/src/lib/market.ts
apps/web/src/lib/market.test.ts                  (new)
packages/sdk/src/perps.ts
packages/sdk/src/perps.test.ts
docs/evidence/phase-6.md                         (new)
docs/evidence/phase-6/*.png                      (new)
CLAUDE.md                                        (stale line count and sed example)
docs/LANES.md                                    (stale phase line anchors)
```

`CLAUDE.md` and `docs/LANES.md` were out of date in a way that would have misled the next lane: the
anchor table pointed at line ranges that had drifted by about 75 lines from Phase 6 onward, so
`sed -n '787,853p'` returned Phase 5's text under the heading "Phase 6". Every anchor was regenerated
from `grep -n '^#### Phase'` and checked line by line; the file is 2198 lines, not the 2119 recorded.
