/**
 * Standalone trade command — buy or sell PumpFun tokens.
 *
 * Usage:
 *   npx tsx src/commands/trade.ts buy <mint> --sol 0.5
 *   npx tsx src/commands/trade.ts sell <mint> --amount all
 */

import { PumprBot } from "../core/bot.js";
import { loadConfig } from "../utils/config.js";

const args = process.argv.slice(2);
const action = args[0]; // "buy" or "sell"
const mint = args[1];

if (!action || !mint || !["buy", "sell"].includes(action)) {
  console.error("Usage: trade <buy|sell> <mint> [--sol <amount>] [--amount <amount>] [--slippage <bps>]");
  process.exit(1);
}

function getArg(name: string, fallback: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : fallback;
}

async function main() {
  const config = loadConfig();
  const bot = new PumprBot(config);
  await bot.initialize();

  if (action === "buy") {
    await bot.buy(
      mint,
      parseFloat(getArg("sol", "0.1")),
      parseInt(getArg("slippage", "200"))
    );
  } else {
    await bot.sell(
      mint,
      getArg("amount", "all"),
      parseInt(getArg("slippage", "200"))
    );
  }
}

main().catch(console.error);
