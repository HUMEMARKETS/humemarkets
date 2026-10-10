#!/usr/bin/env bash
# Shows that the HUME contracts are deployed on Robinhood Chain mainnet: reads each address from
# packages/contracts/deployments/robinhood_mainnet.json, asks the chain for its code (and, for a proxy, the
# implementation behind it), and prints one tidy table. Read-only, about 3 seconds. Needs cast and jq.
#   bash scripts/show-mainnet-contracts.sh            (RPC_URL overrides the default public RPC)
set -uo pipefail
cd "$(dirname "$0")/.."
RPC="${RPC_URL:-https://rpc.mainnet.chain.robinhood.com}"
DEP=packages/contracts/deployments/robinhood_mainnet.json
EXPLORER=https://robinhoodchain.blockscout.com
SLOT=0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc   # EIP-1967 implementation slot

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  B=$'\e[1m' D=$'\e[2m' G=$'\e[32m' R=$'\e[31m' C=$'\e[36m' Y=$'\e[33m' Z=$'\e[0m'
else
  B= D= G= R= C= Y= Z=
fi

# key | label | kind
rows=(
  "vault|HumeVault|proxy"
  "perpsEngine|PerpsEngine|proxy"
  "perpPositionManager|PerpPositionManager|proxy"
  "perpOrderManager|PerpOrderManager|proxy"
  "fundingManager|FundingManager|proxy"
  "liquidationEngine|LiquidationEngine|proxy"
  "optionsEngine|OptionsEngine|proxy"
  "optionMarket|OptionMarket|proxy"
  "optionPositionManager|OptionPositionManager|proxy"
  "marketRegistry|MarketRegistry|proxy"
  "oracleRouter|OracleRouter|proxy"
  "priceValidator|PriceValidator|proxy"
  "riskManager|RiskManager|proxy"
  "collateralManager|CollateralManager|proxy"
  "crossMargin|CrossMarginManager|proxy"
  "feeManager|FeeManager|proxy"
  "insuranceFund|InsuranceFund|proxy"
  "buybackModule|BuybackModule|proxy"
  "subaccountFactory|SubaccountFactory|proxy"
  "rfqManager|RFQManager|proxy"
  "ponsRouter|HumePonsRouter|plain"
)

tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT

probe() {  # index key kind
  local i="$1" key="$2" kind="$3" addr code impl
  addr="$(jq -r ".$key" "$DEP")"
  code="$(cast code "$addr" --rpc-url "$RPC" 2>/dev/null | tr -d '[:space:]')"
  impl="-"
  if [[ "$kind" == proxy ]]; then
    impl="$(cast storage "$addr" "$SLOT" --rpc-url "$RPC" 2>/dev/null | sed 's/^0x000000000000000000000000/0x/')"
  fi
  printf '%s\t%s\t%s\n' "$addr" "$(( (${#code} - 2) / 2 ))" "$impl" > "$tmp/$i"
}
export -f probe; export DEP RPC SLOT tmp

printf '\n%s  HUME MARKETS  %s·  smart contracts on Robinhood Chain mainnet%s\n' "$B" "$D" "$Z"
printf '%s  chain 4663   rpc %s%s\n\n' "$D" "$RPC" "$Z"

# One call each, all at once.
i=0
for row in "${rows[@]}"; do
  IFS='|' read -r key label kind <<<"$row"
  probe "$i" "$key" "$kind" &
  i=$((i + 1))
done
head_block="$(cast block-number --rpc-url "$RPC" 2>/dev/null)" &
wait
head_block="$(cast block-number --rpc-url "$RPC" 2>/dev/null)"

printf '  %s%-22s %-44s %9s   %-14s  %s%s\n' "$D" "CONTRACT" "ADDRESS" "CODE" "IMPLEMENTATION" "STATUS" "$Z"
printf '  %s%s%s\n' "$D" "$(printf '%.0s─' {1..108})" "$Z"
ok=0
i=0
for row in "${rows[@]}"; do
  IFS='|' read -r key label kind <<<"$row"
  IFS=$'\t' read -r addr size impl < "$tmp/$i"
  short="-"; [[ "$impl" != "-" && -n "$impl" ]] && short="${impl:0:8}…${impl: -4}"
  if [[ "$size" -gt 0 ]]; then
    status="${G}✔ deployed${Z}"; ok=$((ok + 1)); sizetxt="$(printf '%s%7d B%s' "$C" "$size" "$Z")"
  else
    status="${R}✘ no code${Z}"; sizetxt="$(printf '%9s' '-')"
  fi
  printf '  %-22s %s%-44s%s %s   %s%-14s%s  %s\n' "$label" "$B" "$addr" "$Z" "$sizetxt" "$D" "$short" "$Z" "$status"
  i=$((i + 1))
done
printf '  %s%s%s\n\n' "$D" "$(printf '%.0s─' {1..108})" "$Z"

# A little live state, so the contracts are visibly in use.
reg="$(jq -r .marketRegistry "$DEP")"; vault="$(jq -r .vault "$DEP")"; usdg="$(jq -r .settlementToken "$DEP")"
markets="$(cast call "$reg" 'allMarketIds()(bytes32[])' --rpc-url "$RPC" 2>/dev/null | tr ',' '\n' | grep -c 0x)"
pool_raw="$(cast call "$vault" 'poolBalance(address)(uint256)' "$usdg" --rpc-url "$RPC" 2>/dev/null | awk '{print $1}')"
pool="$(awk -v n="${pool_raw:-0}" 'BEGIN{printf "%.2f", n/1000000}')"

printf '  %sMarkets listed%s      %s%s%s   (equities, ETFs, commodities, BTC, ETH, LINK, GLD)\n' "$D" "$Z" "$B" "$markets" "$Z"
printf '  %sVault pool%s          %s%s USDG%s\n' "$D" "$Z" "$B" "$pool" "$Z"
printf '  %sOwner%s               %s%s%s\n' "$D" "$Z" "$B" "0xd09D9c87ECfe008B4D6D3cEbeAd25103c16d9a7C" "$Z"
printf '  %sLatest block%s        %s%s%s\n\n' "$D" "$Z" "$B" "${head_block:-?}" "$Z"

if [[ "$ok" -eq "${#rows[@]}" ]]; then
  printf '  %s✔ %d of %d contracts have code on Robinhood Chain mainnet%s\n' "$G$B" "$ok" "${#rows[@]}" "$Z"
else
  printf '  %s✘ only %d of %d contracts have code%s\n' "$R$B" "$ok" "${#rows[@]}" "$Z"
fi
printf '  %sExplorer%s            %s%s/address/<address>%s\n\n' "$D" "$Z" "$C" "$EXPLORER" "$Z"
