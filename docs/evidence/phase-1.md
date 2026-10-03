# Phase 1 — Brand audit

**Result: pass.** `scripts/check-brand.sh` exits 0, a repository-wide grep for the old name outside
`node_modules`, `.git` and `docs` returns nothing, and `pnpm turbo run lint typecheck` reports 28 of 28
tasks successful. The script now also fails on an untracked file and on a filename, so a legacy name
cannot come back through a new file.

- Date: 2026-10-04
- Scope: no retired brand string in shipped code, metadata, UI copy, an asset filename or the SDK
  package name.

## 1. What the first run reported

```
$ bash scripts/check-brand.sh
Retired brand name found (Citadelle / CTDL / Orionis / AlphaMarkets / Levier):
docs/DEVELOPMENT_PHASES.md:98 ... (29 hits)
docs/LAUNCH_MODEL.md:38 ...
docs/REFERENCE.md:49 ...
docs/evidence/phase-0.md:33 ...
exit=1
```

**All 29 hits were in `docs/`, and none were in shipped code.** The cause was not a missed rename: the
script excluded `docs/PROJECT_BRIEF.md` and `docs/DEVELOPMENT_STEPS.md` by name, and those two files no
longer exist. The four planning files that replaced them — `DEVELOPMENT_PHASES.md`, `LAUNCH_MODEL.md`,
`REFERENCE.md`, `UI_CONTRACT.md` — were never excluded, and they must name the old brands to record what
was renamed, what was ported from Levier, and what the launch gate in Phase 17 checks.

So CI on `main` was red for this reason as of commit `fc76118`: `.github/workflows/ci.yml` already runs
`pnpm check:brand` before lint, typecheck and test.

## 2. Shipped code was already clean

Checked separately from the script, because the script's own exclusions could have hidden something:

| Checked                                                              | Result                                                                    |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `grep -ri alphamarket` over the repository, excluding node_modules, .git, docs | No shipped hit. The only hit was the checker naming what it bans — now removed, Section 3 |
| `apps/web/src/app/layout.tsx`                                        | Clean. `title`, `description`, `openGraph.siteName` and the Twitter card all read `Hume` |
| `apps/web/src/app/opengraph-image.tsx`                               | Clean. `alt` is "Hume — Derivatives for tokenized equities", the wordmark renders `HUME`, the asset is `src/assets/hume-mark.png` |
| `apps/web/src/components/Logo.tsx`                                   | Clean. Reads `@/assets/hume-mark.png`, wordmark `HUME`                    |
| `packages/sdk/package.json`                                          | Package name `@hume/sdk`. **Repository URLs were wrong** — Section 3      |
| `packages/ui` (11 source files, `package.json`)                      | Clean. `@hume/ui`, description names "the Hume terminal"                  |
| `README.md`                                                          | Clean of every retired brand                                              |
| `services/`, `packages/sdk/src`, `packages/config`, `packages/types`  | Clean                                                                     |
| Every tracked and untracked filename                                 | Clean. The one asset rename landed in `fc76118`: `alphamarkets-mark.png` became `hume-mark.png` |

`apps/web/src/assets/hume-logo.svg` matches the pattern by chance and stays excluded: the supplied logo
embeds base64 image data, which can contain any short letter sequence. The file itself is correctly named
and its content is an image, not copy.

## 3. What changed

### `scripts/check-brand.sh` — the exclusions, and three ways it can now fail

1. **Excludes `docs/` as a directory**, replacing the two by-name exclusions for files that no longer
   exist. Each exclusion now carries its reason in a comment. `apps/web/src/app/docs/` — the web app's
   own docs page, which does ship — is **not** excluded and is still scanned.
2. **Scans untracked files** (`git grep --untracked`, and `git ls-files --others --exclude-standard` for
   filenames), so a new file carrying a legacy name fails the check before it is ever committed. The old
   version only saw tracked files.
3. **Distinguishes "no match" from "the check could not run".** `git grep` exits 1 for no match and 2 or
   more for a real failure; the old `|| true` swallowed both, so a mistyped pathspec would have printed
   "Brand check passed". It now exits 2 with `Brand check could not run: git grep exited N`. This was not
   theoretical — the first draft of the rewrite misplaced a flag, `git grep` printed
   `fatal: unable to resolve revision: --untracked`, and the script still said it passed.
4. **Writes the retired spellings as regex fragments** (`alpha-?markets?`), so this file's own pattern no
   longer answers a plain grep for the old name. That is what makes acceptance check 2 return nothing
   rather than four self-matches.

The pattern still covers every retired brand, not only this phase's: `citadel`, `ctdl`, `orionis`,
`alpha-?markets?`, `levier`, `levera-`, and the four `levera*` contract prefixes.

Verified by probe — each file was created, the check run, then the file deleted:

| Probe                                              | check-brand.sh exit |
| -------------------------------------------------- | ------------------- |
| Clean tree                                         | 0                   |
| Untracked file containing `AlphaMarkets`           | 1                   |
| Untracked file containing `alpha-market`           | 1                   |
| Untracked file containing `Levier`                 | 1                   |
| Untracked file *named* `alphamarkets-helper.ts`    | 1                   |

### `packages/sdk/package.json` — three stale repository URLs

Not a legacy brand string, but wrong metadata that would ship with the package the moment `@hume/sdk`
is published. All three pointed at a repository that is not this one:

| Field               | Was                                                            | Now                                                                       |
| ------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `homepage`          | `https://github.com/rubengitdev/hume/tree/main/packages/sdk#readme` | `https://github.com/HUMEMARKETS/humemarkets/tree/main/packages/sdk#readme` |
| `repository.url`    | `git+https://github.com/rubengitdev/hume.git`                  | `git+https://github.com/HUMEMARKETS/humemarkets.git`                      |
| `bugs.url`          | `https://github.com/rubengitdev/hume/issues`                   | `https://github.com/HUMEMARKETS/humemarkets/issues`                       |

These now match the remote set in Phase 0. The package name `@hume/sdk`, the description and the
`hume` keyword were already correct.

## 4. Acceptance

```
$ bash scripts/check-brand.sh
Brand check passed: no Citadelle, CTDL, Orionis, Alpha Markets or Levier reference outside docs/.
exit=0

$ grep -ri alphamarket --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs .
exit=1   (grep exits 1 for no match: nothing found)

$ pnpm turbo run lint typecheck
 Tasks:    28 successful, 28 total
Cached:    6 cached, 28 total
  Time:    47.155s
exit=0
```

All three acceptance checks pass.

## 5. Noted, not fixed — outside this phase

Neither is a brand string; both are stale factual claims in `README.md` that a later phase owns.

| Claim in `README.md`                                                        | Reality                                                                 | Owner    |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------- |
| "has not been deployed to mainnet", contracts "deployed as `1.5.0-testnet`" | 21 addresses have bytecode on mainnet chain 4663 (`docs/evidence/phase-0.md`) | Phase 17 |
| "The web app runs on Vercel at `https://hume-ten.vercel.app`"               | Section 0.1 records no `hume-mainnet` Vercel project and `hume.tech` not resolving | Phase 6  |

**Cost of this phase: $0.**
