# Tasks: Store notes in PostgreSQL, with tags

**Input**: [spec.md](spec.md), [plan.md](plan.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md)
**Rule**: one task = one PR (constitution principle 3). Every task includes its tests; `npm test` passes before the PR.

## Phase 1: Setup

- [ ] T001 Add a `postgres` service container and `DATABASE_URL` env to the `ci` job in `.github/workflows/ci.yml`; `npm test` still runs unchanged (plan: Changes 8). Add `test/ci-env.test.js`: when `process.env.CI === "true"`, assert `DATABASE_URL` is non-empty (otherwise the PostgreSQL tests would skip and CI would pass without them); outside CI it is skipped

## Phase 2: Foundational

- [ ] T002 Make the store interface async with no behaviour change: `src/notes.js` methods `list/get/add` return promises, and `src/app.js` awaits every store call (`GET /notes`, `POST /notes`, `GET /notes/:id`). Existing tests in `test/app.test.js` pass untouched (plan: Changes 2, 5)

## Phase 3: User Story 1 - Notes survive a restart (P1)

**Independent test**: with `DATABASE_URL` set, add a note, open a new store on the same database, read it back; without it, existing tests pass.

- [ ] T003 [US1] Add the `pg` dependency to `package.json` (with lockfile) and create `src/postgres-store.js`: `createPostgresStore(url)` runs `CREATE TABLE IF NOT EXISTS notes (id serial PRIMARY KEY, title text NOT NULL, body text NOT NULL DEFAULT '', tags text[] NOT NULL DEFAULT '{}')`, sets a `connectionTimeoutMillis`, exposes `list/get/add/close`, returns null from `get` for ids above 2147483647, and reuses the existing title check (extract it so both stores share it). Change the `test` script in `package.json` to `node --test --test-concurrency=1`, so PostgreSQL test files do not run in parallel against one table. Add `test/postgres-store.test.js` (skipped with a message when `DATABASE_URL` is unset; `beforeEach` runs `TRUNCATE notes RESTART IDENTITY`): schema created on an empty database, second start leaves data, note added via one store instance is read by a new one, ids increase from 1 on an empty table
- [ ] T004 [US1] Create `src/store.js` `openStore(env)` (`DATABASE_URL` set gives the PostgreSQL store, otherwise `createStore()`; connection errors propagate, no fallback) and change `src/server.js` to `await openStore(process.env)`, pass it to `createApp`, and on error print it and `process.exit(1)` without printing `DATABASE_URL` or its password (print the error message only, and test that the output does not contain the URL). Tests in `test/store.test.js`: no `DATABASE_URL` gives the in-memory store; an unreachable `DATABASE_URL` makes `openStore` reject. Update `README.md` with `DATABASE_URL` only (nothing about tags yet; that is T008)

## Phase 4: User Story 2 - Tag a note (P2)

**Independent test**: POST with valid and invalid `tags`; check status and returned note on both stores.

- [ ] T005 [US2] Create `src/tags.js` `parseTags(value)` and `test/tags.test.js`. Rules verbatim: `undefined` gives `[]`; "at most 5 entries, duplicates counted and kept; order as sent" (assumption following the owner's "count every entry" decision); tag `/^[A-Za-z0-9-]{1,20}$/`, case-sensitive; non-array (including `null`) or non-string entry throws a 400 error (`Object.assign(new Error(...), { status: 400 })`). Cases: 5 ok, 6 rejected, 6 duplicates rejected, 20 chars ok, 21 rejected, empty, `é`, `"a\n"`, `"a b"`, `"Work"` kept as is
- [ ] T006 [US2] Use `parseTags` in `add` of `src/notes.js` and `src/postgres-store.js`; notes become `{ id, title, body, tags }` with `tags: []` when none; the PostgreSQL store writes and reads the `tags` column in order. Write the store-independent POST tests once as a suite over a store factory in `test-support/notes-suite.js` (outside `test/` and not `*.test.js`, so `node --test` does not run it as a test), run for the in-memory store (in `test/app.test.js`) and for PostgreSQL (in `test/postgres-store.test.js`, skipped when `DATABASE_URL` is unset, with the `TRUNCATE ... RESTART IDENTITY` reset): spec User Story 2 scenarios 1-7, including the request's Example 2 (7 tags) expecting 400 and `tags: "x"` expecting 400

## Phase 5: User Story 3 - Find notes by tag (P3)

**Independent test**: add notes with different tags, `GET /notes?tag=…` on both stores.

- [ ] T007 [US3] Add `parseTagQuery(searchParams)` to `src/tags.js` (`undefined` when absent; 400 when `getAll("tag").length > 1`, or the value is empty or not a valid tag), make `list({ tag })` filter by exact equality in `src/notes.js` and `WHERE $1 = ANY(tags)` ordered by `id` in `src/postgres-store.js`, and pass the parsed value from `GET /notes` in `src/app.js`. Add spec User Story 3 scenarios 1-5 to the shared suite in `test-support/notes-suite.js` (both stores), plus a case-sensitivity check (`work` does not match `Work`)

## Phase 6: Polish

- [ ] T008 Update `README.md`: only `tags` on `POST /notes`, `?tag=` on `GET /notes`, `tags` in the note shape, and the breaking changes listed in the spec (every status change in the spec's "Breaking changes" section). Also fix the line "a notes HTTP API on Node 24 with no dependencies", which is false once `pg` is added (T003): say it has one dependency, `pg`, used only when `DATABASE_URL` is set. Do not repeat `DATABASE_URL` docs from T004

## Dependencies

T001 and T002 first (T001 and T002 are independent of each other). T003 needs T001 and T002. T004 needs T003. T005 is independent and can go any time. T006 needs T002, T003 and T005. T007 needs T006. T008 last.

## MVP

T001-T004 (User Story 1).

## Assessment

| Task | Size | Risk | Class | Why |
|---|---|---|---|---|
| T001 | S | high | complex-or-risky | CI infrastructure; `ci` and `factory/gate` must see PostgreSQL |
| T002 | M | medium | complex-or-risky | async store interface touches every route |
| T003 | L | medium | complex-or-risky | new `pg` dependency, schema |
| T004 | M | medium | complex-or-risky | store selection, start-up failure; errors must not leak credentials |
| T005 | S | low | simple | pure validator with unit tests |
| T006 | L | high | complex-or-risky | public contract, persistence |
| T007 | M | high | complex-or-risky | public contract, SQL |
| T008 | S | low | simple | README only |
