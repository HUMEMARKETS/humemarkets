#!/usr/bin/env bash
# Runs the web app against testnet 46630 and the testnet API. Next never overrides a variable that
# is already set, and next.config loads the root .env (mainnet), so every address is pinned here.
# Usage: bash scripts/web-testnet.sh build|start|dev   (start needs a prior build)
set -euo pipefail
cd "$(dirname "$0")/.."
D=packages/contracts/deployments/robinhood_testnet.json
a() { jq -r ".$1" "$D"; }

export NEXT_PUBLIC_CHAIN_ID=46630
export NEXT_PUBLIC_RPC_URL=https://rpc.testnet.chain.robinhood.com
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api-testnet-8703.up.railway.app}"
export NEXT_PUBLIC_RPC_PROXY_URL="$NEXT_PUBLIC_API_URL/v1/rpc"
export NEXT_PUBLIC_EXPLORER_URL=https://explorer.testnet.chain.robinhood.com
export NEXT_PUBLIC_MARKET_REGISTRY=$(a marketRegistry) NEXT_PUBLIC_HUME_VAULT=$(a vault)
export NEXT_PUBLIC_OPTIONS_ENGINE=$(a optionsEngine) NEXT_PUBLIC_PERPS_ENGINE=$(a perpsEngine)
export NEXT_PUBLIC_ORACLE_ROUTER=$(a oracleRouter) NEXT_PUBLIC_RISK_MANAGER=$(a riskManager)
export NEXT_PUBLIC_FEE_MANAGER=$(a feeManager) NEXT_PUBLIC_COLLATERAL_TOKEN=$(a settlementToken)
export NEXT_PUBLIC_COLLATERAL_MANAGER=$(a collateralManager) NEXT_PUBLIC_OPTION_MARKET=$(a optionMarket)
export NEXT_PUBLIC_OPTION_POSITION_MANAGER=$(a optionPositionManager) NEXT_PUBLIC_PERP_POSITION_MANAGER=$(a perpPositionManager)
export NEXT_PUBLIC_PERP_ORDER_MANAGER=$(a perpOrderManager) NEXT_PUBLIC_LIQUIDATION_ENGINE=$(a liquidationEngine)
export NEXT_PUBLIC_FUNDING_MANAGER=$(a fundingManager) NEXT_PUBLIC_PRICE_VALIDATOR=$(a priceValidator)
export NEXT_PUBLIC_BUYBACK_MODULE=$(a buybackModule) NEXT_PUBLIC_CREDIT_PAIR=$(a creditPairTslaUsdg)
export NEXT_PUBLIC_CREDIT_SYMBOL=TSLA
export NEXT_PUBLIC_PROTOCOL_TOKEN_ADDRESS= NEXT_PUBLIC_PROTOCOL_TOKEN_SYMBOL= NEXT_PUBLIC_PROTOCOL_TOKEN_LIVE=

exec pnpm --filter @hume/web "${1:?build, start or dev}"
