#!/usr/bin/env bash
# Lists every `tradeable` market in robinhood_mainnet.markets.json that is not on chain yet, then applies the
# launch caps to just those markets and reads them back. Dry run by default (a fork simulation, no key needed);
# the owner runs it with BROADCAST=1 and the forge keystore (it prompts for the password):
#   bash scripts/list-mainnet-markets.sh                  # simulate
#   BROADCAST=1 bash scripts/list-mainnet-markets.sh      # send
# Listing opens a market at 1 USDG caps, so the caps step follows straight away.
set -euo pipefail
cd "$(dirname "$0")/../packages/contracts"

export PATH="$PATH:$HOME/.foundry/bin"
RPC="${RPC_URL:-https://rpc.mainnet.chain.robinhood.com}"
OWNER=0xd09D9c87ECfe008B4D6D3cEbeAd25103c16d9a7C
SYMBOLS="${SYMBOLS:-DELL,USAR,SGOV}"
SEND=(--sender "$OWNER")
[[ "${BROADCAST:-}" == 1 ]] && SEND=(--account hume-mainnet --sender "$OWNER" --broadcast --slow)

MAX_POSITION=1 OPEN_INTEREST_CAP=1 MAX_PRICE_AGE_HOURS=25 \
  forge script script/AddMarketsMainnet.s.sol --rpc-url "$RPC" "${SEND[@]}"
SYMBOLS="$SYMBOLS" \
  forge script script/SetLaunchCaps.s.sol --rpc-url "$RPC" "${SEND[@]}"

if [[ "${BROADCAST:-}" == 1 ]]; then
  RPC_URL="$RPC" MAX_POSITION=1 MAX_OPEN_INTEREST=1 MAX_NET_OPEN_INTEREST=1 MAX_LEVERAGE=10 \
    bash script/check-launch-limits.sh robinhood_mainnet
fi
