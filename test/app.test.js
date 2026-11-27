import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";

let server, base;
before(async () => {
  server = createApp();
  await new Promise((r) => server.listen(0, r));
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

const post = (body) => fetch(`${base}/notes`, { method: "POST", body: JSON.stringify(body) });

test("health", async () => {
  assert.deepEqual(await (await fetch(`${base}/health`)).json(), { ok: true });
});

test("add and read a note", async () => {
  const res = await post({ title: " First ", body: "hello" });
  assert.equal(res.status, 201);
  const note = await res.json();
  assert.equal(note.title, "First");
  assert.deepEqual(await (await fetch(`${base}/notes/${note.id}`)).json(), note);
});

test("a note needs a title", async () => {
  assert.equal((await post({ body: "no title" })).status, 400);
});

test("unknown note is 404", async () => {
  assert.equal((await fetch(`${base}/notes/999`)).status, 404);
});
