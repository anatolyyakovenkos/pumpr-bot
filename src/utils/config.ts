import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

dotenvConfig({ path: resolve(process.cwd(), ".env") });

export interface PumprConfig {
  rpcUrl: string;
  walletPrivateKey: string;
  defaultSlippageBps: number;
  defaultBuyAmountSOL: number;
  priorityFeeUnitLimit: number;
  priorityFeeUnitPrice: number;
  snipeFilterMinSolInCurve: number;
  snipeFilterMaxSolInCurve: number;
}

export interface LaunchOptions {
  name: string;
  symbol: string;
  description?: string;
  imagePath?: string;
  initialBuySOL?: number;
}

export interface SniperOptions {
  buyAmountSOL: number;
  slippageBps: number;
}

export interface AgentOptions {
  strategy: string;
  maxPositionSOL: number;
}

export function loadConfig(): PumprConfig {
  return {
    rpcUrl:
      process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
    walletPrivateKey: process.env.WALLET_PRIVATE_KEY || "",
    defaultSlippageBps: parseInt(process.env.DEFAULT_SLIPPAGE_BPS || "200"),
    defaultBuyAmountSOL: parseFloat(
      process.env.DEFAULT_BUY_AMOUNT_SOL || "0.1"
    ),
    priorityFeeUnitLimit: parseInt(
      process.env.PRIORITY_FEE_UNIT_LIMIT || "250000"
    ),
    priorityFeeUnitPrice: parseInt(
      process.env.PRIORITY_FEE_UNIT_PRICE || "250000"
    ),
    snipeFilterMinSolInCurve: parseFloat(
      process.env.SNIPE_FILTER_MIN_SOL_IN_CURVE || "0"
    ),
    snipeFilterMaxSolInCurve: parseFloat(
      process.env.SNIPE_FILTER_MAX_SOL_IN_CURVE || "50"
    ),
  };
}
