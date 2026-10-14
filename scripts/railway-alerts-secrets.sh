#!/usr/bin/env bash
# Sets the Web Push keys for price alerts on the indexer, the one service that sends the notifications. The
# private key is read from VAPID_PRIVATE_KEY in .env.vapid (gitignored, made once with `web-push generate-vapid-keys`),
# in a subshell, and is never printed. Run it yourself: an agent may not write secrets to Railway.
#   bash scripts/railway-alerts-secrets.sh testnet     # or: mainnet
# The same pair serves both environments; the public half also goes to the web build as NEXT_PUBLIC_VAPID_PUBLIC_KEY
# (already the default in scripts/web-testnet.sh and scripts/web-mainnet-env.sh).
set -euo pipefail
cd "$(dirname "$0")/.."
env_name="${1:?testnet or mainnet}"
( set -a; . ./.env.vapid; set +a
  : "${VAPID_PRIVATE_KEY:?VAPID_PRIVATE_KEY is not set in .env.vapid}"
  : "${NEXT_PUBLIC_VAPID_PUBLIC_KEY:?NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set in .env.vapid}"
  railway variables -s indexer -e "$env_name" --skip-deploys \
    --set "VAPID_PRIVATE_KEY=$VAPID_PRIVATE_KEY" \
    --set "VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY" \
    --set "VAPID_SUBJECT=${VAPID_SUBJECT:-https://www.humemarkets.com}" >/dev/null )
echo "Set VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY and VAPID_SUBJECT on the indexer ($env_name). Redeploy it to apply."
