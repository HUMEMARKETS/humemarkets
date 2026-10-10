#!/usr/bin/env bash
# Replaces the implementation behind the HumeVault proxy on mainnet with one built from the current HumeVault source,
# so the explorer shows "HumeVault" instead of the pre-rebrand "AlphaMarketsVault". The proxy address, every balance
# and every role stay as they are: the 24 source files of the old implementation are byte-identical to the repo after
# the rename (checked against Blockscout), and the constructor argument (the collateral manager) is the same.
# Rehearsed on a mainnet fork: pool, balances, deposit, perp open and close, withdraw all unchanged.
#   bash scripts/upgrade-vault-mainnet.sh              (RPC_URL overrides the default mainnet RPC; used for the fork test)
# Signs with DEPLOYER_PRIVATE_KEY from the root .env, read in a subshell and never printed.
set -euo pipefail
cd "$(dirname "$0")/../packages/contracts"
RPC="${RPC_URL:-https://rpc.mainnet.chain.robinhood.com}"
DEP=deployments/robinhood_mainnet.json
VAULT="$(jq -r .vault "$DEP")"; CM="$(jq -r .collateralManager "$DEP")"; USDG="$(jq -r .settlementToken "$DEP")"
SLOT=0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
state() { echo "  pool $(cast call "$VAULT" 'poolBalance(address)(uint256)' "$USDG" --rpc-url "$RPC" | awk '{print $1}') raw, implementation 0x$(cast storage "$VAULT" "$SLOT" --rpc-url "$RPC" | tail -c 41)"; }

echo "Vault proxy $VAULT (unchanged by this script)"
echo "Before:"; state
set -a; . ../../.env; set +a
export ETH_RPC_URL="$RPC"
out="$(forge create src/core/HumeVault.sol:HumeVault --private-key "$DEPLOYER_PRIVATE_KEY" --broadcast --constructor-args "$CM" 2>&1)"
impl="$(echo "$out" | awk '/Deployed to/ {print $3}')"
[[ "$impl" =~ ^0x[0-9a-fA-F]{40}$ ]] || { echo "deploy failed:"; echo "$out" | tail -5; exit 1; }
echo "New implementation: $impl"
cast send "$VAULT" 'upgradeToAndCall(address,bytes)' "$impl" 0x --private-key "$DEPLOYER_PRIVATE_KEY" | grep -E '^status|^transactionHash'
echo "After:"; state
echo "$impl" > "${TMPDIR:-/tmp}/new-vault-impl.txt"
echo "Next: verify $impl on the explorer as HumeVault, and record it as .vault in deployments/robinhood_mainnet.implementations.json."
