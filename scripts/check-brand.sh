#!/usr/bin/env bash
# Fails when a tracked file contains the retired brand names (Citadelle, Orionis, AlphaMarkets, then Levier/Levera; PROJECT_BRIEF.md Section 46).
# PROJECT_BRIEF.md, DEVELOPMENT_STEPS.md and the contracts CHANGELOG are excluded: they state the rebrand
# rule or record contract names that are deployed on chain under a retired name. SVG assets under
# apps/web/src/assets are excluded too: the supplied logo embeds base64 image data, which can contain
# any three-to-six letter sequence by chance.
set -euo pipefail

cd "$(dirname "$0")/.."

hits=$(git grep -n -I -i -E 'citadel|ctdl|orionis|alphamarket|alpha-market|levier|leveramarket|leverapair|leveravault|leverarouter' -- . \
  ':!docs/PROJECT_BRIEF.md' ':!docs/DEVELOPMENT_STEPS.md' ':!pnpm-lock.yaml' ':!scripts/check-brand.sh' \
  ':!packages/contracts/CHANGELOG.md' ':!apps/web/src/assets/*.svg' || true)
names=$(git ls-files | grep -i -E 'citadel|ctdl|orionis|alphamarket|alpha-market|levier|leveramarket|leverapair|leveravault|leverarouter' || true)

if [ -n "$hits$names" ]; then
  echo "Retired brand name found (Citadelle / CTDL / Orionis / AlphaMarkets / Levier):"
  [ -n "$hits" ] && echo "$hits"
  [ -n "$names" ] && echo "$names"
  exit 1
fi

echo "Brand check passed: no Citadelle, CTDL, Orionis, AlphaMarkets or Levier references."
