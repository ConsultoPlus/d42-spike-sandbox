// Store-independent behaviour (spec FR-005 to FR-012), run once per store.
// Not under test/ and not *.test.js, so `node --test` does not run it by itself.
import { describe, test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";

// open(): returns a fresh, empty store (with an optional close()).
export function notesSuite(name, open) {
  describe(name, () => {
    let store, server, base;
    beforeEach(async () => {
      store = await open();
      server = createApp(store);
      await new Promise((r) => server.listen(0, r));
      base = `http://localhost:${server.address().port}`;
    });
    afterEach(async () => {
      await new Promise((r) => server.close(r));
      await store.close?.();
    });

    const post = (body) => fetch(`${base}/notes`, { method: "POST", body: JSON.stringify(body) });
    const withTags = (tags) => post({ title: "t", tags });
    const listTag = async (query) => {
      const res = await fetch(`${base}/notes${query}`);
      return { status: res.status, body: await res.json() };
    };

    // User Story 2
    test("tags are stored and returned as sent", async () => {
      const res = await withTags(["work", "q4-plan"]);
      assert.equal(res.status, 201);
      const note = await res.json();
      assert.deepEqual(note.tags, ["work", "q4-plan"]);
      assert.deepEqual(await (await fetch(`${base}/notes/${note.id}`)).json(), note);
    });

    test("no tags gives []", async () => {
      const res = await post({ title: "t" });
      assert.equal(res.status, 201);
      assert.deepEqual((await res.json()).tags, []);
    });

    test("6 or more tags are rejected, 5 are accepted", async () => {
      assert.equal((await withTags(["a", "b", "c", "d", "e"])).status, 201);
      assert.equal((await withTags(["a", "b", "c", "d", "e", "f"])).status, 400);
      assert.equal((await withTags(["a", "b", "c", "d", "e", "f", "g"])).status, 400); // request's Example 2
    });

    test("duplicates count and are kept", async () => {
      assert.equal((await withTags(["a", "a", "a", "a", "a", "a"])).status, 400);
      const res = await withTags(["b", "a", "b"]);
      assert.equal(res.status, 201);
      assert.deepEqual((await res.json()).tags, ["b", "a", "b"]);
    });

    test("invalid tags are rejected", async () => {
      for (const tag of ["", "x".repeat(21), "é", "a b", "a\n", "a_b"]) {
        assert.equal((await withTags([tag])).status, 400, JSON.stringify(tag));
      }
      assert.equal((await withTags(["x".repeat(20)])).status, 201);
    });

    test("tags must be an array of strings", async () => {
      for (const tags of ["x", null, 5, {}, [1], [null], [["a"]]]) {
        assert.equal((await withTags(tags)).status, 400, JSON.stringify(tags));
      }
    });

    test("tags are case-sensitive and returned as stored", async () => {
      const res = await withTags(["Work"]);
      assert.deepEqual((await res.json()).tags, ["Work"]);
    });

    // User Story 3
    test("?tag= returns only notes with that tag", async () => {
      await post({ title: "a", tags: ["work"] });
      await post({ title: "b", tags: ["home"] });
      await post({ title: "c", tags: ["home", "work"] });
      const { status, body } = await listTag("?tag=work");
      assert.equal(status, 200);
      assert.deepEqual(body.map((n) => n.title), ["a", "c"]);
    });

    test("?tag= with no match is 200 and []", async () => {
      await post({ title: "a", tags: ["work"] });
      assert.deepEqual(await listTag("?tag=none"), { status: 200, body: [] });
    });

    test("?tag= invalid or empty is 400", async () => {
      for (const q of ["?tag=", "?tag=a%20b", "?tag=a%0A", `?tag=${"x".repeat(21)}`, "?tag=%C3%A9"]) {
        assert.equal((await listTag(q)).status, 400, q);
      }
    });

    test("repeated tag is 400", async () => {
      assert.equal((await listTag("?tag=a&tag=b")).status, 400);
    });

    test("no tag lists all notes", async () => {
      await post({ title: "a", tags: ["work"] });
      await post({ title: "b" });
      const { status, body } = await listTag("");
      assert.equal(status, 200);
      assert.equal(body.length, 2);
    });

    test("explicit empty tags and a lone '-' are valid; list includes tags", async () => {
      const empty = await withTags([]);
      assert.equal(empty.status, 201);
      assert.deepEqual((await empty.json()).tags, []);
      assert.equal((await withTags(["-"])).status, 201);
      const { body } = await listTag("");
      assert.deepEqual(body.map((n) => n.tags), [[], ["-"]]);
    });

    test("a rejected POST stores nothing", async () => {
      await withTags(["a", "b", "c", "d", "e", "f"]);
      assert.deepEqual((await listTag("")).body, []);
    });

    test("duplicate tags on a note match the filter once", async () => {
      await post({ title: "a", tags: ["x", "x"] });
      assert.equal((await listTag("?tag=x")).body.length, 1);
    });

    test("the tag filter is case-sensitive", async () => {
      await post({ title: "a", tags: ["Work"] });
      assert.deepEqual((await listTag("?tag=work")).body, []);
      assert.equal((await listTag("?tag=Work")).body.length, 1);
    });
  });
}
