# Data model

## Note
| Field | Type | Rule |
|---|---|---|
| id | integer | increasing from 1; assigned by the store |
| title | string | required, trimmed, non-empty (unchanged) |
| body | string | default `""` (unchanged) |
| tags | string[] | default `[]`; at most 5 entries, duplicates counted and kept; order as sent |

## Tag
`/^[A-Za-z0-9-]{1,20}$/`, case-sensitive.

## PostgreSQL
```sql
CREATE TABLE IF NOT EXISTS notes (
  id    serial PRIMARY KEY,
  title text NOT NULL,
  body  text NOT NULL DEFAULT '',
  tags  text[] NOT NULL DEFAULT '{}'
);
```
