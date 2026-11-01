import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next.js, so load .env files the same way Next.js
// does in development (.env.development.local wins). On Vercel there are no
// .env files and the real environment variables are used.
loadEnvConfig(process.cwd(), true);

// Migrations need a direct connection: the pooler does not support every
// statement a migration may run.
const url = process.env["DATABASE_URL_UNPOOLED"];

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  // `generate` only diffs the schema and needs no database.
  ...(url !== undefined && url !== "" && { dbCredentials: { url } }),
  strict: true,
  verbose: true,
});
