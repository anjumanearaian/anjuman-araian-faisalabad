import { PrismaClient } from "@prisma/client";

function normalizeDatabaseUrl(raw?: string) {
  if (!raw) return raw;

  let value = raw.trim();

  // Be tolerant of values pasted from .env examples, e.g.
  // DATABASE_URL="postgresql://..."
  value = value.replace(/^DATABASE_URL\s*=\s*/i, "").trim();

  // Remove one pair of surrounding quotes/backticks if present.
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith("`") && value.endsWith("`"))
  ) {
    value = value.slice(1, -1).trim();
  }

  // Environment-variable values should be a single URL line.
  value = value.replace(/[\r\n]/g, "").trim();

  return value;
}

const rawDatabaseUrl =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

const normalizedDatabaseUrl =
  normalizeDatabaseUrl(rawDatabaseUrl);

if (!normalizedDatabaseUrl) {
  throw new Error(
    "Database connection is not configured"
  );
}

process.env.DATABASE_URL = normalizedDatabaseUrl;
if (normalizedDatabaseUrl) {
  process.env.DATABASE_URL = normalizedDatabaseUrl;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
