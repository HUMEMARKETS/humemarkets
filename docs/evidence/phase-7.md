# Phase 7 — Sample mode: the product without a wallet

Date: 2026-10-05. Chain 4663 (reads), no wallet. Result: **pass** on the acceptance walk; two scope
gaps are recorded in Section 9 and neither blocks the acceptance sentence.

Acceptance: *in a clean browser profile with NO wallet extension installed, a visitor can land on the
site, read prices, place a sample perp, see the liquidation price, close it, read the PNL and view the
leaderboard, and every sample surface is marked.* Walked in Section 1, in a Chromium context with no
`window.ethereum`, against the mainnet price API and RPC proxy.

## 1. The acceptance walk

| Step | What happened | Screenshot (1440 / 375) |
| ---- | ------------- | ----------------------- |
| Land on the site | The app opens in Sample. No connect wall, no wallet prompt. Title reads `Sample · Hume`; header chip `SAMPLE DATA` | `00-landing-*` |
| Read prices | Terminal, markets list, ticker all price from the real API. The equity session is shut until 13:30 UTC, so the screen says `Closed · last close` and fills at the last daily close (Section 4) | `01-terminal-rest-*`, `09-markets-*` |
| Place a sample perp | NVDA long, $1,000 margin, 5x, `Open long`. Toast: `Open long confirmed`, `SAMPLE DATA`, `Simulated. Nothing was sent to a wallet or a chain.` | `03-position-opened-1440`, `04-refused-insufficient-375` |
| See the liquidation price | Ticket shows it before the click (`204.71` on a 233.95 entry, 12.5% below) and the position row shows it after | `02-ticket-preview-1440`, `05-portfolio-open-*` |
| Close it | `Close` on the position: `Close position confirmed`. Realized PnL `−$20.00` is the two taker fees at the real fee rate, price unchanged | `19-closed-pnl-history-*` |
| Read the PNL | Portfolio value, realized PnL and the history row are marked `SAMPLE`; the PNL card has its own page (`/pnl/sample/1`) | `19-*`, `docs/evidence/phase-10/card-sample-*` |
| View the leaderboard | 12 simulated traders plus `You`, ranked by the API's own rule; every row and the panel marked | `07-leaderboard-*` |
| Reset | `Reset sample account` (header menu, order panel, two-step confirm) returns to $10,000.00 | `10-mode-menu-*` |

No horizontal page scroll at 375 px on any of the 11 routes (measured: `scrollWidth - innerWidth` and the
`#main` scroller, both 0 on `/`, `/markets`, `/perpetuals`, `/options`, `/strategies`, `/portfolio`,
`/activity`, `/leaderboard`, `/lending`, `/docs`, `/pnl/sample/1`).

## 2. How it is built: a data-source swap, one component tree

| Piece | Where | What it does |
| ----- | ----- | ------------ |
| `useAccountMode()` | `hooks/useAccountMode.ts` | `sample`, `connected` or `disconnected`. Default `sample`; a stored choice applies after hydration |
| `sampleAccount` store | `stores/sample.ts` | Balance, positions, orders, fills, `reset`. Persisted per chain on this device (`hume-sample-account-v1-<chainId>`), bigint-safe |
| Mode store | `stores/mode.ts` | Sample or live preference, and whether the connect explainer was read |
| Pure engine | `lib/sampleEngine.ts` | Open, close, reduce, increase, limit order, liquidation, tick. No wallet, chain or network. 17 unit tests |
| Sample client | `lib/sampleClient.ts` | Same methods, status events and typed refusals as the SDK client. `useWalletHume()` returns it in sample mode, so `OrderPanel`, `PositionsTable`, `OrdersTable`, `AdjustPosition` and `VaultControls` call `wallet.perps.openPosition(...)` unchanged |
| Query seam | `hooks/queries.ts` | Every account-bound hook (`useVaultBalances`, `usePositions`, `usePortfolioSummary`, `useOrders`, `useHistory`, `useFunding`, `useTriggerSupport`, ...) reads the sample through the same `useQuery` shape |
| Runtime | `components/SampleRuntime.tsx` | Rehydrates the stores, opens the account, watches the real price against positions and limit orders every 8 s, keeps `Sample ·` at the front of the title |

What is **real**: the index price a fill uses, the taker fee, the maintenance-margin rate, the leverage
tiers, the registry's `active` flag (a paused market refuses a sample order exactly as a real one). What
is **simulated**: the vault, the fills, the positions. **Not simulated**, and said on screen: funding is
shown but not charged; there is no slippage; stop-loss and take-profit; cross margin; option purchases.

Sample limits are the sample's own (`NEXT_PUBLIC_SAMPLE_START_USD` 10,000, `..._MAX_POSITION_USD`
50,000, `..._TOP_UP_USD` 10,000), not the chain's. The launch caps on chain are 0.008 USDG per wallet
(Phase 4), which would refuse every sample order. The connect explainer prints the real caps.

## 3. Marking: `SAMPLE DATA` is on every surface and cannot be dismissed

`SampleBadge` and `Panel`'s `sample` prop live in `packages/ui`.

| Surface | Mark |
| ------- | ---- |
| Header, every page | The chip itself, `SAMPLE DATA`, doubles as the environment menu |
| Page title | `Sample · Hume`, re-applied on every route change (a real wallet's PNL card keeps its own title) |
| Order panel, option order panel | Panel header badge, above the balance |
| Positions, option positions, portfolio, activity, leaderboard panels | Panel header badge |
| Portfolio value card, page titles (`PageHeader`), docs title | Inline badge |
| Transaction toast, liquidation alert, history rows | Badge plus `Simulated. Nothing was sent to a wallet or a chain.` A sample row shows `SAMPLE` where a transaction hash would be, and never an explorer link |
| PNL card | `SAMPLE DATA` on the card and `Simulated. Not a real position.` in its footer |

## 4. A shut session does not blank the sample

The oracle reverts (`MarketSessionClosed`) outside the equity session, and every price on the terminal
reads `–` (Phase 6 recorded this). A sample that cannot trade on a weekend recreates the wall it exists
to remove. So in sample mode only, `perps.get` and the price overview fall back to the API's last daily
close (`lib/samplePrices.ts`), the header says `Closed · last close`, the ticket says `The market is
closed, so a sample order fills at the last close, $233.95. A real order would be refused until the
session opens.` The connected path is unchanged: the chain refuses a trade on a shut market.

New SDK read, with a test: `prices.state(symbol)` over `GET /v1/prices/:symbol`, which answers a shut
session as `{ state: "closed" }` rather than a revert.

## 5. The unhappy paths

| Path | How a visitor meets it | Plain sentence |
| ---- | ---------------------- | -------------- |
| Insufficient margin | 9,995 at 1x: ticket button disabled | `Not enough sample USDG for this size. Add more from the Sample menu, or lower the size.` (`04-refused-insufficient-*`) |
| Rejected order | 30,000 at 5x, over the sample position limit | `This size is above the position limit for the market.` (`04b-refused-limit-*`) |
| Paused market | Registry `active = false`: disabled `Market paused` button, shown before any amount is typed | `This market is paused. Prices keep updating; new positions are refused.` (Phase 6's `tradeBlocker`, shared by both modes) |
| Liquidation | A real move triggers it from the watcher. Because a real one needs a ~20% move a visitor will never see, each position also has `Test liquidation`, which replays the real rule at the position's liquidation price | Alert: `Position liquidated`, `-$1,000.00`, `Replay: you asked to see this, so the price was set to this position's liquidation price. The real price had not moved that far.` (`06-liquidation-*`) |
| No price at all | No oracle price and no close | `There is no price for this market yet, so a sample order cannot fill.` |
| Anything not simulated | Calls on the sample client that have no implementation answer with a typed refusal, never `undefined is not a function` | `Sample mode does not simulate that.` |

Every refusal is a typed SDK error, so the same `errorMessage` that explains a chain revert explains a
sample one. No raw revert string reaches the screen.

## 6. The connect explainer

`components/ConnectExplainer.tsx`, opened by any `Connect wallet` button the first time, and by the
environment menu. One screen, four items: what a wallet does here, that sample balances do not carry over,
the caps (read from the chain: position limit `$0.008` and open-interest cap `$0.032` on NVDA-PERP, up to
5x), and that the contracts are unaudited. `Stay in sample` is as easy as `Continue to wallet`. On a
browser with no wallet, `Continue` answers `No browser wallet found. Install MetaMask or another EVM
wallet, then reload this page. You can keep using the sample account meanwhile.` (`12-connect-no-wallet-*`).

The operator removed the layout-level `UnauditedNotice` banner in commit `44dc7ce`. It is not restored;
the explainer carries the notice, as the phase asks.

## 7. Seven states, per screen touched

`n/a` marks a state the screen cannot be in, with the reason. Everything else was rendered and
screenshotted.

| Screen | loading | empty | populated | error | offline | unauthorized / not-connected | paused | sample |
| ------ | ------- | ----- | --------- | ----- | ------- | ---------------------------- | ------ | ------ |
| `/perpetuals` ticket, positions | skeleton figures | `No open positions.` | `03-*`, `05-*` | `Could not price this order. The price service did not answer.` | n/a (shared reads) | `22-disconnected-terminal-*` | `Market paused` button | chip, panel badge, title |
| `/portfolio` | skeleton figures | `17-portfolio-empty-*` | `05-*` | `Could not read your portfolio` | n/a (shared reads) | `21-disconnected-portfolio-*` | row uses the shared `Paused` chip | `SAMPLE DATA` everywhere |
| `/activity` | `Loading history…` | `16-activity-empty-*` | `08-activity-*` | `The transaction history is not available right now.` | n/a (shared reads) | `Connect a wallet to see its transactions` | n/a: history has no paused state | panel badge, `SAMPLE` in place of a hash |
| `/leaderboard` | `23-*` | `25-*` | `07-*` | `24-*` | `26-*` | n/a: public page | n/a: ranks traders, not markets | all rows and panel marked |
| `/markets`, `/options`, `/strategies`, `/docs`, `/` | existing | existing | `09`, `13`, `14`, `15`, `00` | existing | n/a | n/a: reads are public | existing `Paused` chip on markets | chip and title; options order panel and positions panel badged |
| Connect explainer | caps skeleton | n/a | `11-*` | `12-*` | n/a | n/a | n/a | `Stay in sample` |

`/options` has real prices and a badged panel, but a sample purchase is refused with a sentence
(Section 9).

## 8. Repository gates

```
pnpm typecheck     16 tasks, 16 successful
pnpm lint          12 tasks, 12 successful   (apps/web and packages/ui lint are the scaffold no-op)
pnpm test          16 tasks, 16 successful
                   @hume/web  85 tests, 85 pass   (17 sampleEngine, 4 leaderboard, 4 pnlCard, 5 lending, 55 earlier)
                   @hume/sdk 156 tests, 156 pass  (new: prices.state, leaderboard, credit)
scripts/check-hex.sh     passed
scripts/check-brand.sh   passed
next build               17 routes, no error
```

No new colour, radius or font. Where a new token mirror was needed for the edge-rendered share image
(`THEME_DOWN_PRESS`, `THEME_CARD_MUTED` in `lib/theme-colors.ts`), it is the existing derived token and
the one place `check-hex.sh` allows a literal.

## 9. Gaps, stated plainly

1. **The environment menu offers Sample and this deployment's network, not Mainnet, Testnet and Sample.**
   Mainnet and testnet are separate deployments of this app (separate Vercel projects, separate
   databases), each with its own `NEXT_PUBLIC_CHAIN_ID`, and the sample account is stored per chain id, so
   balances are isolated as asked. A single in-app switch between the two networks would need both
   deployments' origins in config; that is a lead decision.
2. **Option purchases are not simulated.** A sample option needs a signed quote tied to a chain position and
   a close path that quotes against an on-chain position id. The options screen prices and charts for real,
   is badged, and its `Buy` button reads `Options are not in sample mode` with an explanatory sentence. The
   acceptance sentence names a perp, and Phase 8 gates the option review flow.
3. **Stop-loss, take-profit and cross margin are hidden in sample mode** rather than half-simulated.
4. The wallet-connected path was not exercised against a funded wallet. That is Phase 6's recorded gap and
   Phase 15's gate; this phase changed only how the connected path is selected (`useAccountMode`) and left
   its submit flow untouched, so Phase 8's review step is still the thing in front of a signature.

## 10. Paths changed

```
apps/web/src/hooks/useAccountMode.ts, useWalletConnect.ts, useOnline.ts, queries.ts, useHume.ts, useTriggerFills.ts
apps/web/src/stores/sample.ts, mode.ts, connectDialog.ts, tx.ts
apps/web/src/lib/sampleEngine.ts (+test), sampleClient.ts, sampleMarket.ts, samplePrices.ts, sampleViews.ts, env.ts, fills.ts
apps/web/src/components/SampleRuntime.tsx, SampleMark.tsx, ModeMenu.tsx, ConnectExplainer.tsx, ConnectButton.tsx, WalletButton.tsx,
  Header.tsx, AppShell.tsx, PageHeader.tsx, OrderPanel.tsx, VaultControls.tsx, PositionsTable.tsx, PortfolioView.tsx, ActivityView.tsx,
  ActivityTables.tsx, MarketAnalytics.tsx, MarketHeader.tsx, OptionTicket.tsx, OptionPositions.tsx, TxToasts.tsx, TriggerAlerts.tsx
apps/web/src/app/docs/page.tsx
packages/ui/src/SampleBadge.tsx, Panel.tsx, index.ts
packages/sdk/src/oracle.ts, index.ts, stats.test.ts      (prices.state)
docs/evidence/phase-7.md, docs/evidence/phase-7/*.png
```

The leaderboard page, the PNL card and the lending page are this wave's Phase 10 and Phase 9 slices and
are recorded in `docs/evidence/phase-10-frontend.md` and `docs/evidence/phase-9-frontend.md`.
