import pg from "pg";
import { parseTitle } from "./notes.js";
import { parseTags } from "./tags.js";

const MAX_ID = 2147483647;

const toNote = ({ id, title, body, tags }) => ({ id, title, body, tags });

export async function createPostgresStore(url) {
  const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 5000 });
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS notes (
         id serial PRIMARY KEY,
         title text NOT NULL,
         body text NOT NULL DEFAULT '',
         tags text[] NOT NULL DEFAULT '{}'
       )`,
    );
  } catch (err) {
    await pool.end().catch(() => {});
    throw err;
  }
  return {
    async list({ tag } = {}) {
      const { rows } = tag === undefined
        ? await pool.query("SELECT id, title, body, tags FROM notes ORDER BY id")
        : await pool.query("SELECT id, title, body, tags FROM notes WHERE $1 = ANY(tags) ORDER BY id", [tag]);
      return rows.map(toNote);
    },
    async get(id) {
      if (id > MAX_ID) return null;
      const { rows } = await pool.query("SELECT id, title, body, tags FROM notes WHERE id = $1", [id]);
      return rows[0] ? toNote(rows[0]) : null;
    },
    async add({ title, body = "", tags } = {}) {
      const clean = parseTitle(title);
      const list = parseTags(tags);
      const { rows } = await pool.query(
        "INSERT INTO notes (title, body, tags) VALUES ($1, $2, $3) RETURNING id, title, body, tags",
        [clean, String(body), list],
      );
      return toNote(rows[0]);
    },
    close: () => pool.end(),
  };
}
