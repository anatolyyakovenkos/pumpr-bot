/**
 * Standalone sniper — monitors PumpFun for new launches and
 * auto-buys tokens that pass configured filters.
 *
 * Usage:
 *   npx tsx src/commands/snipe.ts [--buy 0.05] [--slippage 500]
 */

import { PumprBot } from "../core/bot.js";
import { loadConfig } from "../utils/config.js";

const args = process.argv.slice(2);

function getArg(name: string, fallback: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : fallback;
}

async function main() {
  const config = loadConfig();
  const bot = new PumprBot(config);
  await bot.initialize();
  await bot.startSniper({
    buyAmountSOL: parseFloat(getArg("buy", "0.05")),
    slippageBps: parseInt(getArg("slippage", "500")),
  });
}

main().catch(console.error);
