import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import chalk from "chalk";
import ora from "ora";

interface TokenHolding {
  mint: string;
  balance: number;
  decimals: number;
}

export class PortfolioTracker {
  private connection: Connection;
  private wallet: Keypair;

  constructor(connection: Connection, wallet: Keypair) {
    this.connection = connection;
    this.wallet = wallet;
  }

  async display(): Promise<void> {
    const spinner = ora("Fetching portfolio...").start();

    try {
      // Get SOL balance
      const solBalance = await this.connection.getBalance(this.wallet.publicKey);
      const solBalanceDisplay = (solBalance / LAMPORTS_PER_SOL).toFixed(4);

      // Get all token accounts
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.wallet.publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      const holdings: TokenHolding[] = tokenAccounts.value
        .map((account) => {
          const parsed = account.account.data.parsed.info;
          return {
            mint: parsed.mint,
            balance: parsed.tokenAmount.uiAmount,
            decimals: parsed.tokenAmount.decimals,
          };
        })
        .filter((h) => h.balance > 0);

      spinner.stop();

      console.log(chalk.green("\n═══════════════════════════════════════"));
      console.log(chalk.green.bold("  PUMPR BOT — PORTFOLIO"));
      console.log(chalk.green("═══════════════════════════════════════\n"));

      console.log(
        chalk.white("  Wallet: "),
        chalk.dim(this.wallet.publicKey.toBase58())
      );
      console.log(
        chalk.white("  SOL:    "),
        chalk.green.bold(`${solBalanceDisplay} SOL`)
      );
      console.log();

      if (holdings.length === 0) {
        console.log(chalk.dim("  No token holdings found."));
      } else {
        console.log(
          chalk.dim("  ─────────────────────────────────────────────")
        );
        console.log(
          chalk.dim("  Mint                                     Balance")
        );
        console.log(
          chalk.dim("  ─────────────────────────────────────────────")
        );

        for (const h of holdings) {
          const mintShort = h.mint.slice(0, 16) + "...";
          console.log(
            `  ${chalk.white(mintShort.padEnd(40))} ${chalk.green(h.balance.toLocaleString())}`
          );
        }
      }

      console.log(chalk.green("\n═══════════════════════════════════════\n"));

      // Fetch prices from PumpFun API for known tokens
      await this.fetchPrices(holdings);
    } catch (err) {
      spinner.fail("Failed to fetch portfolio");
      throw err;
    }
  }

  private async fetchPrices(holdings: TokenHolding[]): Promise<void> {
    for (const holding of holdings.slice(0, 10)) {
      try {
        const resp = await fetch(
          `https://frontend-api-v3.pump.fun/coins/${holding.mint}`
        );
        if (resp.ok) {
          const data = await resp.json();
          if (data.market_cap) {
            console.log(
              chalk.dim(`  ${holding.mint.slice(0, 12)}... `),
              chalk.white(`MC: $${Number(data.market_cap).toLocaleString()}`),
              data.name ? chalk.dim(`(${data.name})`) : ""
            );
          }
        }
      } catch {
        // API not available, skip
      }
    }
  }
}
