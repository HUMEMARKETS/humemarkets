#!/usr/bin/env bash
# Deploys the mainnet web app to Netlify (site humemarkets-mainnet, domain humemarkets.com) from a clean checkout
# of HEAD, so no dotenv file can be uploaded. Needs `npx netlify-cli login` done once. The NEXT_PUBLIC_* values are
# set here and inlined by the build; Netlify has no deploy cap like Vercel's 100 a day on the free plan.
#   bash scripts/deploy-web-netlify.sh                    redeploy HEAD
#   bash scripts/deploy-web-netlify.sh 0xTokenAddress     set the HUME token address (the "CA"), then redeploy
set -euo pipefail
cd "$(dirname "$0")/.."
SITE=b9f8d0c1-3318-43f7-a507-58e7c9ce1605

export NEXT_PUBLIC_CHAIN_ID=4663
export NEXT_PUBLIC_RPC_URL=https://rpc.mainnet.chain.robinhood.com
export NEXT_PUBLIC_API_URL=https://api-mainnet-e81a.up.railway.app
export NEXT_PUBLIC_EXPLORER_URL=https://robinhoodchain.blockscout.com
export NEXT_PUBLIC_SITE_URL=https://humemarkets.com
export NEXT_PUBLIC_FEATURE_COPY_TRADING=true
export NEXT_PUBLIC_EXPLORER_URL_MAINNET=https://robinhoodchain.blockscout.com
export NEXT_PUBLIC_EXPLORER_URL_TESTNET=https://explorer.testnet.chain.robinhood.com
export NEXT_PUBLIC_RPC_URL_MAINNET=https://rpc.mainnet.chain.robinhood.com
export NEXT_PUBLIC_RPC_URL_TESTNET=https://rpc.testnet.chain.robinhood.com
export NEXT_PUBLIC_RPC_PROXY_URL_MAINNET=https://api-mainnet-e81a.up.railway.app/v1/rpc
export NEXT_PUBLIC_RPC_PROXY_URL_TESTNET=https://api-testnet-8703.up.railway.app/v1/rpc
export NEXT_PUBLIC_API_URL_MAINNET=https://api-mainnet-e81a.up.railway.app
export NEXT_PUBLIC_API_URL_TESTNET=https://api-testnet-8703.up.railway.app

if [[ $# -ge 1 ]]; then
  [[ "$1" =~ ^0x[0-9a-fA-F]{40}$ ]] || { echo "not an address: $1" >&2; exit 1; }
  export NEXT_PUBLIC_PROTOCOL_TOKEN_ADDRESS="$1" NEXT_PUBLIC_PROTOCOL_TOKEN_SYMBOL=HUME NEXT_PUBLIC_PROTOCOL_TOKEN_LIVE=true
  echo "HUME token address set to $1"
fi

wt="$(mktemp -d)"
git worktree add --detach "$wt" HEAD -q
trap 'git worktree remove --force "$wt"' EXIT
cd "$wt"
pnpm install --frozen-lockfile >/dev/null
npx netlify-cli deploy --build --prod --site "$SITE" --filter @hume/web 2>&1 | grep -E "Production URL|Error|error" || true
