/**
 * Standalone launch command — creates and deploys a new token
 * on PumpFun's bonding curve via the official SDK.
 *
 * Usage:
 *   npx tsx src/commands/launch.ts --name "My Token" --ticker "$MYTKN"
 */

import { PumprBot } from "../core/bot.js";
import { loadConfig } from "../utils/config.js";

const args = process.argv.slice(2);
const nameIdx = args.indexOf("--name");
const tickerIdx = args.indexOf("--ticker");

if (nameIdx === -1 || tickerIdx === -1) {
  console.error("Usage: launch --name <name> --ticker <ticker> [--buy <sol>]");
  process.exit(1);
}

const name = args[nameIdx + 1];
const ticker = args[tickerIdx + 1];
const buyIdx = args.indexOf("--buy");
const buyAmount = buyIdx !== -1 ? parseFloat(args[buyIdx + 1]) : 0.1;

async function main() {
  const config = loadConfig();
  const bot = new PumprBot(config);
  await bot.initialize();
  await bot.launchToken({
    name,
    symbol: ticker,
    initialBuySOL: buyAmount,
  });
}

main().catch(console.error);
