# NUTS — no utility tokens

A stupid-simple pump.fun token launchpad. One page, one form: name, ticker, image. Hit launch and a real token is created on pump.fun (Solana mainnet), paid for and signed by the NUTS deployer wallet — visitors never connect a wallet.

## Setup

Create `.env.local` (never commit it):

```bash
SOLANA_PRIVATE_KEY=<base58 secret key of the deployer wallet>
SOLANA_RPC=https://mainnet.helius-rpc.com/?api-key=<your-helius-key>
```

The deployer wallet needs SOL to pay for launches (~0.02 SOL each). Its address and balance are shown on the page once configured. Keep the balance small — anyone who can reach the launch endpoint can spend it.

## Run it locally

```bash
npm install
npm run dev -- --port 47291
```

Then open http://localhost:47291

## Deploy

Works on Vercel. Set `SOLANA_PRIVATE_KEY` and `SOLANA_RPC` in the project's Environment Variables, then deploy. Without them the page loads but launching returns an error.

## How it works

- `POST /api/launch` uploads the image + metadata to pump.fun's IPFS endpoint, builds a `create_v2` instruction with the official `@pump-fun/pump-sdk` (plain SOL-quoted create, no modes), signs it with the deployer keypair plus a fresh mint keypair, and sends it through the Helius RPC.
- `GET /api/launch` returns the deployer address and balance.

No database, no auth, no modes, no mercy.
