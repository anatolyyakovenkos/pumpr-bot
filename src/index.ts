import { Command } from "commander";
import chalk from "chalk";
import { PumprBot } from "./core/bot.js";
import { loadConfig } from "./utils/config.js";

const program = new Command();

program
  .name("pumpr")
  .description(
    "AI-powered Solana trading bot built on the official PumpFun SDK"
  )
  .version("1.0.0");

program
  .command("init")
  .description("Initialize Pumpr Bot with your Solana wallet")
  .option("--network <network>", "Solana network", "mainnet")
  .action(async (opts) => {
    console.log(
      chalk.green("✓"),
      `Initializing Pumpr Bot on ${opts.network}...`
    );
    const config = loadConfig();
    const bot = new PumprBot(config);
    await bot.initialize();
    console.log(chalk.green("✓"), "Pumpr Bot ready.");
  });

program
  .command("launch")
  .description("Launch a new token on PumpFun")
  .requiredOption("--name <name>", "Token name")
  .requiredOption("--ticker <ticker>", "Token ticker symbol")
  .option("--description <desc>", "Token description", "")
  .option("--image <path>", "Path to token image")
  .option("--buy <amount>", "Initial buy amount in SOL", "0.1")
  .action(async (opts) => {
    const config = loadConfig();
    const bot = new PumprBot(config);
    await bot.initialize();
    await bot.launchToken({
      name: opts.name,
      symbol: opts.ticker,
      description: opts.description,
      imagePath: opts.image,
      initialBuySOL: parseFloat(opts.buy),
    });
  });

program
  .command("buy")
  .description("Buy a PumpFun token")
  .argument("<mint>", "Token mint address")
  .option("--sol <amount>", "Amount of SOL to spend", "0.1")
  .option("--slippage <bps>", "Slippage in basis points", "200")
  .action(async (mint, opts) => {
    const config = loadConfig();
    const bot = new PumprBot(config);
    await bot.initialize();
    await bot.buy(mint, parseFloat(opts.sol), parseInt(opts.slippage));
  });

program
  .command("sell")
  .description("Sell a PumpFun token")
  .argument("<mint>", "Token mint address")
  .option("--amount <amount>", "Token amount to sell (or 'all')", "all")
  .option("--slippage <bps>", "Slippage in basis points", "200")
  .action(async (mint, opts) => {
    const config = loadConfig();
    const bot = new PumprBot(config);
    await bot.initialize();
    await bot.sell(mint, opts.amount, parseInt(opts.slippage));
  });

program
  .command("snipe")
  .description("Snipe new PumpFun token launches in real-time")
  .option("--buy <amount>", "Auto-buy amount in SOL", "0.05")
  .option("--slippage <bps>", "Slippage in basis points", "500")
  .action(async (opts) => {
    const config = loadConfig();
    const bot = new PumprBot(config);
    await bot.initialize();
    await bot.startSniper({
      buyAmountSOL: parseFloat(opts.buy),
      slippageBps: parseInt(opts.slippage),
    });
  });

program
  .command("portfolio")
  .description("View your PumpFun token portfolio")
  .action(async () => {
    const config = loadConfig();
    const bot = new PumprBot(config);
    await bot.initialize();
    await bot.showPortfolio();
  });

program
  .command("agent")
  .description("Start the AI trading agent")
  .option("--strategy <name>", "Trading strategy", "momentum")
  .option("--max-position <sol>", "Max position size in SOL", "1.0")
  .action(async (opts) => {
    const config = loadConfig();
    const bot = new PumprBot(config);
    await bot.initialize();
    await bot.startAgent({
      strategy: opts.strategy,
      maxPositionSOL: parseFloat(opts.maxPosition),
    });
  });

program.parse();
