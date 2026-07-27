import { serve } from "@hono/node-server";
import pg from "pg";
import { createApp } from "./app.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Calora needs a Postgres connection string; a " +
      "free Neon or Supabase tier is ample.",
  );
}

const pool = new pg.Pool({ connectionString });
const port = Number(process.env.PORT ?? 3000);

serve({ fetch: createApp(pool).fetch, port }, ({ port: boundPort }) => {
  console.log(`Calora API listening on http://localhost:${boundPort}`);
});
