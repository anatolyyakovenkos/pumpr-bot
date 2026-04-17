import { PublicKey } from "@solana/web3.js";

export interface VolumeSignal {
  mint: string;
  totalBuys: number;
  totalSells: number;
  netVolume: number;
  uniqueBuyers: Set<string>;
  firstSeen: number;
  lastTrade: number;
}

/**
 * Filters tokens by real-time volume activity on PumpFun.
 * Used by the sniper and agent modes to identify tokens
 * with genuine organic interest vs. wash trading.
 */
export class VolumeFilter {
  private signals = new Map<string, VolumeSignal>();

  /**
   * Record a trade and update the volume signal for a token.
   */
  recordTrade(
    mint: string,
    solAmount: number,
    isBuy: boolean,
    trader: string
  ): void {
    if (!this.signals.has(mint)) {
      this.signals.set(mint, {
        mint,
        totalBuys: 0,
        totalSells: 0,
        netVolume: 0,
        uniqueBuyers: new Set(),
        firstSeen: Date.now(),
        lastTrade: Date.now(),
      });
    }

    const signal = this.signals.get(mint)!;
    signal.lastTrade = Date.now();

    if (isBuy) {
      signal.totalBuys++;
      signal.netVolume += solAmount;
      signal.uniqueBuyers.add(trader);
    } else {
      signal.totalSells++;
      signal.netVolume -= solAmount;
    }
  }

  /**
   * Check if a token passes volume quality filters.
   * Returns true if the token shows signs of organic buying.
   */
  passesFilter(
    mint: string,
    opts: {
      minBuys?: number;
      minUniqueBuyers?: number;
      minNetVolume?: number;
      maxAgeSeconds?: number;
      minBuyToSellRatio?: number;
    } = {}
  ): boolean {
    const signal = this.signals.get(mint);
    if (!signal) return false;

    const {
      minBuys = 3,
      minUniqueBuyers = 2,
      minNetVolume = 0.5,
      maxAgeSeconds = 60,
      minBuyToSellRatio = 2,
    } = opts;

    const ageSeconds = (Date.now() - signal.firstSeen) / 1000;

    // Must be recent
    if (ageSeconds > maxAgeSeconds) return false;

    // Must have enough buys
    if (signal.totalBuys < minBuys) return false;

    // Must have enough unique buyers (anti-wash)
    if (signal.uniqueBuyers.size < minUniqueBuyers) return false;

    // Net volume must be positive and above threshold
    if (signal.netVolume < minNetVolume) return false;

    // Buy-to-sell ratio check
    if (signal.totalSells > 0) {
      const ratio = signal.totalBuys / signal.totalSells;
      if (ratio < minBuyToSellRatio) return false;
    }

    return true;
  }

  /**
   * Get top tokens by volume signal strength.
   */
  getTopSignals(limit: number = 10): VolumeSignal[] {
    return Array.from(this.signals.values())
      .filter((s) => {
        const age = (Date.now() - s.firstSeen) / 1000;
        return age < 300 && s.netVolume > 0;
      })
      .sort((a, b) => {
        // Score by combination of volume, unique buyers, and recency
        const scoreA =
          a.netVolume * a.uniqueBuyers.size * (1 / ((Date.now() - a.lastTrade) / 1000 + 1));
        const scoreB =
          b.netVolume * b.uniqueBuyers.size * (1 / ((Date.now() - b.lastTrade) / 1000 + 1));
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Purge old entries to prevent memory leaks.
   */
  cleanup(maxAgeMs: number = 600_000): void {
    const now = Date.now();
    for (const [mint, signal] of this.signals) {
      if (now - signal.lastTrade > maxAgeMs) {
        this.signals.delete(mint);
      }
    }
  }
}
