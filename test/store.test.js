import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { openStore } from "../src/store.js";

test("no DATABASE_URL gives the in-memory store", async () => {
  const store = await openStore({});
  const note = await store.add({ title: "n" });
  assert.deepEqual(await store.get(note.id), note);
  assert.equal(store.close, undefined);
});

// Port 1 on localhost: nothing listens, connection refused.
const unreachable = "postgres://app:s3cretpw@127.0.0.1:1/app";

test("an unreachable DATABASE_URL makes openStore reject", async () => {
  await assert.rejects(openStore({ DATABASE_URL: unreachable }));
});

test("server start-up fails, exits 1 and does not print the URL or password", async () => {
  const child = spawn(process.execPath, ["src/server.js"], {
    env: { ...process.env, DATABASE_URL: unreachable, PORT: "0" },
  });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (out += d));
  const code = await new Promise((r) => child.on("close", r));
  assert.equal(code, 1);
  assert.notEqual(out, "");
  assert.ok(!out.includes(unreachable));
  assert.ok(!out.includes("s3cretpw"));
});
