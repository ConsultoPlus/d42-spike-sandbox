# API contract changes

Unchanged: `GET /health`, `GET /notes/:id` (404 for unknown), title validation.

## POST /notes
Body: `{ "title": string, "body"?: string, "tags"?: string[] }`

| Case | Status |
|---|---|
| valid, with or without `tags` | 201, note including `tags` |
| 6 or more `tags` entries (duplicates count) | 400 |
| a tag not 1-20 chars of `A-Za-z0-9-` | 400 |
| `tags` not an array, or an entry not a string | 400 (was 201: breaking) |

## GET /notes
| Case | Status |
|---|---|
| no `tag` | 200, all notes |
| `?tag=x`, valid | 200, notes whose `tags` contain exactly `x`; `[]` if none |
| `?tag=` empty or invalid | 400 |
| `tag` repeated | 400 |

## Note shape
`{ "id": 1, "title": "...", "body": "...", "tags": [] }`. `tags` is always present (breaking: new field).

Errors keep the shape `{ "error": "<message>" }`.

## Start-up
`DATABASE_URL` set and database unreachable: process exits non-zero, no listening port.
