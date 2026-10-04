# Phase 4 — Feed reality and launch caps

**Result: pass.** Every number in this file is measured, the session-aware staleness rule is
implemented and tested, the caps are sized against the real USDG balance, and all of it is applied on
chain: 132 transactions, every one status `0x1`, and `check-launch-limits.sh` exits 0 against all 32
active markets. Section 5 holds the hashes, Section 6 holds the gate invocation and reads its one
misleading output line.

Earlier in this phase there was no signer in this workspace, so the four on-chain steps were written out
rather than run. They were run on 2026-10-04 and this file now records the result instead of the plan.

The USDG balance itself is **not** a guess: it was read from the token on chain during this phase.

- Date: 2026-10-04, 10:30 UTC (block 79,865,943 on chain 4663)
- RPC: `https://rpc.mainnet.chain.robinhood.com` (from `REFERENCE.md` Section 3; chain id reads
  `0x1237` = 4663)
- Owner / deployer: `0xd09D9c87ECfe008B4D6D3cEbeAd25103c16d9a7C`

## 1. The money this phase is sized against

| Thing                       | Measured value              | Read from                                                     |
| --------------------------- | --------------------------- | -------------------------------------------------------------- |
| Owner USDG                  | **0.295277 USDG** (295,277 base units, 6 decimals) | `balanceOf` on `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` |
| Owner gas (ETH)             | 0.000374 ETH                | `eth_getBalance`                                             |
| Vault pool, USDG            | **0**                       | `HumeVault.poolBalance(USDG)`                                |
| `maxNetOpenInterest`, all 32 | **0** (unset, so the check fails) | `RiskManager.maxNetOpenInterest`                        |
| On-chain `maxPriceAge`, all 32 | 90,000 s (25 h, flat)     | `PriceValidator.maxPriceAge`                                 |

So the USDG conversion in `DEVELOPMENT_PHASES.md` Section 0.3 **has not happened**: the treasury is 29.5
cents, unchanged from the figure recorded on 2026-10-03. This phase therefore runs Section 0.3's
degradation path, item 1: the caps are the smallest values that are still coherent, not the intended ones.

## 2. Feed reality — all 32 feeds, read live

`latestRoundData()` on each market's Chainlink feed, plus 180 rounds of history per feed walked back
through `getRoundData` to measure what the feed does **during** a session.

- **Age** is at the read above: 2026-10-04 10:30 UTC, a **Sunday**.
- **Sessions** is how many US equity sessions the 180 rounds cover (up to 102 days for SPY).
- **Median** and **worst** are the longest silence inside one session, in minutes, against a 420-minute
  window (13:30-20:30 UTC).

| Market | Feed | Price (USD) | Answer stamped (UTC) | Age (h) | Sess | Med | Worst |
| ------ | ---- | ----------- | -------------------- | ------- | ---- | --- | ----- |
| NVDA  | `0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15` |    235.00 | 2026-10-02 17:07 | 41.38 |  21 |  228 |  420 |
| AAPL  | `0x6B22A786bAa607d76728168703a39Ea9C99f2cD0` |    333.82 | 2026-10-02 16:39 | 41.85 |  25 |  220 |  420 |
| TSLA  | `0x4A1166a659A55625345e9515b32adECea5547C38` |    370.45 | 2026-10-02 19:55 | 38.58 |  11 |  158 |  200 |
| MSFT  | `0x45C3C877C15E6BA2EBB19eA114Ea508d14C1Af2E` |    517.51 | 2026-10-02 19:57 | 38.55 |  25 |  278 |  420 |
| GOOGL | `0xF6f373a037c30F0e5010d854385cA89185AE638b` |    343.66 | 2026-10-02 16:06 | 42.39 |  16 |  198 |  387 |
| AMZN  | `0xD5a1508ceD74c084eBf3cBe853e2C968fB2a651C` |    251.65 | 2026-10-02 19:51 | 38.65 |  24 |  241 |  420 |
| META  | `0x7C38C00C30BEe9378381E7B6135d7283356D71b1` |    730.13 | 2026-10-02 15:24 | 43.09 |   9 |  111 |  309 |
| COIN  | `0xA3a468A452940B7D6b69991207B508c609a98Ef2` |    182.63 | 2026-10-02 19:35 | 38.91 |   5 |   95 |  157 |
| MSTR  | `0x396118bdFB181e6240E74D243F266B061c0edc3D` |    160.66 | 2026-10-02 20:07 | 38.39 |   4 |   79 |  166 |
| SPY   | `0x319724394D3A0e3669269846abE664Cd621f9f6A` |    770.71 | 2026-10-02 12:30 | 46.00 |  74 |  358 |  420 |
| QQQ   | `0x80901d846d5D7B030F26B480776EE3b29374C2ae` |    752.00 | 2026-10-02 12:57 | 45.56 |  46 |  348 |  420 |
| AMD   | `0x943A29E7ae51A4798823ca9eEd2ed533B2A22C72` |    632.83 | 2026-10-02 18:51 | 39.65 |   8 |  162 |  267 |
| ASML  | `0xB4106147E8cce40b7d46124090d373A71b70f87D` |  1,866.59 | 2026-10-02 19:25 | 39.08 |  11 |  171 |  295 |
| BABA  | `0x62Cc8F9b5f56a33c9C8A60c8B92779f523c4E984` |    106.07 | 2026-10-02 19:53 | 38.62 |  12 |  235 |  351 |
| CLSK  | `0x810c12D3a554Bc47fd39597Fe3b3AAC4941F50eF` |     12.73 | 2026-10-02 19:59 | 38.52 |   4 |   65 |   90 |
| CRCL  | `0x6652eDf64bA3731C4F2D3ce821A0Fb1f1f6b482a` |     81.68 | 2026-10-02 20:17 | 38.21 |   5 |   77 |   90 |
| CRWV  | `0xe1b3aABCAFAd1c94708dc1367dcfF8Aa4407487C` |     89.24 | 2026-10-02 20:16 | 38.24 |   5 |   78 |   97 |
| EWY   | `0xEFdf54610B62A7753Ec30bDc380847c12D32e1D1` |    190.94 | 2026-10-02 22:47 | 35.72 |  12 |  171 |  246 |
| GME   | `0x27C71df6A64fB476468EdF256CF72c038baB5B67` |     25.19 | 2026-10-02 21:55 | 36.59 |   8 |   75 |  108 |
| INTC  | `0x3f390C5C24628Ac7C489515402235FeAD71D1913` |    119.30 | 2026-10-02 19:55 | 38.58 |   5 |   96 |  151 |
| IONQ  | `0x22EfeC4919baf55F360E0EDee4AbEB26DE4971eb` |     43.85 | 2026-10-02 20:04 | 38.44 |   5 |   50 |   94 |
| MU    | `0x425EEFdCf05ed6526C3cE61Af99429A228a6d596` |  1,071.83 | 2026-10-02 21:10 | 37.33 |   6 |  208 |  270 |
| NBIS  | `0xE1D87B116Ba0fe898998f1D140339D1fA1E09705` |    242.59 | 2026-10-02 19:48 | 38.70 |   4 |  120 |  154 |
| ORCL  | `0x0e6a64a2B58A6693a531E6c555f3A5d042eEA844` |    142.65 | 2026-10-02 19:18 | 39.21 |   7 |  124 |  226 |
| PLTR  | `0x820ABedFF239034956B7A9d2F0a331f9F075eB4c` |    188.55 | 2026-10-02 19:50 | 38.66 |  10 |  156 |  191 |
| RGTI  | `0x2A045cF1C49c61c166C036d2f06FA2D2d984f765` |     15.36 | 2026-10-02 20:05 | 38.42 |   5 |   65 |   89 |
| RKLB  | `0x045477BF65Aef6f4F2386ad0164579e48381CC74` |     74.02 | 2026-10-02 19:49 | 38.68 |   4 |   81 |   84 |
| SLV   | `0x209b73908e92Ae021826eD79609845451Ecba2ce` |     54.67 | 2026-10-02 19:14 | 39.26 |  12 |  162 |  353 |
| SNDK  | `0xfb133Fa4B7b385802B693a293606682Df47109A3` |  1,718.20 | 2026-10-02 16:51 | 41.65 |   5 |  108 |  244 |
| SPCX  | `0xB265810950ba6c5C0Ff821c9963014a56fD8Bffb` |    158.72 | 2026-10-02 20:11 | 38.32 |  10 |  109 |  163 |
| TSM   | `0x874cF94aa8eC88Fd9560094dD065f2fB3E41Fc2F` |    473.92 | 2026-10-02 19:26 | 39.07 |  19 |  226 |  331 |
| USO   | `0x75a9c76Ef439e2C7c2E5a34Ab105EcFe3766431c` |    146.83 | 2026-10-02 18:28 | 40.04 |   6 |  119 |  152 |

**Every one of the 32 is stale right now, 35.72 h to 46.00 h.** That is worse than the 16-27 h
`REFERENCE.md` Section 2 Finding 4 measured, and for a plain reason: Finding 4 was measured on a
Saturday and this was measured on a Sunday, so the whole weekend sits inside the age. The feeds behave
exactly as Finding 4 said — 0.5% deviation or a 24-hour heartbeat, and no update while the underlying is
shut. The flat 25-hour limit currently on chain already fails all 32 today.

**The finding that decides the rule:** 9 of the 32 feeds (NVDA, AAPL, MSFT, AMZN, SPY, QQQ and three
more at 387-420 min) have printed **nothing at all during a whole 420-minute session**. SPY's median
in-session silence is 358 minutes. So no age limit short enough to catch a dead feed can run during a
session without halting a quiet market, and no age limit long enough to survive a quiet session can keep
out the previous session's close — the price across which the underlying gaps.

## 3. The rule that was implemented

`PriceValidator` (`packages/contracts/src/oracle/PriceValidator.sol`) now has three states instead of
two, and a market carries its underlying's hours:

| State    | When                                                                         | What callers get                             |
| -------- | ---------------------------------------------------------------------------- | -------------------------------------------- |
| `Fresh`  | in session, newer than `maxPriceAge`, **and** at or after this session's floor | settles normally                             |
| `Stale`  | in session, but too old or carried over from an earlier session               | `StaleOraclePrice` — the feed is broken      |
| `Closed` | outside the session, by window, weekday mask or holiday                      | `MarketSessionClosed` — a normal state       |

- **The session floor does the work.** A price must be stamped at or after today's open minus
  `preOpenGrace`. Yesterday's close can never settle, whatever the age limit says. The grace is 90
  minutes: measured, the first in-session print landed up to 39 minutes after the open, and SPY's last
  pre-open print an hour before it.
- **The age limit is a backstop, and it was not widened to make anything pass.** Inside the window a
  price sitting at the floor reaches 510 minutes of age, so the floor binds before any 9-hour limit does.
- **Outside the session the market reads closed, not halted.** `priceState` and `isSessionOpen` are
  views, so the frontend renders the last price, its timestamp and a disabled ticket without catching a
  revert — the Finding 4 requirement, and what an equity venue shows.
- **One wrinkle for the UI phases.** `OracleRouter._tryRead` catches any validator revert, so a market
  that has a *fallback* source configured would surface `NoPriceSource` outside its session rather than
  `MarketSessionClosed`. No mainnet market has a fallback today (`MarketLister` sets only the primary),
  and the fix is the same thing the frontend should do anyway: read `priceState` instead of inferring
  state from a revert.
- **Holidays.** `setSessionHoliday(marketId, day, true)` shuts one weekday. Without it, a US market
  holiday would read halted rather than closed.
- **A market with no session is always in session**, which keeps today's behaviour for the crypto, FX and
  stablecoin feeds Phase 11 adds; those take the full 24 hours through `maxPriceAge` alone.
- **DST is an operational task, not a guess.** The window is UTC; the US session moves on 2026-11-01 to
  14:30-21:30 UTC. Re-run `SetLaunchCaps.s.sol` with `openSecond` 52200 and `closeSecond` 77400 that
  morning. Forgetting it is conservative: the market reverts instead of pricing off a stale feed.

Tests: `test/oracle/OracleSafeguards.t.sol` gained 7 cases — the in-session tight limit, the measured
weekend case reading closed, inclusive window bounds, the holiday, the no-session default, the floor
rejecting an earlier session's price, and the quiet-session case where one pre-open print carries the
whole session. **390 of 390 contract tests pass** (`forge test`, fork tests excluded), and
`check-storage-layout.py` confirms the two new mappings only append.

## 4. The numbers, and why these ones

All amounts are **USDG base units** (6 decimals). They live in
`packages/contracts/deployments/robinhood_mainnet.limits.json`, not in a script, so raising them later is
a data change. `script/SetLaunchCaps.s.sol` applies the whole file.

| Limit                              | Chosen            | In USDG   | Why this number                                                                         |
| ---------------------------------- | ----------------- | --------- | --------------------------------------------------------------------------------------- |
| Per-market net open interest       | **8,000**         | 0.008     | 32 markets x 8,000 x a 50% one-sided move = 128,000, which the pool below covers         |
| Per-wallet position notional       | **8,000**         | 0.008     | Equal to the net cap, so a first trader can open one full position                       |
| Per-market open interest cap       | **32,000**        | 0.032     | 4x the net cap, so matched two-sided flow has room                                       |
| Vault pool reserve                 | **150,000**       | 0.15      | The largest reserve the real balance allows while leaving collateral to trade with       |
| In-session staleness, all 32       | **32,400 s (9 h)** | —        | Backstop only; the session floor binds first (Section 3)                                 |
| Session window                     | 13:30-20:30 UTC, Mon-Fri | — | 30 minutes past the 20:00 cash close so a 20:00 option expiry can still record settlement |
| Pre-open grace                     | 5,400 s (90 min)  | —         | Measured first-print lag after the open, and SPY's last pre-open print                   |

Left unchanged: leverage and maintenance margin per market (10x SPY and QQQ, 3x the most volatile names,
5x the rest), as listed.

**What is left in the wallet:** 145,277 base units (0.145277 USDG), deliberately not in the pool, because
a pool that holds the whole treasury leaves nothing to open a position with in Phase 6.

**These are not the intended caps.** At 0.008 USDG of notional per market the venue is a demonstration,
not a market. They are the smallest coherent set that keeps `check-launch-limits.sh`'s pool arithmetic
true against a 0.295277 USDG treasury. Fund the wallet and raise all four in the one file.

## 5. What is on chain now

**Applied 2026-10-04. Phase 4 is `pass`.** Every transaction below returned status `0x1`.

### The upgrade

| Step | Hash |
| ---- | ---- |
| `PriceValidator` implementation deployed | `0xc0342f5a4318a8ff1403b63399c47662479fcb8c882bdd6e41ca6dc0f5f301fe` |
| `upgradeToAndCall` on the existing proxy  | `0x3402b7f7e1e9b4f383e32d393512ba16a783b47636e4fc414fd149792843d6c9` |

`setTradingSession` later succeeded on all 32 markets, which is the proof the upgrade landed before the
caps run. Against the old implementation every one of those calls would have reverted.

### The caps

`SetLaunchCaps.s.sol` batches 8 markets per run, so it ran four times for 32 markets. Each run sent 32
transactions — `setMaxPriceAge`, `setTradingSession`, `setRiskConfig` and `setMaxNetOpenInterest` per
market — for **128 transactions, all status `0x1`**.

| Run | Markets | First hash | Last hash |
| --- | ------- | ---------- | --------- |
| 1 | AAPL, AMZN, COIN, GOOGL, META, MSFT, NVDA, TSLA | `0xe90b054e79122c2fde28b5fe02aa68ffe787075bb30a6e4f06cdf2f9ec381db5` | `0x4e58d29b75a62014ad9708688242ecc8ef8125937cfc653b0b145bcceef5c5f4` |
| 2 | AMD, ASML, BABA, CLSK, CRCL, MSTR, QQQ, SPY   | `0x2e8b65ea320692311f158ba78920c977a4de217cdf54f5265a7c16417b920529` | `0x70b107f63c763040c83019175d450d57e2c40ab6c636cefe67b51b9ae2d5740d` |
| 3 | CRWV, EWY, GME, INTC, IONQ, MU, NBIS, ORCL    | `0x0f54412b77195924947b7b62a94f6698202f6f38cf600e7457afd5096f41086f` | `0xc0ebece16fa1692093394ee6ceb4e64d660a327be1323af880cba70a6c78d07b` |
| 4 | PLTR, RGTI, RKLB, SLV, SNDK, SPCX, TSM, USO   | `0xd734be88138552132f6a36fdaee5e6c4932203d95f46b1c07cd1fed65b093729` | `0x07eca731333514c7d16a5496c5b20853c1d6aeb6921d24b778360a47056a7f9e` |

The four runs cover **32 distinct market ids with no gaps and no duplicates**, verified against the
broadcast artifacts rather than assumed from the run count.

### The pool

| Step | Hash |
| ---- | ---- |
| `approve`  | `0x2081617671948bfeee627da491b15431d40beff6de0403d0c090e732bf3b47ed` |
| `fundPool` | `0x5b3d1b1ab24334f504e6568c840187735a4f2d922160a7709de586406c2c918e` |

Read back from the vault `0x9aC6782D82D980f2623bBE78C8882832baC94903`:

```
poolBalance(0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168) = 150000      # 0.15 USDG
maxNetOpenInterest(NVDA)                                = 8000        # 0.008 USDG
```

## 6. The gate check

`check-launch-limits.sh` **exits 0**. All 32 active markets pass, against leverage <= 10x, position <= 1
and open interest <= 1 whole USDG.

```
RPC_URL=https://rpc.mainnet.chain.robinhood.com \
MAX_POSITION=1 MAX_OPEN_INTEREST=1 MAX_NET_OPEN_INTEREST=1 MAX_LEVERAGE=10 MAX_MOVE_BPS=5000 \
  bash script/check-launch-limits.sh robinhood_mainnet
```

This is the exact invocation Phase 17's gate row 4 should run.

### One line in its output is misleading, and is not a failure

```
ok   pool 0 covers 0 (net limits x 5000 bps)
```

Both numbers read 0 because line 71 of the script prints `pool // unit` with `unit` at 1e6, and the real
values are two orders of magnitude below one whole USDG. **The comparison on line 70 uses raw base
units**, so the check itself is sound:

| Quantity | Base units |
| -------- | ---------- |
| Sum of the 32 net open-interest limits | 256000 |
| Required pool at 5000 bps              | 128000 |
| Pool balance                           | 150000 |

Covered, with 22000 base units of headroom.

Section 5 of the earlier draft warned this line could read `ok` vacuously while the net limits were all
0. That is no longer the case, and the script guards it: line 58 requires `0 < net` per market, so a
market with an unset limit prints `FAIL`. All 32 printed `ok`.

### Still to watch

`robinhood_mainnet.limits.json` holds the session window in **UTC**, and US DST moves it. Re-run
`SetLaunchCaps.s.sol` on **2026-11-01**, when the session becomes 14:30–21:30 UTC — `openSecond` 52200,
`closeSecond` 77400. Until then the window set here is correct.

## 7. Files changed

| Path                                                             | What                                                            |
| ---------------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/contracts/src/oracle/PriceValidator.sol`               | Trading sessions, holidays, the session floor, `priceState`     |
| `packages/contracts/test/oracle/OracleSafeguards.t.sol`          | 7 new cases for the rule above                                  |
| `packages/contracts/deployments/robinhood_mainnet.limits.json`   | **New.** Every number in Section 4                              |
| `packages/contracts/script/SetLaunchCaps.s.sol`                  | **New.** Applies that file to all 32 markets                    |
| `packages/contracts/script/UpgradePriceValidator.s.sol`          | **New.** Ships the one changed implementation to its proxy      |
| `packages/contracts/script/FundPool.s.sol`                       | `AMOUNT_RAW` for a reserve below one whole token               |
| `packages/contracts/script/SetNetOpenInterest.s.sol`             | `VALUE_RAW`, same reason                                       |
| `packages/contracts/storage-layouts/PriceValidator.json`         | Regenerated for the two appended mappings                       |
| `packages/contracts/CHANGELOG.md`                                | The session-aware staleness entry                               |
| `docs/evidence/phase-4.md`                                       | This file                                                       |
