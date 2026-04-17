# Pumpr Bot

**AI-powered Solana trading bot built on the official [PumpFun SDK](https://github.com/nicknguyen-cs/pumpdotfun-sdk).** Forked from [Bankr Bot](https://bankr.bot) and rebuilt from scratch for Solana.

Launch tokens, buy, sell, snipe new launches, and run autonomous AI trading agents — all directly on PumpFun's bonding curve.

---

## Features

- **Token Launching** — Deploy tokens on PumpFun's bonding curve with one command. Name, ticker, image, description, initial buy.
- **Buy & Sell** — Trade any PumpFun token with SOL. Configurable slippage and priority fees.
- **Real-Time Sniper** — Monitor PumpFun for new token launches and auto-buy based on filters (volume, unique buyers, dev wallet).
- **AI Agent Mode** — Autonomous trading agent with momentum strategy. Monitors on-chain activity and enters/exits positions automatically.
- **Portfolio Tracker** — View all holdings with live market data from the PumpFun API.
- **Volume Filter Engine** — Anti-wash-trade detection with unique buyer tracking, buy/sell ratio analysis, and net volume scoring.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Chain | Solana (Mainnet / Devnet) |
| SDK | [pumpdotfun-sdk](https://github.com/nicknguyen-cs/pumpdotfun-sdk) |
| Framework | [Anchor](https://www.anchor-lang.com/) |
| Runtime | Node.js + TypeScript |
| Wallet | Solana Keypair / Phantom export |

## Quick Start

```bash
# Clone the repo
git clone https://github.com/anatolyyakovenkos/pumpr-bot.git
cd pumpr-bot

# Install dependencies
npm install

# Configure your wallet and RPC
cp .env.example .env
# Edit .env with your private key and RPC URL

# Launch a token
npm run launch -- --name "My Token" --ticker "$MYTKN" --buy 0.1

# Buy a token
npm run trade -- buy <MINT_ADDRESS> --sol 0.5

# Sell all of a token
npm run trade -- sell <MINT_ADDRESS> --amount all

# Start the sniper
npm run snipe -- --buy 0.05 --slippage 500

# View portfolio
npm run portfolio
```

## CLI Usage

```
pumpr <command> [options]

Commands:
  init          Initialize Pumpr Bot with your Solana wallet
  launch        Launch a new token on PumpFun
  buy <mint>    Buy a PumpFun token
  sell <mint>   Sell a PumpFun token
  snipe         Snipe new PumpFun token launches
  portfolio     View your token portfolio
  agent         Start the AI trading agent

Options:
  --network     Solana network (mainnet/devnet)
  --sol         Amount of SOL for trades
  --slippage    Slippage in basis points
  --strategy    AI agent strategy (momentum)
```

## SDK Integration

Pumpr Bot uses the official PumpFun TypeScript SDK for all on-chain interactions:

```typescript
import { PumpFunSDK } from "pumpdotfun-sdk";
import { Connection, Keypair } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const wallet = Keypair.fromSecretKey(yourKey);
const provider = new AnchorProvider(connection, new Wallet(wallet));
const sdk = new PumpFunSDK(provider);

// Launch a token
const mint = Keypair.generate();
await sdk.createAndBuy(wallet, mint, {
  name: "Pumpr Token",
  symbol: "$PUMPR",
  description: "Launched via Pumpr Bot",
  file: imageBlob,
}, 0.1e9, 100n);

// Buy tokens
await sdk.buy(wallet, mintAddress, 0.5e9, 200n);

// Listen for new launches
sdk.addEventListener("createEvent", (event) => {
  console.log(`New: ${event.name} (${event.symbol})`);
});
```

## Project Structure

```
pumpr-bot/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── core/
│   │   ├── bot.ts            # Main bot class — init, launch, buy, sell
│   │   ├── sniper.ts         # Real-time PumpFun launch sniper
│   │   └── portfolio.ts      # Portfolio tracking & display
│   ├── strategies/
│   │   ├── momentum.ts       # Momentum-based AI trading strategy
│   │   └── volume-filter.ts  # Volume analysis & wash trade detection
│   ├── commands/
│   │   ├── launch.ts         # Standalone launch command
│   │   ├── snipe.ts          # Standalone sniper command
│   │   ├── trade.ts          # Standalone buy/sell command
│   │   └── portfolio.ts      # Standalone portfolio viewer
│   └── utils/
│       ├── config.ts         # Environment config loader
│       └── logger.ts         # Structured logging
├── index.html                # Landing page
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

## Configuration

All configuration is done via environment variables. Copy `.env.example` to `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `SOLANA_RPC_URL` | Solana RPC endpoint | mainnet-beta |
| `WALLET_PRIVATE_KEY` | Base58 encoded private key | — |
| `DEFAULT_SLIPPAGE_BPS` | Default slippage (basis points) | 200 |
| `DEFAULT_BUY_AMOUNT_SOL` | Default buy amount | 0.1 SOL |
| `PRIORITY_FEE_UNIT_LIMIT` | Compute unit limit | 250000 |
| `PRIORITY_FEE_UNIT_PRICE` | Compute unit price | 250000 |
| `SNIPE_BUY_AMOUNT_SOL` | Sniper buy amount | 0.05 SOL |
| `SNIPE_MAX_SLIPPAGE_BPS` | Sniper max slippage | 500 |

## How It Works

1. **Connect** — Connects to Solana via RPC, loads your wallet keypair, initializes the PumpFun SDK with an Anchor provider.

2. **Trade** — Executes buys/sells through PumpFun's on-chain program. Tokens trade on a bonding curve until they graduate to Raydium.

3. **Snipe** — Subscribes to PumpFun's `createEvent` and `tradeEvent` streams. When a new token passes filters (volume, unique buyers, name quality), it auto-buys.

4. **AI Agent** — The momentum strategy tracks real-time trade volume. When a token shows strong early buying momentum (5+ buys, 2+ SOL volume in 30 seconds from multiple wallets), it enters. Exits on sell pressure after 60 seconds.

## Forked From

This project is a Solana fork of [Bankr Bot](https://bankr.bot), which originally operated on Base. Pumpr Bot replaces the Base/EVM stack with Solana and the official PumpFun SDK for native bonding curve interaction.

## License

MIT
