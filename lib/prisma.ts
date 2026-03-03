import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined.");
}

const adapter = new PrismaPg({ connectionString });
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
