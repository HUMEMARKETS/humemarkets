#!/usr/bin/env bash
# Sets the mainnet owner key on the Railway `mainnet` environment, the one wallet that signs for the pricing
# service (option quotes) and the keeper (limit orders, stop-loss, copy trading), and points the pricing
# service at the same RPC as the API. The key is read from DEPLOYER_PRIVATE_KEY in the root .env, in a subshell,
# and is never printed. Run it yourself: an agent may not write secrets to Railway.
#   bash scripts/railway-mainnet-secrets.sh
set -euo pipefail
cd "$(dirname "$0")/.."
( set -a; . ./.env; set +a
  : "${DEPLOYER_PRIVATE_KEY:?DEPLOYER_PRIVATE_KEY is not set in .env}"
  railway variables -s pricing -e mainnet --skip-deploys --set "QUOTER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY" --set "RPC_URL=https://robinhood.drpc.org" >/dev/null
  railway variables -s keeper -e mainnet --skip-deploys --set "KEEPER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY" >/dev/null )
echo "Set QUOTER_PRIVATE_KEY and RPC_URL on pricing, KEEPER_PRIVATE_KEY on keeper (mainnet). Redeploy both to apply."
