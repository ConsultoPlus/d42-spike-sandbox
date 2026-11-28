# Specification Quality Checklist: Store notes in PostgreSQL, with tags

**Created**: 2026-11-28
**Feature**: [spec.md](../spec.md)

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is bounded (edit/delete, users/auth out)
- [x] Known store divergence (NUL in title/body) documented as a limitation
- [x] Dependencies and assumptions identified
- [x] Breaking changes called out (constitution principle 5), each status change listed
- [x] Duplicate tags: kept as sent, order preserved, counted per entry. Recorded as an assumption following the owner's "count every entry" decision, not an open question

## Notes

- The API is the contract here, so HTTP status codes and `DATABASE_URL` appear in the spec by design.
