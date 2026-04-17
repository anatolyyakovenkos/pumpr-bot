import chalk from "chalk";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) || "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function timestamp(): string {
  return chalk.dim(new Date().toISOString().slice(11, 23));
}

export const logger = {
  debug(msg: string, ...args: any[]): void {
    if (shouldLog("debug")) {
      console.log(timestamp(), chalk.dim("[DEBUG]"), msg, ...args);
    }
  },

  info(msg: string, ...args: any[]): void {
    if (shouldLog("info")) {
      console.log(timestamp(), chalk.blue("[INFO]"), msg, ...args);
    }
  },

  success(msg: string, ...args: any[]): void {
    if (shouldLog("info")) {
      console.log(timestamp(), chalk.green("[OK]"), chalk.green(msg), ...args);
    }
  },

  warn(msg: string, ...args: any[]): void {
    if (shouldLog("warn")) {
      console.log(timestamp(), chalk.yellow("[WARN]"), chalk.yellow(msg), ...args);
    }
  },

  error(msg: string, ...args: any[]): void {
    if (shouldLog("error")) {
      console.error(timestamp(), chalk.red("[ERROR]"), chalk.red(msg), ...args);
    }
  },

  trade(action: "BUY" | "SELL", symbol: string, sol: number, tx?: string): void {
    const color = action === "BUY" ? chalk.green : chalk.red;
    console.log(
      timestamp(),
      color(`[${action}]`),
      chalk.white(symbol),
      chalk.dim(`${sol.toFixed(4)} SOL`),
      tx ? chalk.dim(`tx:${tx.slice(0, 12)}...`) : ""
    );
  },

  snipe(symbol: string, mint: string): void {
    console.log(
      timestamp(),
      chalk.magenta("[SNIPE]"),
      chalk.white(symbol),
      chalk.dim(mint.slice(0, 16) + "...")
    );
  },
};
