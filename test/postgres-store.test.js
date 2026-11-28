import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { createPostgresStore } from "../src/postgres-store.js";
import { notesSuite } from "../test-support/notes-suite.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("DATABASE_URL is not set: PostgreSQL tests skipped");
}
const skip = url ? false : "DATABASE_URL is not set";

async function sql(text) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try { return await client.query(text); } finally { await client.end(); }
}
const reset = () => sql("DROP TABLE IF EXISTS notes");
const truncate = () => sql("TRUNCATE notes RESTART IDENTITY");

describe("PostgreSQL store", { skip }, () => {
  test("schema is created on an empty database", async () => {
    await reset();
    const store = await createPostgresStore(url);
    try {
      const { rows } = await sql("SELECT column_name FROM information_schema.columns WHERE table_name = 'notes' ORDER BY ordinal_position");
      assert.deepEqual(rows.map((r) => r.column_name), ["id", "title", "body", "tags"]);
      assert.deepEqual(await store.list(), []);
    } finally { await store.close(); }
  });

  describe("with the table", () => {
    beforeEach(async () => {
      await (await createPostgresStore(url)).close();
      await truncate();
    });

    test("a second start leaves data alone", async () => {
      const a = await createPostgresStore(url);
      await a.add({ title: "kept" });
      await a.close();
      const b = await createPostgresStore(url);
      try { assert.equal((await b.list()).length, 1); } finally { await b.close(); }
    });

    test("a note added through one store is read by a new one", async () => {
      const a = await createPostgresStore(url);
      const note = await a.add({ title: "n", body: "b", tags: ["Work", "x"] });
      await a.close();
      const b = await createPostgresStore(url);
      try { assert.deepEqual(await b.get(note.id), note); } finally { await b.close(); }
    });

    test("ids increase from 1", async () => {
      const s = await createPostgresStore(url);
      try {
        assert.equal((await s.add({ title: "a" })).id, 1);
        assert.equal((await s.add({ title: "b" })).id, 2);
      } finally { await s.close(); }
    });

    test("an id above the integer range is null", async () => {
      const s = await createPostgresStore(url);
      try { assert.equal(await s.get(2147483648), null); } finally { await s.close(); }
    });
  });
});

if (url) {
  notesSuite("PostgreSQL store (shared suite)", async () => {
    await (await createPostgresStore(url)).close(); // ensure the table exists
    await truncate();
    return createPostgresStore(url);
  });
}
