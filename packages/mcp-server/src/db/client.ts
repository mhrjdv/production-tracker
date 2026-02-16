import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { resolve6, resolve4 } from "node:dns";

const { Pool } = pg;

/**
 * IPv6-first DNS lookup for Supabase direct connections.
 * Supabase hostnames often resolve only to AAAA records;
 * Node's default getaddrinfo can fail on those.
 */
function ipv6FirstLookup(
  hostname: string,
  _options: { all?: boolean; family?: number },
  callback: (
    err: NodeJS.ErrnoException | null,
    address?: string,
    family?: number,
  ) => void,
): void {
  resolve6(hostname, (err6, addresses6) => {
    if (addresses6 && addresses6.length > 0) {
      return callback(null, addresses6[0], 6);
    }
    resolve4(hostname, (err4, addresses4) => {
      if (addresses4 && addresses4.length > 0) {
        return callback(null, addresses4[0], 4);
      }
      callback(
        err6 ?? err4 ?? new Error(`DNS resolution failed for ${hostname}`),
      );
    });
  });
}

let _prisma: PrismaClient | undefined;

/**
 * Create or reuse a PrismaClient backed by pg Pool with IPv6 DNS.
 * Requires DATABASE_URL environment variable.
 */
export function getPrismaClient(): PrismaClient {
  if (_prisma) return _prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    ...({ lookup: ipv6FirstLookup } as Record<string, unknown>),
  });

  const adapter = new PrismaPg(pool);
  _prisma = new PrismaClient({ adapter });
  return _prisma;
}

/**
 * Disconnect the cached PrismaClient (for graceful shutdown).
 */
export async function disconnectPrisma(): Promise<void> {
  if (_prisma) {
    await _prisma.$disconnect();
    _prisma = undefined;
  }
}
