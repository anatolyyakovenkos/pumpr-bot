import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { PumpFunSDK } from "pumpdotfun-sdk";
import chalk from "chalk";
import { PumprConfig, SniperOptions } from "../utils/config.js";

interface CreateEvent {
  name: string;
  symbol: string;
  mint: { toBase58(): string };
  uri: string;
  initialBuy: bigint;
}

interface TradeEvent {
  mint: { toBase58(): string };
  solAmount: bigint;
  tokenAmount: bigint;
  isBuy: boolean;
  user: { toBase58(): string };
}

export class SniperEngine {
  private sdk: PumpFunSDK;
  private wallet: Keypair;
  private config: PumprConfig;
  private sniped = new Set<string>();

  constructor(sdk: PumpFunSDK, wallet: Keypair, config: PumprConfig) {
    this.sdk = sdk;
    this.wallet = wallet;
    this.config = config;
  }

  async start(opts: SniperOptions): Promise<void> {
    let tokenCount = 0;

    // Listen for new token creations
    this.sdk.addEventListener("createEvent", async (event: CreateEvent) => {
      tokenCount++;
      const mintStr = event.mint.toBase58();

      console.log(
        chalk.yellow(`[NEW] #${tokenCount}`),
        chalk.white(event.name),
        chalk.dim(`(${event.symbol})`),
        chalk.dim(mintStr.slice(0, 12) + "...")
      );

      // Check filters
      if (this.sniped.has(mintStr)) return;
      if (!this.passesFilters(event)) return;

      this.sniped.add(mintStr);

      console.log(
        chalk.green(`  ⚡ SNIPING ${event.symbol} with ${opts.buyAmountSOL} SOL`)
      );

      try {
        const lamports = BigInt(
          Math.floor(opts.buyAmountSOL * LAMPORTS_PER_SOL)
        );

        const result = await this.sdk.buy(
          this.wallet,
          event.mint,
          lamports,
          BigInt(opts.slippageBps),
          {
            unitLimit: this.config.priorityFeeUnitLimit,
            unitPrice: this.config.priorityFeeUnitPrice,
          }
        );

        console.log(
          chalk.green(`  ✓ Sniped ${event.symbol}!`),
          chalk.dim(`TX: ${result.signature}`)
        );
      } catch (err: any) {
        console.log(
          chalk.red(`  ✗ Failed to snipe ${event.symbol}:`),
          err.message
        );
      }
    });

    // Listen for trade activity
    this.sdk.addEventListener("tradeEvent", (event: TradeEvent) => {
      if (this.sniped.has(event.mint.toBase58())) {
        const solAmt = Number(event.solAmount) / LAMPORTS_PER_SOL;
        const action = event.isBuy ? chalk.green("BUY") : chalk.red("SELL");
        console.log(
          chalk.dim(`  [TRADE]`),
          action,
          chalk.white(`${solAmt.toFixed(4)} SOL`),
          chalk.dim(`by ${event.user.toBase58().slice(0, 8)}...`)
        );
      }
    });

    console.log(chalk.green("\n🎯 Sniper active. Watching for new launches...\n"));

    // Keep process alive
    await new Promise(() => {});
  }

  private passesFilters(event: CreateEvent): boolean {
    // Filter: skip tokens with very small initial buys (likely rugs)
    const minInitialBuy = BigInt(
      Math.floor((this.config.snipeFilterMinSolInCurve ?? 0) * LAMPORTS_PER_SOL)
    );
    if (event.initialBuy < minInitialBuy) return false;

    // Filter: skip tokens with names that look spammy
    if (event.name.length < 2 || event.symbol.length < 2) return false;

    return true;
  }
}
