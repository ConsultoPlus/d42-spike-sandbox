# Feature Specification: Store notes in PostgreSQL, with tags

**Feature Branch**: `cr/CR-001-postgres-tags`
**Created**: 2026-11-28
**Status**: Draft
**Input**: User description: "CR-001: Store notes in PostgreSQL, with tags"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Notes survive a restart (Priority: P1)

An operator sets `DATABASE_URL` and starts the API. Notes are kept in PostgreSQL and are still there after a restart. Without `DATABASE_URL` the API behaves as today, with the in-memory store.

**Why this priority**: Durable storage is the main reason for the change.

**Independent Test**: Start with `DATABASE_URL` pointing at an empty database, POST a note, restart, GET it. Start without `DATABASE_URL` and run the existing tests unchanged.

**Acceptance Scenarios**:

1. **Given** `DATABASE_URL` is set and the database has no notes table, **When** the API starts, **Then** the schema is created and the API serves requests.
2. **Given** `DATABASE_URL` is set and a note was added, **When** the API is restarted, **Then** `GET /notes/:id` returns that note.
3. **Given** `DATABASE_URL` is not set, **When** the API starts, **Then** notes are kept in memory exactly as today.
4. **Given** `DATABASE_URL` is set but PostgreSQL is unreachable, **When** the API starts, **Then** it fails to start with an error, and does not fall back to the in-memory store.

---

### User Story 2 - Tag a note (Priority: P2)

A client adds a note with an optional `tags` array to organise it.

**Why this priority**: It adds the new data. Filtering (story 3) needs it. Tags work the same on both stores and do not depend on PostgreSQL.

**Independent Test**: POST notes with valid and invalid `tags`, check status codes and the returned note.

**Acceptance Scenarios**:

1. **Given** a valid title, **When** POST `/notes` with `"tags": ["work", "q4-plan"]`, **Then** 201 and the note has `tags: ["work", "q4-plan"]`.
2. **Given** a valid title and no `tags`, **When** POST `/notes`, **Then** 201 and the note has `tags: []`.
3. **Given** `"tags"` with 6 or more entries, **When** POST `/notes`, **Then** 400. This includes 7 tags (the request's Example 2, which the owner has ruled must expect 400).
4. **Given** `"tags": ["a","a","a","a","a","a"]`, **When** POST `/notes`, **Then** 400, because duplicates count.
5. **Given** a tag that is empty, longer than 20 characters, or has a character other than ASCII letters, digits or `-`, **When** POST `/notes`, **Then** 400.
6. **Given** `tags` is not an array, or an entry is not a string, **When** POST `/notes`, **Then** 400.
7. **Given** a tag `Work` was stored, **When** the same note is read, **Then** the tag is returned as `Work`. Tags are case-sensitive, so `Work` and `work` are different tags.

---

### User Story 3 - Find notes by tag (Priority: P3)

A client lists only the notes that carry a given tag.

**Why this priority**: It is what makes tags useful, but needs story 2.

**Independent Test**: Add notes with different tags, GET `/notes?tag=…`.

**Acceptance Scenarios**:

1. **Given** notes tagged `work` and `home`, **When** GET `/notes?tag=work`, **Then** only notes with the tag `work` are returned.
2. **Given** no note has the tag, **When** GET `/notes?tag=none`, **Then** 200 and `[]`.
3. **Given** a `tag` value that is not a valid tag (including an empty `?tag=`), **When** GET `/notes?tag=…`, **Then** 400.
4. **Given** `?tag=a&tag=b`, **When** GET `/notes`, **Then** 400.
5. **Given** no `tag` parameter, **When** GET `/notes`, **Then** all notes, as today.

### Edge Cases

- Exactly 5 tags is accepted; 6 is rejected.
- A tag of exactly 20 characters is accepted; 21 is rejected.
- Duplicate tags in the 5 or fewer entries are valid input. They are stored as sent, order preserved (see Assumptions: follows the owner's "count every entry" decision).
- Non-ASCII letters (for example `é`) are rejected.
- `tags: null` is not an array and is rejected with 400.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When `DATABASE_URL` is set, the system MUST store notes in PostgreSQL.
- **FR-002**: When `DATABASE_URL` is set, the system MUST create the schema on start if it is missing, and leave existing data alone.
- **FR-003**: When `DATABASE_URL` is not set, the system MUST keep notes in memory as today.
- **FR-004**: If `DATABASE_URL` is set and PostgreSQL cannot be reached at start, the system MUST fail to start. It MUST NOT fall back to the in-memory store.
- **FR-005**: `POST /notes` MUST accept an optional `tags` array.
- **FR-006**: The system MUST reject with 400 a `tags` array with more than 5 entries. Every entry counts, duplicates included.
- **FR-007**: A tag MUST be 1 to 20 characters, each an ASCII letter (a-z, A-Z), a digit, or `-`. Otherwise `POST /notes` MUST return 400.
- **FR-008**: The system MUST return 400 if `tags` is present and not an array, or if any entry is not a string.
- **FR-009**: Tags MUST be case-sensitive, stored and compared exactly as sent.
- **FR-010**: Every note returned by the API MUST include `tags`, as `[]` when it has none.
- **FR-011**: `GET /notes?tag=<tag>` MUST return only notes that carry exactly that tag.
- **FR-012**: `GET /notes` MUST return 400 if `tag` is not a valid tag (FR-007), including an empty value, or if `tag` is given more than once.
- **FR-013**: Behaviour of both stores MUST be identical for FR-005 to FR-012.
- **FR-014**: Existing behaviour not listed here (title required, ids, 404 for unknown id, `/health`) MUST NOT change.

### Breaking changes (constitution principle 5)

- Every note response gains a `tags` field (always present, `[]` when empty).
`POST /notes` ignores everything but `title` and `body` today, so every request below returned 201 before. Each is a visible change of status code (201 to 400), approved by the owner:

- `tags` with more than 5 entries (duplicates count) now returns 400.
- A tag that is empty, longer than 20 characters, or has a character outside `A-Za-z0-9-` now returns 400.
- An entry of `tags` that is not a string now returns 400.
- `tags` that is not an array (including `null`) now returns 400.

`GET /notes` ignores the query string today, so every request below returned 200 before:

- `?tag=` with an empty or invalid value now returns 400.
- A repeated `tag` (`?tag=a&tag=b`) now returns 400.

### Key Entities

- **Note**: id (integer, increasing, from 1), title, body, tags.
- **Tag**: a string of 1 to 20 ASCII letters, digits or `-`. A note has at most 5 entries. It belongs to a note and has no identity of its own.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a restart with `DATABASE_URL` set, 100% of previously added notes, with their tags, are still returned.
- **SC-002**: Without `DATABASE_URL`, every pre-existing test passes unchanged, apart from assertions on the new `tags` field.
- **SC-003**: Every rule in FR-006 to FR-012 has a test that passes against both stores.
- **SC-004**: The API refuses to start when the configured database is unreachable, in every attempt.

## Assumptions

- Duplicates: the owner decided "count every entry" (6 entries is 400 even if all equal). Following from that decision, and not left open, an accepted `tags` array (5 or fewer entries) is stored as sent: duplicates are kept, order is preserved, and each entry counts towards the limit. No de-duplication or sorting is applied.
- `tags` is returned in the order sent.
- Out of scope: editing or deleting notes, users and authentication.
- Existing ids stay increasing integers from 1 in both stores.
- The request's Example 2 (7 tags, 201) contradicts the 5-tag limit. The owner ruled that the limit is right, so Example 2 expects 400.
- Owner decisions applied: counting incl. duplicates; 400 for invalid or non-array tags; `tags: []` when none; case-sensitive; ASCII letters only; 400 for invalid or repeated `?tag`; no fallback when PostgreSQL is unreachable.
