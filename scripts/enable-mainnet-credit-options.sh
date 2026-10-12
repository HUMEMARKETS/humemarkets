#!/usr/bin/env bash
# Turns lending and options on for mainnet with the funds the owner already holds. Four steps, in order:
#   1. deploy the credit stack (oracle, registry, router, vault, TSLA/USDG pair), unpaused, caps from
#      deployments/robinhood_mainnet.limits.json (.credit); the script writes the addresses into robinhood_mainnet.json
#   2. set the first credit-oracle prices: TSLA from its Chainlink feed (last close if the session is shut), USDG at $1
#   3. shrink the option contract size of BTC, ETH, LINK and GLD so that one contract fits the 0.20 USDG position cap
#   4. seed the pair with USDG. The pair has no withdraw: this USDG is lent out for good, so SEED is kept small.
# Dry run by default (prints what it would send). Send with BROADCAST=1. Signs with DEPLOYER_PRIVATE_KEY from the root .env,
# read in a subshell and never printed.
#   bash scripts/enable-mainnet-credit-options.sh
#   BROADCAST=1 bash scripts/enable-mainnet-credit-options.sh
# Gas: the deploy is about 11.1M gas (simulated), about 0.00022 ETH at the 0.02 gwei base fee; GAS_PRICE caps it so the
# whole run fits the owner's ETH. Re-running step 1 deploys a second stack: do not.
set -euo pipefail
cd "$(dirname "$0")/../packages/contracts"
export PATH="$PATH:$HOME/.foundry/bin"

RPC="${RPC_URL:-https://rpc.mainnet.chain.robinhood.com}"
GAS_PRICE="${GAS_PRICE:-25000000}"   # wei, 0.025 gwei
SEED="${SEED:-800000}"               # USDG base units (6 decimals): 0.80 USDG, equal to .credit.borrowCap
TSLA=0x322F0929c4625eD5bAd873c95208D54E1c003b2d
DEP=deployments/robinhood_mainnet.json
MARKETS=deployments/robinhood_mainnet.markets.json

# symbol -> option contract size in 18-decimal units. One contract must stay under the 0.20 USDG position cap:
# BTC 1e12 = 0.000001 BTC (~0.084 USDG), ETH 3e13 = 0.00003 (~0.076), LINK 5e15 = 0.005 (~0.067), GLD 2e14 = 0.0002 (~0.077).
declare -A SIZE=([BTC]=1000000000000 [ETH]=30000000000000 [LINK]=5000000000000000 [GLD]=200000000000000)

send() { # send <label> <cast send args...>
  local label="$1"; shift
  if [[ "${BROADCAST:-}" == 1 ]]; then
    echo "-> $label"; cast send --rpc-url "$RPC" --gas-price "$GAS_PRICE" --private-key "$DEPLOYER_PRIVATE_KEY" "$@" | grep -E '^status|^transactionHash'
  else
    echo "[dry] $label: cast send $*"
  fi
}

set -a; . ../../.env; set +a
OWNER="$(cast wallet address --private-key "$DEPLOYER_PRIVATE_KEY")"
[[ "$OWNER" == 0xd09D9c87ECfe008B4D6D3cEbeAd25103c16d9a7C ]] || { echo "DEPLOYER_PRIVATE_KEY is not the mainnet owner ($OWNER)"; exit 1; }
USDG="$(jq -r .settlementToken "$DEP")"; OPTION_MARKET="$(jq -r .optionMarket "$DEP")"
echo "owner $OWNER: $(cast balance "$OWNER" --rpc-url "$RPC" -e) ETH, $(cast call "$USDG" 'balanceOf(address)(uint256)' "$OWNER" --rpc-url "$RPC" | awk '{print $1}') raw USDG"

echo "== 1/4 credit stack"
if [[ "$(jq -r '.creditPairTslaUsdg // empty' "$DEP")" != "" ]]; then
  echo "already deployed: $(jq -r .creditPairTslaUsdg "$DEP")"
elif [[ "${BROADCAST:-}" == 1 ]]; then
  PRIVATE_KEY="$DEPLOYER_PRIVATE_KEY" CREDIT_COLLATERAL_TOKEN="$TSLA" CREDIT_PAUSED=false NETWORK_NAME=robinhood_mainnet \
    forge script script/DeployCreditStack.s.sol --rpc-url "$RPC" --broadcast --slow --with-gas-price "$GAS_PRICE"
else
  echo "[dry] forge script DeployCreditStack.s.sol --broadcast --slow --with-gas-price $GAS_PRICE (simulated earlier: 11.06M gas)"
  exit 0
fi
ORACLE="$(jq -r .creditOracle "$DEP")"; PAIR="$(jq -r .creditPairTslaUsdg "$DEP")"

echo "== 2/4 credit oracle prices"
FEED="$(jq -r '.markets[] | select(.symbol=="TSLA") | .feed' "$MARKETS")"
DEC="$(cast call "$FEED" 'decimals()(uint8)' --rpc-url "$RPC")"
ANSWER="$(cast call "$FEED" 'latestRoundData()(uint80,int256,uint256,uint256,uint80)' --rpc-url "$RPC" | sed -n 2p | awk '{print $1}')"
TSLA_PRICE="$(python3 -I -c "print($ANSWER * 10**(18 - $DEC))")"
echo "TSLA feed $FEED answer $ANSWER ($DEC decimals) -> $TSLA_PRICE"
send "oracle TSLA price" "$ORACLE" 'setPrice(address,uint256)' "$TSLA" "$TSLA_PRICE"
send "oracle USDG price" "$ORACLE" 'setPrice(address,uint256)' "$USDG" 1000000000000000000

echo "== 3/4 option contract sizes"
for symbol in "${!SIZE[@]}"; do
  send "$symbol contract size ${SIZE[$symbol]}" "$OPTION_MARKET" 'setContractSize(bytes32,uint256)' "$(cast format-bytes32-string "$symbol")" "${SIZE[$symbol]}"
done

echo "== 4/4 seed the pair with $SEED raw USDG"
send "USDG -> pair" "$USDG" 'transfer(address,uint256)' "$PAIR" "$SEED"

echo "== read back"
for symbol in "${!SIZE[@]}"; do
  echo "$symbol contract size: $(cast call "$OPTION_MARKET" 'getContractSize(bytes32)(uint256)' "$(cast format-bytes32-string "$symbol")" --rpc-url "$RPC" | awk '{print $1}')"
done
echo "pair USDG: $(cast call "$USDG" 'balanceOf(address)(uint256)' "$PAIR" --rpc-url "$RPC" | awk '{print $1}')"
echo "oracle TSLA: $(cast call "$ORACLE" 'prices(address)(uint256,uint256)' "$TSLA" --rpc-url "$RPC" | head -1)"
echo "owner ETH left: $(cast balance "$OWNER" --rpc-url "$RPC" -e)"
echo "Next: bash scripts/deploy-web-mainnet.sh, and run the keeper's credit price feed (see the hand-off notes)."
