#!/usr/bin/env bash
# Deploys the mainnet web app to Netlify (site humemarkets-mainnet, domain humemarkets.com) from a clean checkout
# of HEAD, so no dotenv file can be uploaded. Needs `npx netlify-cli login` done once. The NEXT_PUBLIC_* values are
# set here and inlined by the build; Netlify has no deploy cap like Vercel's 100 a day on the free plan.
#   bash scripts/deploy-web-netlify.sh                    redeploy HEAD (shows the recorded HUME CA)
#   bash scripts/deploy-web-netlify.sh 0xTokenAddress     override the HUME token address, then redeploy
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
SITE=b9f8d0c1-3318-43f7-a507-58e7c9ce1605

source "$ROOT/scripts/web-mainnet-env.sh"

if [[ $# -ge 1 ]]; then
  [[ "$1" =~ ^0x[0-9a-fA-F]{40}$ ]] || { echo "not an address: $1" >&2; exit 1; }
  export NEXT_PUBLIC_PROTOCOL_TOKEN_ADDRESS="$1" NEXT_PUBLIC_PROTOCOL_TOKEN_SYMBOL=HUME NEXT_PUBLIC_PROTOCOL_TOKEN_LIVE=true
  echo "HUME token address set to $1"
fi

# The site keeps its own copy of every NEXT_PUBLIC_* value, so a build started anywhere else (the Netlify
# dashboard, a CLI run without this script) cannot drop the chain, the API or the CA. Public values only.
vars="$(mktemp)"
env | grep -E '^NEXT_PUBLIC_' > "$vars"
npx netlify-cli env:import --replace-existing --filter @hume/web --site "$SITE" "$vars" </dev/null >/dev/null
rm -f "$vars"

wt="$(mktemp -d)"
git worktree add --detach "$wt" HEAD -q
trap 'git worktree remove --force "$wt"' EXIT
cd "$wt"
pnpm install --frozen-lockfile >/dev/null
npx netlify-cli deploy --build --prod --site "$SITE" --filter @hume/web 2>&1 | grep -E "Production URL|Error|error" || true

bash "$ROOT/scripts/check-web-ca.sh" https://humemarkets.com "${1:-}"
