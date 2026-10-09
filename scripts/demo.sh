#!/usr/bin/env bash
# One-command testnet demo on the little gas the deployer has.
#   bash scripts/demo.sh up 0xYourWallet   fund your wallet, fund 5 bots + the liquidator, start the simulator
#   bash scripts/demo.sh run [0xWallet]    same, but in the foreground of your terminal (Ctrl+C stops it)
#   bash scripts/demo.sh down              stop it (it spends gas every minute while it runs)
#   bash scripts/demo.sh status            balances and whether it runs
# The simulator moves every mock feed once a minute (SIM_MARKETS in services/simulator, 27 markets) and runs 5 bots. Mock feeds go
# stale after an hour, so a stopped simulator means markets stop trading until it runs again.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env.testnet; set +a
R=https://rpc.testnet.chain.robinhood.com
DIR=.simulator; PIDF=$DIR/demo.pid; LOG=$DIR/demo.log
mkdir -p "$DIR"
eth() { cast balance "$1" --rpc-url "$R" --ether; }
DEPLOYER=$(cast wallet address --private-key "$PRIVATE_KEY")

export CHAIN_ID=46630 RPC_URL=$R SIM_RPC_URL=$R HUME_ADDRESSES=
export SIM_TICK_MS=60000
# 5 bots together trade about every 5 seconds (SIM_PACE=1 is the calm roster pace, about every 45 seconds; measured at 9: every ~10 s).
export SIM_PACE=${SIM_PACE:-18}
HOURS=${SIM_HOURS:-1}   # hours of bot gas to pay for; at this pace the bots burn about 0.008 ETH an hour with the price driver
export SIM_BOTS=scalper-1,trend-1,reverter-1,degen-long,degen-short

running() { [ -f "$PIDF" ] && kill -0 "$(cat "$PIDF")" 2>/dev/null; }

case "${1:-}" in
  up)
    W=${2:?usage: demo.sh up 0xYourWallet}
    cast to-check-sum-address "$W" >/dev/null
    running && { echo "already running (pid $(cat "$PIDF"))"; exit 0; }
    # Gas for the recording wallet: about 160 transactions.
    if [ "$(cast balance "$W" --rpc-url "$R")" -lt 700000000000000 ]; then
      cast send "$W" --value 0.001ether --private-key "$PRIVATE_KEY" --rpc-url "$R" >/dev/null && echo "sent 0.001 ETH to $W"
    fi
    bash scripts/mint-testnet.sh "$W"
    pnpm --filter @hume/simulator bootstrap "$HOURS"
    # The liquidator may also liquidate your wallet, for the liquidation clip.
    SIM_LIQUIDATE_WALLETS=$W setsid nohup pnpm --filter @hume/simulator start >"$LOG" 2>&1 &
    echo $! >"$PIDF"
    echo "simulator started (pid $(cat "$PIDF")), log $LOG. Stop it with: bash scripts/demo.sh down"
    ;;
  run)
    # Foreground, in your own terminal: logs on screen, Ctrl+C stops it. The wallet is optional.
    running && { echo "already running in the background (pid $(cat "$PIDF")); stop it first: bash scripts/demo.sh down"; exit 1; }
    W=${2:-}
    if [ -n "$W" ]; then
      cast to-check-sum-address "$W" >/dev/null
      if [ "$(cast balance "$W" --rpc-url "$R")" -lt 700000000000000 ]; then
        cast send "$W" --value 0.001ether --private-key "$PRIVATE_KEY" --rpc-url "$R" >/dev/null && echo "sent 0.001 ETH to $W"
      fi
      bash scripts/mint-testnet.sh "$W"
      export SIM_LIQUIDATE_WALLETS=$W
    fi
    pnpm --filter @hume/simulator bootstrap "$HOURS"
    exec pnpm --filter @hume/simulator start
    ;;
  down)
    if running; then
      kill -- "-$(cat "$PIDF")" 2>/dev/null || kill "$(cat "$PIDF")"
      for _ in 1 2 3 4 5 6; do running || break; sleep 2; done
      running && kill -9 -- "-$(cat "$PIDF")" 2>/dev/null || true
      echo "stopped"
    else echo "not running"; fi
    rm -f "$PIDF"
    ;;
  status)
    running && echo "simulator: running (pid $(cat "$PIDF"))" || echo "simulator: stopped"
    echo "deployer $DEPLOYER: $(eth "$DEPLOYER") ETH"
    [ -f "$LOG" ] && tail -3 "$LOG" | cut -c1-160
    ;;
  *) echo "usage: demo.sh up 0xWallet | down | status"; exit 1 ;;
esac
