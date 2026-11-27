# d42-spike-sandbox

A small sample app that ConsultoPlus's AI Code Factory agents work on in tests. It's public, and contains nothing
real. Changes arrive as pull requests from the agents' GitHub App, and the `main` ruleset requires the `ci` and
`factory/gate` checks.

**The app:** a notes HTTP API on Node 24 with no dependencies.

```bash
npm test        # node:test
npm start       # http://localhost:3000
```

| Method | Path | Does |
|---|---|---|
| GET | `/health` | `{ "ok": true }` |
| GET | `/notes` | all notes |
| POST | `/notes` | add `{ "title": "…", "body": "…" }`; 400 when the title is missing |
| GET | `/notes/:id` | one note, or 404 |
