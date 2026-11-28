# Implementation Plan: Store notes in PostgreSQL, with tags

**Branch**: `cr/CR-001-postgres-tags` | **Date**: 2026-11-28 | **Spec**: [spec.md](spec.md)

## Summary

Add tags to notes and an optional PostgreSQL store, chosen at start by `DATABASE_URL`. Both stores share one tag validator and one store interface, which becomes async. A tag filter is added to `GET /notes`. Today the code is `src/app.js` (HTTP routing), `src/notes.js` (in-memory store with `list`, `get`, `add`) and `src/server.js` (start-up).

## Technical Context

**Language/Version**: Node 24, ES modules (`package.json`: `"engines": { "node": ">=24" }`, `"type": "module"`)

**Primary Dependencies**: `pg` (node-postgres), the only runtime dependency. Reason (constitution principle 1): Node has no built-in PostgreSQL client. Today `package.json` has no dependencies.

**Storage**: PostgreSQL when `DATABASE_URL` is set; in-memory `Map` otherwise

**Testing**: `node:test` (`npm test` = `node --test`). Database tests run against a real PostgreSQL given by `DATABASE_URL` (constitution principle 2).

**Target Platform**: Linux server

**Project Type**: web-service

**Performance Goals**: none stated; not a concern for this change

**Constraints**: behaviour of the two stores identical (FR-013)

**Scale/Scope**: five endpoints, a few hundred lines

## Constitution Check

Quoting `.specify/memory/constitution.md`:

- *Small and dependency-light* - one dependency, `pg`, justified above. Pass.
- *Tested* - each task carries its tests; PostgreSQL tests use a real database, so CI needs a PostgreSQL service (task T008). Pass.
- *One change per PR* - tasks are sized one PR each. Pass.
- *Specs first* - spec has no open clarifications. Pass.
- *The API is a contract* - breaking changes are listed in the spec: `tags` on every note, 400 for non-array `tags`, validated `?tag`. Pass.

Re-checked after design: no change.

## Design

### Code as it is now, and what changes

- `src/notes.js`: `add({ title, body = "" })` ignores everything else in the body, which is why `tags: "x"` returns 201 today. `add` validates the title and throws `Object.assign(new Error(...), { status: 400 })`. The error convention stays: `app.js` catch sends `err.status` and `err.message`.
- `src/app.js`: `GET /notes` calls `store.list()` and uses only `pathname`, so a `tag` query is ignored today. Store calls are synchronous: `send(res, 201, store.add(await readJson(req)))`. They must be awaited once the PostgreSQL store exists.
- `src/server.js`: `createApp()` with no argument, so the store is always in-memory.

### Changes

1. **`src/tags.js`** (new). `parseTags(value)` returns the list or throws a 400 error: `undefined` gives `[]`; non-array, more than 5 entries, a non-string entry or an entry not matching `/^[A-Za-z0-9-]{1,20}$/` gives 400. `parseTagQuery(searchParams)` returns `undefined` when there is no `tag`, throws 400 if `getAll("tag").length > 1` or the value is invalid. A test checks that `"a\n"` is rejected.
2. **`src/notes.js`**: in-memory store methods become async. `add` uses `parseTags`. Each note is `{ id, title, body, tags }`. `list({ tag })` filters with exact equality.
3. **`src/postgres-store.js`** (new). `createPostgresStore(url)` creates a `pg.Pool`, runs `CREATE TABLE IF NOT EXISTS notes (id serial PRIMARY KEY, title text NOT NULL, body text NOT NULL DEFAULT '', tags text[] NOT NULL DEFAULT '{}')`, and returns the same `list/get/add` interface. List filter: `WHERE $1 = ANY(tags)` (case-sensitive); order by `id`. `get` takes an integer id; the route regex `\d+` can still give an id over the integer range, so return null for ids above 2147483647 rather than a 500. Validation is shared via `src/tags.js` and the title check is extracted so both stores use it. A `close()` method ends the pool.
4. **`src/store.js`** (new). `openStore(env)`: `DATABASE_URL` set gives the PostgreSQL store, otherwise the in-memory store. Connection errors propagate (no fallback, FR-004).
5. **`src/app.js`**: `await` all store calls; `GET /notes` passes `parseTagQuery(searchParams)` to `store.list`. Routing and error handling otherwise unchanged.
6. **`src/server.js`**: `await openStore(process.env)` before listening. On error, print it and `process.exit(1)`. Give the pool a `connectionTimeoutMillis` so an unreachable host fails rather than hangs.
7. **`README.md`**: document `DATABASE_URL`, `tags`, `?tag=`.
8. **`.github/workflows/ci.yml`**: add a `postgres` service and `DATABASE_URL` for the `ci` job.

### Tests

- Store-independent behaviour (FR-005 to FR-012) is written once as a function taking a store factory, and run for the in-memory store and for PostgreSQL. PostgreSQL tests are skipped with a visible message when `DATABASE_URL` is unset, and always run in CI. Each PostgreSQL test run starts from an empty `notes` table.
- Start-up: opening the store with an unreachable `DATABASE_URL` rejects; the schema is created on an empty database and is a no-op the second time; a note added through one store instance is read through a new one (restart).
- The existing four tests keep passing; the "add and read" one gains `tags: []` where it compares the note (it compares with the POST response, so it needs no change).

### Risks

- The store interface goes async, touching every route; kept in one task with its tests.
- PostgreSQL in CI is new infrastructure; `factory/gate` and `ci` must see it.

## Project Structure

### Documentation (this feature)

```text
specs/001-postgres-tags/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app.js            # await store calls, tag query
├── notes.js          # in-memory store, tags
├── tags.js           # new: validation
├── postgres-store.js # new
├── store.js          # new: choose by DATABASE_URL
└── server.js         # async start, exit 1 on failure
test/
├── app.test.js       # existing
├── tags.test.js      # new
└── store.test.js     # new: shared suite on both stores
```

**Structure Decision**: single project, flat `src/` as today.
