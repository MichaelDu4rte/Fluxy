import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined.");
}

function normalizeConnectionStringForPg(rawConnectionString: string): string {
  const parsedUrl = new URL(rawConnectionString);

  // Let pg ssl config be controlled by Pool options to avoid sslmode/rejectUnauthorized conflicts.
  parsedUrl.searchParams.delete("sslmode");
  parsedUrl.searchParams.delete("sslcert");
  parsedUrl.searchParams.delete("sslkey");
  parsedUrl.searchParams.delete("sslrootcert");

  return parsedUrl.toString();
}

function resolveRejectUnauthorized(connectionUrl: URL): boolean {
  const envValue = process.env.PG_SSL_REJECT_UNAUTHORIZED;

  if (envValue === "true") {
    return true;
  }

  if (envValue === "false") {
    return false;
  }

  // Supabase pooler often presents cert chains that fail strict validation on some runtimes.
  if (connectionUrl.hostname.endsWith(".pooler.supabase.com")) {
    return false;
  }

  return process.env.NODE_ENV === "production";
}

const normalizedConnectionString = normalizeConnectionStringForPg(connectionString);
const connectionUrl = new URL(normalizedConnectionString);
const shouldRejectUnauthorized = resolveRejectUnauthorized(connectionUrl);

const pool = new Pool({
  connectionString: connectionUrl.toString(),
  ssl: { rejectUnauthorized: shouldRejectUnauthorized },
});

const adapter = new PrismaPg(pool);
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function hasFinanceDelegates(client: PrismaClient | undefined): client is PrismaClient {
  if (!client) {
    return false;
  }

  const prismaWithDynamicKeys = client as unknown as Record<string, unknown>;
  return (
    typeof prismaWithDynamicKeys.financialAccount !== "undefined"
    && typeof prismaWithDynamicKeys.financialTransaction !== "undefined"
  );
}

export const prisma = hasFinanceDelegates(globalForPrisma.prisma)
  ? globalForPrisma.prisma
  : new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
