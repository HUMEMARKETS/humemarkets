# Sourced by deploy-web-netlify.sh and deploy-web-mainnet.sh (Vercel): the one list of public values the mainnet web
# build needs, so the two hosts cannot drift apart. Public values only, no secrets.
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
# The HUME token is recorded in packages/config (protocolTokens); LIVE turns the CA badge on for every redeploy.
export NEXT_PUBLIC_PROTOCOL_TOKEN_LIVE=true
