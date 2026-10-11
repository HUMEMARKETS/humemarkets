#!/usr/bin/env bash
# Deploys the mainnet web app to the Vercel project `humemarkets-mainnet` (humemarkets.com) from a clean checkout of
# HEAD, so no dotenv file can be uploaded. Needs `vercel` logged in. Vercel builds remotely from the project's
# variables, so every NEXT_PUBLIC_* value is first copied to the project (scripts/web-mainnet-env.sh).
#   bash scripts/deploy-web-mainnet.sh                      redeploy HEAD (shows the recorded HUME CA)
#   bash scripts/deploy-web-mainnet.sh 0xTokenAddress       override the HUME token address, then redeploy
#   WEB_HOST=https://humemarkets-mainnet.vercel.app bash scripts/deploy-web-mainnet.sh   check the Vercel URL, not the domain
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
export VERCEL_ORG_ID=team_7cmibRt9fmvwNDVIQAu2VbiL VERCEL_PROJECT_ID=prj_47Vs8ldXy8UdKI876fkAMKd6KZ0c
source "$ROOT/scripts/web-mainnet-env.sh"

if [[ $# -ge 1 ]]; then
  [[ "$1" =~ ^0x[0-9a-fA-F]{40}$ ]] || { echo "not an address: $1" >&2; exit 1; }
  export NEXT_PUBLIC_PROTOCOL_TOKEN_ADDRESS="$1" NEXT_PUBLIC_PROTOCOL_TOKEN_SYMBOL=HUME
  echo "HUME token address set to $1"
fi

tmp="$(mktemp)"
python3 -c 'import json,os; print(json.dumps([{"key":k,"value":v,"type":"plain","target":["production","preview"]} for k,v in os.environ.items() if k.startswith("NEXT_PUBLIC_")]))' > "$tmp"
vercel api "/v10/projects/$VERCEL_PROJECT_ID/env?upsert=true" -X POST --input "$tmp" --raw >/dev/null
rm -f "$tmp"

wt="$(mktemp -d)"
git worktree add --detach "$wt" HEAD -q
trap 'git worktree remove --force "$wt"' EXIT
( cd "$wt" && vercel deploy --prod --yes 2>&1 | grep -E "Aliased|readyState|Error" )

bash "$ROOT/scripts/check-web-ca.sh" "${WEB_HOST:-https://humemarkets.com}" "${1:-}"
