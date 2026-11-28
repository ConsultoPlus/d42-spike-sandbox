import { createStore } from "./notes.js";
import { createPostgresStore } from "./postgres-store.js";

// DATABASE_URL set: PostgreSQL (connection errors propagate, no fallback). Otherwise in memory.
export async function openStore(env) {
  return env.DATABASE_URL ? createPostgresStore(env.DATABASE_URL) : createStore();
}
