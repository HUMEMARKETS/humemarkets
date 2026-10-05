# Follow-ups after Ship 4

Date: 2026-10-06.

- `/docs` right rail: from 1280 px a sticky "Check it yourself" column (the trust strip stacked, plus links to `/features` and the contracts drawer) fills the space beside the prose. Screenshot: `followup-docs-1600.png`.
- `/features` in the main nav: added as the ninth item, shown from 2xl. At 1280 px it did not fit beside the other eight items and the buttons (it clipped and wrapped the mode menu), so below 2xl it is in the footer and the mobile sheet. Screenshots: `followup-nav-1280.png`, `followup-nav-1440.png`.
- Perp preview: the liquidation estimate moved to `lib/preview.ts` with three unit tests (`lib/preview.test.ts`). The live path (a listed market) is still not exercised, because there is no RPC on this machine; check it once a market is listed.
- Landing at 375 px with the green scenes: sections 01 to 03 checked, `followup-landing-375-0{1,2,3}.png`; the scene sits in the top third and the text on solid ground.
- Noticed, not changed: `/docs` prints "Live on {chain name} mainnet", so on a testnet build it reads "Robinhood Chain Testnet mainnet".
