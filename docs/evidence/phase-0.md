# Phase 0 — Freeze and inventory

**Result: pass.** Every address in `packages/contracts/deployments/robinhood_mainnet.json` has bytecode
on mainnet, all twenty protocol proxies answer to the Section 0.2 owner address, both balances were
re-read at a recorded block, and `check-admin-roles.sh` passes. The USDG blocker of Section 0.3 is
unchanged and still gates Phase 4.

- Date: 2026-10-04
- Chain: Robinhood Chain mainnet, `eth_chainId` = **4663**
- RPC: `https://rpc.mainnet.chain.robinhood.com`
- **All chain reads below are at block `79379560`**
- Owner address under test: `0xd09D9c87ECfe008B4D6D3cEbeAd25103c16d9a7C`

## 1. Secrets check, run before anything else

```
$ git check-ignore -v .env
.gitignore:45:.env*	.env

$ git check-ignore -v .env.local packages/contracts/.env
.gitignore:45:.env*	.env.local
packages/contracts/.gitignore:6:.env	packages/contracts/.env
```

`.env*` is ignored at the repository root, and `packages/contracts/.env` is ignored by the package's own
`.gitignore`. A `find` for `.env` outside `node_modules` returns nothing: no `.env` exists on this
machine yet, which is the Section 0.1 operator item that blocks Phases 4, 9, 11 and 16.

`pnpm install` reports "Lockfile is up to date" and "Already up to date".

## 2. Deviation from the Phase 0 plan: the rebrand is already committed

The phase expected the 253-file alphamarkets-to-hume rebrand to sit uncommitted in the working tree, for
the operator to commit on `phase-00-freeze` through this phase's Ship block. That work was instead
committed and pushed before the phase ran:

- The repository was re-created as a single orphan initial commit, `fc76118` "feat: initial Hume commit",
  which contains the finished rebrand (496 tracked files).
- A git remote now exists — `origin https://github.com/HUMEMARKETS/humemarkets.git` — which closes the
  unresolved prerequisite in Section 0.7. `main` and `origin/main` are both at `fc76118`.
- The pre-rebrand history (206 commits) stays reachable locally through the branch `docs/mainnet-live`
  at `05f78ae`. It was not pushed.

The working tree is therefore clean, not dirty, and the first `git add -A` commit in the Ship block below
is dropped as already done. Nothing else in the phase changes: no contract or chain state depends on how
the rebrand was committed.

## 3. Address inventory: code and admin

`eth_getCode` for every address, plus the ERC-1967 implementation slot
(`0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc`) and
`hasRole(DEFAULT_ADMIN_ROLE, owner)`.

Every protocol contract extends `UpgradeableBase`, which is `AccessControlUpgradeable` plus UUPS — so
there is no `owner()` function, and the owner of a proxy is the holder of `DEFAULT_ADMIN_ROLE`. That role
is also the only role that may authorise an upgrade (`UpgradeableBase._authorizeUpgrade`). `owner() = n/a`
below means the function does not exist, not that the contract is unowned.

| Contract                | Address                                      | code | proxy bytes | implementation                               | `owner()`                                    | `DEFAULT_ADMIN_ROLE` = owner address |
| ----------------------- | -------------------------------------------- | ---- | ----------- | -------------------------------------------- | -------------------------------------------- | ------------------------------------ |
| `buybackModule`         | `0xEE8AE4155C653B664727CA5EF0757914aA4769CE` | yes  | 163         | `0x9f6207312aa6d431f51235dfff3884eaaa14218d` | n/a                                          | **true**                             |
| `collateralManager`     | `0x5Dd7bf74253D392C6D071D00e873F6660edb6D78` | yes  | 163         | `0x498249bc18986216fec0becd2f6130d162c970ed` | n/a                                          | **true**                             |
| `crossMargin`           | `0xea3Ce04FA538FE6C0AEd377Cd0Cc86FE4CD0A28F` | yes  | 163         | `0x113b7e4e7b70797f25b8a95627c0a3439089e565` | n/a                                          | **true**                             |
| `feeManager`            | `0xa8D4641d988411fa4F312ac942da1e063C19cB47` | yes  | 163         | `0x4398d1d38613d2010ecac29600ed70366a62a873` | n/a                                          | **true**                             |
| `fundingManager`        | `0xe9DFC7B3e2179A826095b87E24e657d6e6e45bB0` | yes  | 163         | `0x5cbca4ed07d5597208539ff53e76f75a1c2c61cb` | n/a                                          | **true**                             |
| `insuranceFund`         | `0xE10833Aa9C438e84626e1D73B4ec5319B5ebc263` | yes  | 163         | `0xba5256ca177a797600bae6fe666b2171c6c776e4` | n/a                                          | **true**                             |
| `liquidationEngine`     | `0x0979B96607C44435BC5462A738a7F10D55a4142C` | yes  | 163         | `0x44d68f1ed1bb5a352062f451cf6689fe6bcc9587` | n/a                                          | **true**                             |
| `marketRegistry`        | `0x71Bb058106b1a226a6f66e2152719a6B827c783a` | yes  | 163         | `0x9a2c84c0aef8e4fc2a88cc65aaf9ef8e600179a1` | n/a                                          | **true**                             |
| `optionMarket`          | `0x71C64D56ae35a85E18E24A53264E73f4d058338C` | yes  | 163         | `0x73261b27afca7110cb3b591ca3b3376223678425` | n/a                                          | **true**                             |
| `optionPositionManager` | `0xdfE7AaDBA3574760Be45d0B3D3Ce09507361fa78` | yes  | 163         | `0x90622fcb4861036a5a4b47a6d26aba28fa3ea134` | n/a                                          | **true**                             |
| `optionsEngine`         | `0xFa58B6B1D9B9de3A841B463ed1e945f8422932aD` | yes  | 163         | `0x0a1f47a4ef84acb7c85cf54fbe15c912fcb70bee` | n/a                                          | **true**                             |
| `oracleRouter`          | `0x831255818E492f31a5515b0b62a1406F00c7BA7c` | yes  | 163         | `0xd656db63141b7df88699964ac0b22ed0865dbd3f` | n/a                                          | **true**                             |
| `perpOrderManager`      | `0x170ed757E332547d27b7ca0644Fee22259A25279` | yes  | 163         | `0xcd077cb2cad5f4c7b9b06fb9958db36535a0aed2` | n/a                                          | **true**                             |
| `perpPositionManager`   | `0x3eA78624f5F9a514FA69427a691c62418f4C9493` | yes  | 163         | `0x3e46dbca6916b13512b705eb58fff2994b4a3857` | n/a                                          | **true**                             |
| `perpsEngine`           | `0xf7Ce817965156A308b0Cdf1FED554e35055f3190` | yes  | 163         | `0x1f9903f49b80e58fdcc7bfc90f8a9c1373c5ead2` | n/a                                          | **true**                             |
| `priceValidator`        | `0x8eBEB401A0a4f676B63dcC687Cf300B81f239ba6` | yes  | 163         | `0x44e086815e2e84287df285bc03eab864a9f10fb3` | n/a                                          | **true**                             |
| `rfqManager`            | `0xE4B6aA5FdC12491e89D999FDe17e69340e19344C` | yes  | 163         | `0xcc321f37ff752b03d04c3df9bc93c3da96c256d2` | n/a                                          | **true**                             |
| `riskManager`           | `0xCe8d2D037f32B61E4a3023bAB62Fb125A9b97f07` | yes  | 163         | `0x16239dc67101fe6a20e27ffc7222aed48a37571f` | n/a                                          | **true**                             |
| `settlementToken`       | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` | yes  | 170         | `0x68184c449e1a8f34fa18d289737129fd27b66f8f` | `0xcFA0388f5ddf905FdC08c45c716C15Dc10A14C6F` | false — correct, see below           |
| `subaccountFactory`     | `0x7bd8f7D7E615A692821d6A31275dB38BC6836980` | yes  | 163         | `0xc3ef7f7901b8ea4bd4ecc8cd8e795f4bf51b8a9f` | n/a                                          | **true**                             |
| `vault`                 | `0x9aC6782D82D980f2623bBE78C8882832baC94903` | yes  | 163         | `0xfe97357eba1ded613a3e7a560c35cf2db360e939` | n/a                                          | **true**                             |

**21 of 21 addresses have bytecode.** The deployment file can be trusted.

**20 of 21 are ours and all 20 answer to the owner address.** The exception is `settlementToken`, which is
USDG itself — a third-party token this protocol only reads. It is `Ownable` and its owner is the issuer,
`0xcFA0388f5ddf905FdC08c45c716C15Dc10A14C6F`. The owner wallet holding no role on it is the expected and
correct state; `symbol()` returns `USDG` and `decimals()` returns `6`, confirming Section 0.2.

### The two the phase names explicitly

- `marketRegistry` `0x71Bb058106b1a226a6f66e2152719a6B827c783a` — `DEFAULT_ADMIN_ROLE` held by
  `0xd09D9c87ECfe008B4D6D3cEbeAd25103c16d9a7C`. Matches Section 0.2.
- `vault` `0x9aC6782D82D980f2623bBE78C8882832baC94903` — `DEFAULT_ADMIN_ROLE` held by
  `0xd09D9c87ECfe008B4D6D3cEbeAd25103c16d9a7C`. Matches Section 0.2.

## 4. Owner wallet balances

Read at block `79379560`:

| Field         | Value                       | Raw               | Against Section 0.2 (block 79,173,830) |
| ------------- | --------------------------- | ----------------- | -------------------------------------- |
| Gas balance   | `0.000374962177736677` ETH  | `374962177736677` | unchanged                              |
| USDG balance  | `0.295277` USDG             | `295277` (6 dp)   | unchanged                              |

**The USDG blocker of Section 0.3 is still open.** 0.295277 USDG is 29.5 cents. Nothing has been funded
since 2026-10-03, so Phase 4 must either wait for the $4–5 conversion or take the documented degradation
path. Gas remains sufficient — about 37M gas at the chain's ~0.01 gwei, against 10–12M estimated for
everything this plan deploys.

## 5. Admin roles

```
$ bash packages/contracts/script/check-admin-roles.sh
admin roles: all 9 are covered by the handover script
exit=0
```

The script compares every `*_ADMIN_ROLE` declared in `src/` with the roles
`script/HandOverAdmin.s.sol` moves, so a role added later cannot be left behind at handover time. All
nine are covered.

### Which roles sit on the one key, read from chain

The script above proves the handover script is complete. It does not say who holds the roles today. These
reads do, all for `0xd09D9c87ECfe008B4D6D3cEbeAd25103c16d9a7C` at block `79379560`:

| Contract            | Role                | Held by the owner key |
| ------------------- | ------------------- | --------------------- |
| `marketRegistry`    | `MARKET_ADMIN_ROLE` | yes                   |
| `marketRegistry`    | `PAUSER_ROLE`       | yes                   |
| `oracleRouter`      | `ORACLE_ADMIN_ROLE` | yes                   |
| `oracleRouter`      | `PAUSER_ROLE`       | yes                   |
| `vault`             | `VAULT_ADMIN_ROLE`  | yes                   |
| `riskManager`       | `RISK_ADMIN_ROLE`   | yes                   |
| `optionsEngine`     | `QUOTER_ROLE`       | yes                   |
| `rfqManager`        | `MAKER_ROLE`        | yes                   |
| `liquidationEngine` | `LIQUIDATOR_ROLE`   | no                    |

**One key holds everything except liquidation.** `DEFAULT_ADMIN_ROLE` on all twenty proxies, every admin
role, both pauser roles, the quoter role that prices options, and the maker role that prices RFQ trades
all sit on the deployer. This is exactly the concentration Phase 16 exists to break up: quoter, keeper,
liquidator and pauser move to four generated keys, and Phase 18 keeps the multisig for
`DEFAULT_ADMIN_ROLE` on the deferred list. Recorded here as the Phase 0 baseline, not as a new finding.

`LIQUIDATOR_ROLE` is not held by the owner key and is not held by anything else yet, so no address can
liquidate on mainnet today. Phase 16 grants it to the generated liquidator key.

## 6. Carried into later phases

| Item                                                  | Blocks                | State                                         |
| ----------------------------------------------------- | --------------------- | --------------------------------------------- |
| USDG funding, $4–5                                    | Phase 4, 6, 9, 17     | **open** — 0.295277 USDG at block 79379560    |
| `.env` and `packages/contracts/.env`                  | Phase 4, 9, 11, 16    | **open** — neither file exists                |
| `hume.tech` DNS, and a Vercel project                 | Phase 6               | **open** — unverified this phase, reads only  |
| Supabase projects `hume-mainnet`, `hume-testnet`      | Phase 5               | **open** — unverified this phase, reads only  |
| Git remote                                            | every Ship block      | **closed** — `origin` set, `main` pushed      |
| Four generated keys and the role split                | Phase 16              | open by design                                |

**Cost of this phase: $0. Reads only; no transaction was sent.**
