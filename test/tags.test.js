import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTags, parseTagQuery } from "../src/tags.js";

const rejects = (value) => assert.throws(() => parseTags(value), (e) => e.status === 400);

test("undefined gives []", () => assert.deepEqual(parseTags(undefined), []));
test("5 tags ok, order kept", () => assert.deepEqual(parseTags(["e", "d", "c", "b", "a"]), ["e", "d", "c", "b", "a"]));
test("6 tags rejected", () => rejects(["a", "b", "c", "d", "e", "f"]));
test("6 duplicates rejected", () => rejects(["a", "a", "a", "a", "a", "a"]));
test("duplicates within 5 are kept", () => assert.deepEqual(parseTags(["a", "a"]), ["a", "a"]));
test("20 chars ok, 21 rejected", () => {
  assert.deepEqual(parseTags(["x".repeat(20)]), ["x".repeat(20)]);
  rejects(["x".repeat(21)]);
});
test("empty, non-ASCII, newline and space rejected", () => {
  for (const t of ["", "é", "a\n", "a b"]) rejects([t]);
});
test("Work is kept as is", () => assert.deepEqual(parseTags(["Work"]), ["Work"]));
test("non-array (including null) rejected", () => {
  for (const v of ["x", null, 1, {}]) rejects(v);
});
test("non-string entry rejected", () => {
  for (const v of [[1], [null], [["a"]]]) rejects(v);
});

const q = (s) => new URLSearchParams(s);
test("parseTagQuery", () => {
  assert.equal(parseTagQuery(q("")), undefined);
  assert.equal(parseTagQuery(q("tag=Work")), "Work");
  for (const s of ["tag=", "tag=a%20b", "tag=a%0A", "tag=a&tag=b", "tag=a&tag=a"]) {
    assert.throws(() => parseTagQuery(q(s)), (e) => e.status === 400, s);
  }
});
