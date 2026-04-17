/**
 * Standalone portfolio viewer — shows SOL balance and all
 * PumpFun token holdings with market data.
 *
 * Usage:
 *   npx tsx src/commands/portfolio.ts
 */

import { PumprBot } from "../core/bot.js";
import { loadConfig } from "../utils/config.js";

async function main() {
  const config = loadConfig();
  const bot = new PumprBot(config);
  await bot.initialize();
  await bot.showPortfolio();
}

main().catch(console.error);
