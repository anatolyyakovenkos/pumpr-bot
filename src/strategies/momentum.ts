import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { PumpFunSDK } from "pumpdotfun-sdk";
import chalk from "chalk";
import { PumprConfig, AgentOptions } from "../utils/config.js";

interface TokenState {
  mint: string;
  entryPrice: number;
  solInvested: number;
  buyTime: number;
}

export class MomentumStrategy {
  private sdk: PumpFunSDK;
  private wallet: Keypair;
  private config: PumprConfig;
  private positions = new Map<string, TokenState>();
  private totalInvested = 0;

  constructor(sdk: PumpFunSDK, wallet: Keypair, config: PumprConfig) {
    this.sdk = sdk;
    this.wallet = wallet;
    this.config = config;
  }

  async run(opts: AgentOptions): Promise<void> {
    console.log(chalk.green("\n🤖 Momentum strategy active\n"));

    // Track volume on new tokens
    const volumeTracker = new Map<string, { buys: number; volume: number; firstSeen: number }>();

    this.sdk.addEventListener("tradeEvent", async (event: any) => {
      const mint = event.mint.toBase58();
      const solAmt = Number(event.solAmount) / LAMPORTS_PER_SOL;

      if (!volumeTracker.has(mint)) {
        volumeTracker.set(mint, { buys: 0, volume: 0, firstSeen: Date.now() });
      }

      const tracker = volumeTracker.get(mint)!;
      if (event.isBuy) tracker.buys++;
      tracker.volume += solAmt;

      // Momentum signal: 5+ buys and 2+ SOL volume in first 30 seconds
      const age = (Date.now() - tracker.firstSeen) / 1000;
      if (
        age < 30 &&
        tracker.buys >= 5 &&
        tracker.volume >= 2 &&
        !this.positions.has(mint) &&
        this.totalInvested < opts.maxPositionSOL
      ) {
        await this.enterPosition(mint, opts);
      }

      // Take profit: sell if we see heavy sell pressure on our positions
      if (!event.isBuy && this.positions.has(mint)) {
        const position = this.positions.get(mint)!;
        const holdTime = (Date.now() - position.buyTime) / 1000;

        // Sell after 60 seconds if there's sell pressure
        if (holdTime > 60) {
          await this.exitPosition(mint);
        }
      }
    });

    // Cleanup stale entries every 60 seconds
    setInterval(() => {
      const now = Date.now();
      for (const [mint, data] of volumeTracker) {
        if (now - data.firstSeen > 120_000) {
          volumeTracker.delete(mint);
        }
      }
    }, 60_000);

    console.log(chalk.dim("  Listening for momentum signals...\n"));
    await new Promise(() => {});
  }

  private async enterPosition(mint: string, opts: AgentOptions): Promise<void> {
    const buyAmount = Math.min(0.1, opts.maxPositionSOL - this.totalInvested);
    console.log(
      chalk.green(`  📈 MOMENTUM BUY`),
      chalk.dim(mint.slice(0, 12) + "..."),
      chalk.white(`${buyAmount} SOL`)
    );

    try {
      const lamports = BigInt(Math.floor(buyAmount * LAMPORTS_PER_SOL));
      await this.sdk.buy(
        this.wallet,
        new PublicKey(mint),
        lamports,
        BigInt(500),
        {
          unitLimit: this.config.priorityFeeUnitLimit,
          unitPrice: this.config.priorityFeeUnitPrice,
        }
      );

      this.positions.set(mint, {
        mint,
        entryPrice: 0, // Would need price oracle for real entry price
        solInvested: buyAmount,
        buyTime: Date.now(),
      });
      this.totalInvested += buyAmount;

      console.log(chalk.green(`  ✓ Position opened`));
    } catch (err: any) {
      console.log(chalk.red(`  ✗ Buy failed: ${err.message}`));
    }
  }

  private async exitPosition(mint: string): Promise<void> {
    const position = this.positions.get(mint);
    if (!position) return;

    console.log(
      chalk.yellow(`  📉 SELLING`),
      chalk.dim(mint.slice(0, 12) + "...")
    );

    try {
      // Get token balance and sell all
      const { getAssociatedTokenAddress } = await import("@solana/spl-token");
      const ata = await getAssociatedTokenAddress(
        new PublicKey(mint),
        this.wallet.publicKey
      );
      const balance = await this.sdk.connection.getTokenAccountBalance(ata);
      const tokenAmount = BigInt(balance.value.amount);

      if (tokenAmount > 0n) {
        await this.sdk.sell(
          this.wallet,
          new PublicKey(mint),
          tokenAmount,
          BigInt(300),
          {
            unitLimit: this.config.priorityFeeUnitLimit,
            unitPrice: this.config.priorityFeeUnitPrice,
          }
        );
        console.log(chalk.green(`  ✓ Position closed`));
      }

      this.totalInvested -= position.solInvested;
      this.positions.delete(mint);
    } catch (err: any) {
      console.log(chalk.red(`  ✗ Sell failed: ${err.message}`));
    }
  }
}
