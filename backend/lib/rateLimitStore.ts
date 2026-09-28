// A rate-limit store backed by Postgres.
//
// express-rate-limit's default store is per-process memory, which failed two
// ways: a restart cleared every budget (an attacker only has to wait for a
// deploy), and a second instance would double every limit.
import type { Store, IncrementResponse, Options } from 'express-rate-limit';
import { prisma } from './prisma.ts';

export class PrismaRateLimitStore implements Store {
  private windowMs = 60_000;
  /** Part of the Store contract — the library reads it when checking for
   *  double-counted keys, so it stays public. */
  prefix: string;
  /** Counters live in Postgres, so they are shared across instances. */
  localKeys = false;

  constructor(prefix: string) { this.prefix = prefix; }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  /** Requests inside the same window share a row, so a counter is one upsert. */
  private windowStart(now = Date.now()): Date {
    return new Date(Math.floor(now / this.windowMs) * this.windowMs);
  }

  async increment(key: string): Promise<IncrementResponse> {
    const windowStart = this.windowStart();
    const resetTime = new Date(windowStart.getTime() + this.windowMs);
    const composite = `${this.prefix}:${key}`;
    try {
      const row = await prisma.rateLimitHit.upsert({
        where: { key_windowStart: { key: composite, windowStart } },
        create: { key: composite, windowStart, count: 1, expiresAt: resetTime },
        update: { count: { increment: 1 } },
        select: { count: true },
      });
      return { totalHits: row.count, resetTime };
    } catch {
      // A limiter that cannot reach the database must not take the site down;
      // it fails open and the next request tries again.
      return { totalHits: 1, resetTime };
    }
  }

  async decrement(key: string): Promise<void> {
    const windowStart = this.windowStart();
    await prisma.rateLimitHit.updateMany({
      where: { key: `${this.prefix}:${key}`, windowStart, count: { gt: 0 } },
      data: { count: { decrement: 1 } },
    }).catch(() => {});
  }

  async resetKey(key: string): Promise<void> {
    await prisma.rateLimitHit.deleteMany({ where: { key: `${this.prefix}:${key}` } }).catch(() => {});
  }
}

/** Drops expired counters. Called from the nightly maintenance job. */
export async function pruneRateLimits(): Promise<number> {
  const { count } = await prisma.rateLimitHit.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}
