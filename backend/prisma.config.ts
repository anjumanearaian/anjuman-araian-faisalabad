import { defineConfig } from "prisma/config";

// Prisma Client generation does not need a live database connection. The fallback
// lets Vercel build a preview before DATABASE_URL is configured. Runtime API calls
// still require the real DATABASE_URL environment variable.
export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
