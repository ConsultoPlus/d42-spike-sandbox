# Research: PostgreSQL storage and tags

## Client library
- **Decision**: `pg`.
- **Rationale**: Standard PostgreSQL client for Node, parameterised queries, pooling. Node 24 has no built-in client.
- **Alternatives**: a query builder or ORM (more weight than five queries need); hand-written wire protocol (no).

## Tag column
- **Decision**: `text[]` column on `notes`, filtered with `$1 = ANY(tags)`.
- **Rationale**: at most 5 tags per note, no tag identity or tag-level data (spec Key Entities); one table, one query, case-sensitive by default.
- **Alternatives**: `note_tags` join table (needed only if tags gain their own data); `jsonb` (no benefit here).

## Schema creation
- **Decision**: `CREATE TABLE IF NOT EXISTS` at start. No migration tool.
- **Rationale**: spec FR-002 asks for create-if-missing only. A later schema change will need a migration approach; out of scope here.

## Unreachable database
- **Decision**: start-up rejects, `server.js` exits with code 1; connection timeout set.
- **Rationale**: spec FR-004, owner decision 8.

## Tests against a real database
- **Decision**: CI `postgres` service container; tests read `DATABASE_URL`.
- **Rationale**: constitution principle 2.
