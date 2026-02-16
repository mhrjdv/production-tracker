import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { resolve6, resolve4 } from "node:dns";

/**
 * Custom DNS lookup: IPv6 first, IPv4 fallback.
 * Supabase direct connections use IPv6-only hostnames (AAAA records only).
 * Node's default getaddrinfo fails on AAAA-only hosts on some systems.
 */
function ipv6FirstLookup(
  hostname: string,
  options: { all?: boolean; family?: number },
  callback: (
    err: NodeJS.ErrnoException | null,
    address?: string,
    family?: number,
  ) => void,
) {
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

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // `lookup` is supported by pg at runtime but missing from @types/pg
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
    ...({ lookup: ipv6FirstLookup } as Record<string, unknown>),
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
