#!/usr/bin/env bash
# Deploys the web app to the Vercel project `humemarkets-mainnet` (humemarkets.com) from a clean checkout of
# HEAD, so no dotenv file can be uploaded. Needs `vercel` logged in.
#   bash scripts/deploy-web-mainnet.sh                      redeploy HEAD
#   bash scripts/deploy-web-mainnet.sh 0xTokenAddress       first set the HUME token address, then redeploy
# The token address makes the site show the HUME "CA" (NEXT_PUBLIC_PROTOCOL_TOKEN_*; see apps/web/src/lib/env.ts).
set -euo pipefail
cd "$(dirname "$0")/.."
export VERCEL_ORG_ID=team_7cmibRt9fmvwNDVIQAu2VbiL VERCEL_PROJECT_ID=prj_47Vs8ldXy8UdKI876fkAMKd6KZ0c

if [[ $# -ge 1 ]]; then
  ca="$1"
  [[ "$ca" =~ ^0x[0-9a-fA-F]{40}$ ]] || { echo "not an address: $ca" >&2; exit 1; }
  tmp="$(mktemp)"
  for pair in "NEXT_PUBLIC_PROTOCOL_TOKEN_ADDRESS=$ca" "NEXT_PUBLIC_PROTOCOL_TOKEN_SYMBOL=HUME" "NEXT_PUBLIC_PROTOCOL_TOKEN_LIVE=true"; do
    printf '{"key":"%s","value":"%s","type":"plain","target":["production","preview"]}' "${pair%%=*}" "${pair#*=}" > "$tmp"
    vercel api "/v10/projects/$VERCEL_PROJECT_ID/env?upsert=true" -X POST --input "$tmp" --raw >/dev/null
  done
  rm -f "$tmp"
  echo "HUME token address set to $ca"
fi

wt="$(mktemp -d)"
git worktree add --detach "$wt" HEAD -q
trap 'git worktree remove --force "$wt"' EXIT
( cd "$wt" && vercel deploy --prod --yes 2>&1 | grep -E "Aliased|readyState|Error" )
