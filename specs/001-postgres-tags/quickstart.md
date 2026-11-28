# Quickstart

Prerequisites: Node 24, a PostgreSQL reachable at `$DATABASE_URL`.

1. In-memory: `npm test` with `DATABASE_URL` unset. PostgreSQL tests are skipped.
2. PostgreSQL: `DATABASE_URL=postgres://... npm test`. All tests run.
3. Manual: `DATABASE_URL=postgres://... npm start`, then
   - `curl -XPOST localhost:3000/notes -d '{"title":"a","tags":["work"]}'` gives 201 with `"tags":["work"]`
   - `curl 'localhost:3000/notes?tag=work'` returns that note
   - `curl -XPOST localhost:3000/notes -d '{"title":"a","tags":["1","2","3","4","5","6"]}'` gives 400
   - restart the server; `curl localhost:3000/notes` still lists the note
4. `DATABASE_URL=postgres://nowhere:1/x npm start` exits non-zero.
