#!/usr/bin/env bash
# Fails when a shipped file contains a retired brand name: Citadelle/CTDL, Orionis, Alpha Markets
# (every spelling, hyphenated or not), or Levier/Levera. The venue is Hume; no earlier name may reach
# code, metadata, UI copy, an asset filename or the SDK package name.
#
# Scope and the exclusions, each with a reason:
#   docs/                            The planning files. They must name the old brands to record what
#                                    was renamed, what was ported from Levier, and what the launch
#                                    gate checks. Nothing in docs/ ships to a user; the web app's own
#                                    docs page is apps/web/src/app/docs/, which IS scanned.
#   pnpm-lock.yaml                   Generated. Package names come from the registry.
#   scripts/check-brand.sh           This file names the brands it bans.
#   packages/contracts/CHANGELOG.md  Records contracts deployed on chain under a retired name. The
#                                    addresses are immutable, so the record has to keep the name.
#   apps/web/src/assets/*.svg        The supplied logo embeds base64 image data, which can contain any
#                                    short letter sequence by chance.
#
# Untracked files are scanned too, so a bad name fails here rather than after it is committed.
set -euo pipefail

cd "$(dirname "$0")/.."

# The retired spellings are written as fragments on purpose, so that a plain repository-wide grep for
# the old name returns only real occurrences and never this file's own pattern.
PATTERN='citadel|ctdl|orionis|alpha-?markets?|levier|levera-|levera(market|pair|vault|router)'

# git grep exits 1 for "no match" and 2 or more for a real failure. Treat only 0 and 1 as answers, so a
# mistyped pathspec can never read as a clean repository.
set +e
hits=$(git grep --untracked -n -I -i -E "$PATTERN" -- . \
  ':!docs/' ':!pnpm-lock.yaml' ':!scripts/check-brand.sh' \
  ':!packages/contracts/CHANGELOG.md' ':!apps/web/src/assets/*.svg')
status=$?
set -e
if [ "$status" -gt 1 ]; then
  echo "Brand check could not run: git grep exited $status"
  exit 2
fi
names=$(git ls-files --cached --others --exclude-standard | grep -i -E "$PATTERN" || true)

if [ -n "$hits$names" ]; then
  echo "Retired brand name found (Citadelle / CTDL / Orionis / Alpha Markets / Levier). The venue is Hume:"
  [ -n "$hits" ] && echo "$hits"
  [ -n "$names" ] && echo "$names"
  exit 1
fi

echo "Brand check passed: no Citadelle, CTDL, Orionis, Alpha Markets or Levier reference outside docs/."
