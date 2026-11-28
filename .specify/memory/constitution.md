# Notes API constitution

Version 1.0.0 · ratified 2026-11-28

## Principles

1. **Small and dependency-light.** Node 24, the standard library first. A dependency needs a reason in the plan.
2. **Tested.** Every behaviour change comes with `node:test` tests; `npm test` passes before a PR is opened. Database code is tested against a real PostgreSQL (`DATABASE_URL`).
3. **One change per PR.** A PR implements one task's plan section and nothing else.
4. **Specs first.** Changes go through Spec Kit: spec, plan, tasks. Anything the request doesn't settle is a `[NEEDS CLARIFICATION]`, never a guess.
5. **The API is a contract.** Changing a response shape or status code is a breaking change, called out in the spec.

## Governance

Changes are reviewed in pull requests. `main` requires `ci` and `factory/gate`.
