import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PumpFunSDK } from "pumpdotfun-sdk";
import chalk from "chalk";
import ora from "ora";
import { PumprConfig, LaunchOptions, SniperOptions, AgentOptions } from "../utils/config.js";
import { MomentumStrategy } from "../strategies/momentum.js";
import { SniperEngine } from "./sniper.js";
import { PortfolioTracker } from "./portfolio.js";

export class PumprBot {
  private connection: Connection;
  private wallet: Keypair;
  private sdk!: PumpFunSDK;
  private config: PumprConfig;

  constructor(config: PumprConfig) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl, "confirmed");
    this.wallet = Keypair.fromSecretKey(
      Buffer.from(config.walletPrivateKey, "base64")
    );
  }

  async initialize(): Promise<void> {
    const spinner = ora("Connecting to Solana...").start();
    try {
      const anchorWallet = new Wallet(this.wallet);
      const provider = new AnchorProvider(this.connection, anchorWallet, {
        commitment: "confirmed",
      });
      this.sdk = new PumpFunSDK(provider);

      const balance = await this.connection.getBalance(this.wallet.publicKey);
      spinner.succeed(
        chalk.green(
          `Connected. Wallet: ${this.wallet.publicKey.toBase58().slice(0, 8)}... | Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`
        )
      );
    } catch (err) {
      spinner.fail("Failed to connect");
      throw err;
    }
  }

  async launchToken(opts: LaunchOptions): Promise<void> {
    const spinner = ora(`Launching ${opts.name} (${opts.symbol})...`).start();
    try {
      const mintKeypair = Keypair.generate();
      const buyAmountLamports = BigInt(
        Math.floor((opts.initialBuySOL ?? 0.1) * LAMPORTS_PER_SOL)
      );

      const tokenMetadata = {
        name: opts.name,
        symbol: opts.symbol,
        description: opts.description || `Launched via Pumpr Bot`,
        file: opts.imagePath
          ? await this.loadImageAsBlob(opts.imagePath)
          : await this.generateDefaultImage(opts.symbol),
      };

      const result = await this.sdk.createAndBuy(
        this.wallet,
        mintKeypair,
        tokenMetadata,
        buyAmountLamports,
        BigInt(this.config.defaultSlippageBps),
        {
          unitLimit: this.config.priorityFeeUnitLimit,
          unitPrice: this.config.priorityFeeUnitPrice,
        }
      );

      spinner.succeed(
        chalk.green(`Token launched!
  Name:   ${opts.name} (${opts.symbol})
  Mint:   ${mintKeypair.publicKey.toBase58()}
  TX:     ${result.signature}
  View:   https://pump.fun/${mintKeypair.publicKey.toBase58()}`)
      );
    } catch (err) {
      spinner.fail("Launch failed");
      throw err;
    }
  }

  async buy(
    mintAddress: string,
    solAmount: number,
    slippageBps: number
  ): Promise<void> {
    const spinner = ora(`Buying ${solAmount} SOL of ${mintAddress.slice(0, 8)}...`).start();
    try {
      const mint = new PublicKey(mintAddress);
      const lamports = BigInt(Math.floor(solAmount * LAMPORTS_PER_SOL));

      const result = await this.sdk.buy(
        this.wallet,
        mint,
        lamports,
        BigInt(slippageBps),
        {
          unitLimit: this.config.priorityFeeUnitLimit,
          unitPrice: this.config.priorityFeeUnitPrice,
        }
      );

      spinner.succeed(
        chalk.green(`Bought! TX: ${result.signature}`)
      );
    } catch (err) {
      spinner.fail("Buy failed");
      throw err;
    }
  }

  async sell(
    mintAddress: string,
    amount: string,
    slippageBps: number
  ): Promise<void> {
    const spinner = ora(`Selling ${mintAddress.slice(0, 8)}...`).start();
    try {
      const mint = new PublicKey(mintAddress);
      let tokenAmount: bigint;

      if (amount === "all") {
        tokenAmount = await this.getTokenBalance(mint);
      } else {
        tokenAmount = BigInt(amount);
      }

      const result = await this.sdk.sell(
        this.wallet,
        mint,
        tokenAmount,
        BigInt(slippageBps),
        {
          unitLimit: this.config.priorityFeeUnitLimit,
          unitPrice: this.config.priorityFeeUnitPrice,
        }
      );

      spinner.succeed(chalk.green(`Sold! TX: ${result.signature}`));
    } catch (err) {
      spinner.fail("Sell failed");
      throw err;
    }
  }

  async startSniper(opts: SniperOptions): Promise<void> {
    console.log(chalk.green("⚡ Starting PumpFun sniper..."));
    console.log(chalk.dim(`  Buy amount: ${opts.buyAmountSOL} SOL`));
    console.log(chalk.dim(`  Slippage: ${opts.slippageBps} bps`));

    const sniper = new SniperEngine(this.sdk, this.wallet, this.config);
    await sniper.start(opts);
  }

  async showPortfolio(): Promise<void> {
    const tracker = new PortfolioTracker(this.connection, this.wallet);
    await tracker.display();
  }

  async startAgent(opts: AgentOptions): Promise<void> {
    console.log(chalk.green("🤖 Starting AI trading agent..."));
    console.log(chalk.dim(`  Strategy: ${opts.strategy}`));
    console.log(chalk.dim(`  Max position: ${opts.maxPositionSOL} SOL`));

    const strategy = new MomentumStrategy(this.sdk, this.wallet, this.config);
    await strategy.run(opts);
  }

  private async getTokenBalance(mint: PublicKey): Promise<bigint> {
    const { getAssociatedTokenAddress } = await import("@solana/spl-token");
    const ata = await getAssociatedTokenAddress(mint, this.wallet.publicKey);
    const account = await this.connection.getTokenAccountBalance(ata);
    return BigInt(account.value.amount);
  }

  private async loadImageAsBlob(path: string): Promise<Blob> {
    const fs = await import("fs");
    const buffer = fs.readFileSync(path);
    return new Blob([buffer], { type: "image/png" });
  }

  private async generateDefaultImage(symbol: string): Promise<Blob> {
    // Generate a simple SVG as default token image
    const svg = `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
      <rect width="256" height="256" fill="#0a0a0a"/>
      <circle cx="128" cy="128" r="90" fill="none" stroke="#00FF47" stroke-width="4"/>
      <text x="128" y="140" text-anchor="middle" font-family="Arial" font-size="42" font-weight="bold" fill="#00FF47">${symbol}</text>
    </svg>`;
    return new Blob([svg], { type: "image/svg+xml" });
  }
}
