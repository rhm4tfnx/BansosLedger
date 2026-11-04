# AGENTS.md — BansosLedger

> Standing rules for any AI coding agent working in this repository (Antigravity, Cursor, Claude Code, v0).
> Written in English for the agent. **Talk to the human in Indonesian.** Code, identifiers, comments and commit messages are English; every user-facing string in the UI and API errors is Indonesian.

## 1. Source of truth

1. `docs/PRD.md` (currently v2.7) is the source of truth. **The PRD wins over mocks, old code and your own assumptions.**
2. Before changing anything, read the PRD sections the task names, then read the real code. **Never guess** file names, field names, route names or query parameter names; open the file and confirm.
3. If the task contradicts the PRD, or the PRD is ambiguous, **stop and ask** instead of choosing silently.
4. If you find a PRD requirement the task does not cover, do not implement it; list it under "Not done" in the final report.

## 2. How to work

1. **Plan first.** For a task that touches more than 3 files, write a short plan (files to touch, tests to add, commands to run) and wait for approval.
2. **Stay in scope.** Touch only the files and folders the task names. No drive-by refactors, no renames, no formatting-only changes elsewhere. If something outside scope is broken, report it; do not fix it.
3. **Small steps.** One domain at a time; run typecheck and the related tests after each step, not only at the end.
4. **Never claim success without running the command.** Run the verification commands yourself and report the real result (pass/fail counts and any error text). If a command cannot run in this environment, say so explicitly; do not pretend.
5. **Two-attempt rule.** If the same failure persists after two different fixes, stop and report what you tried, with the exact error. Do not loop.
6. **Do not commit.** Never run `git commit`, `git push`, `git reset`, `git checkout -- .`, `git clean` or `git stash`. The human reviews `git diff` and commits.
7. **Tests are part of the task.** Every new route, mapper, service function and UI behavior gets a test. Do not delete or weaken an existing test to make it pass; if a test asserts old behavior the task changes, update it and say so in the report.
8. **No new dependencies** unless the task names them. If you believe one is needed, ask first.

## 3. Safety limits (hard)

- Never read, print, edit or create: `.env*` (except `.env.example`), private keys, seed phrases, `keys/`, `infra/**/keys`, anything under `~/.ssh`. Never copy secrets into code, tests, logs or the report.
- No `sudo`, no global installs, no `rm -rf` outside `node_modules`, `.next`, `dist`, `coverage`, `artifacts`, `cache`, no `docker system prune`, no database drop commands.
- Do not deploy, do not call external services other than package registries, and do not change firewall/server settings.
- If a command needs elevated rights (for example browser system dependencies), **stop and report**; do not run it with sudo.
- Next.js here is v16. APIs differ from older versions; before using or renaming a Next.js API read `node_modules/next/dist/docs/`.

## 4. Stack and commands

pnpm workspace. TypeScript strict. Next.js 16 (App Router), React 19, Tailwind v4, shadcn/ui, Zod, Mongoose, ethers v6, Vitest (+ Testing Library, MSW on the frontend), Hardhat in `packages/contracts` (`@bansos/contracts`).

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint            # only if the script exists
pnpm test:all
pnpm --filter @bansos/contracts compile
pnpm --filter @bansos/contracts test
```

If a script above does not exist, say so; do not invent one silently.
On Ubuntu 24.04, if `mongodb-memory-server` cannot fetch a binary, set `MONGOMS_DISTRO=ubuntu-22.04` for the test run and mention it in the report.

## 5. Backend hard rules (derived from the PRD; if the repo already has stricter rules, the stricter rule wins)

**Layering.** Route Handler -> service -> repository. Handlers only parse, authorize, call a service and map the result. Business logic lives in `src/modules/<domain>/service.ts`; database access only in repositories. Server-only code starts with `import 'server-only'`.

**Contract.** Validate every input and every output with Zod. Errors are RFC 9457 `application/problem+json` with a stable `code` and a `requestId`. Every `code` must exist in the error catalog (`src/lib/api-contract/errors.ts`). Responses use DTO mappers; never return raw Mongoose documents, `_id`, `__v`, `schemaVersion`, token hashes, lease/lock fields, storage ids or idempotency data.

**Auth and access.** Default deny. Every v1 route declares its permission through `requirePermission`. Mutating requests check the `Origin` header. Sessions are opaque, server-side, `HttpOnly` cookies. Session payload never reaches the browser beyond `AuthMeDto`.

**Privacy (UU PDP).**
- A NIK never appears in a URL, query string, log, error message, audit entry, analytics event or cache key. NIK search uses `POST` with a body.
- NIK is stored AES-256-GCM encrypted plus an HMAC blind index. Commitment = `keccak256(NIK ‖ COMMITMENT_PEPPER)`, computed on the server.
- NIK is masked by default (first 4 + 8 `•` + last 4). Reveal is per recipient, audited, rate limited (30 per hour per user) and masked again after 30 seconds.
- Never log request or response bodies.

**Domain integrity.**
- Statuses are `DRAFT`, `PENDING`, `SUCCESS`, `FAILED`. `SUCCESS` is written only after the server itself verified the on-chain receipt (status 1, correct `to`, matching event arguments, expected sender). The client's word is never enough.
- The disbursement amount is copied from the program by the server; clients cannot send an amount.
- FINAL recipients cannot be edited or deleted. Soft delete exists only for DRAFT and needs a reason.
- The audit log is append-only and hash-chained; there is no update or delete path.
- Money is an integer rupiah. Dates are stored in UTC and returned as ISO-8601; display in WITA is a frontend concern.
- Duplicate protection is layered: unique partial index in MongoDB, contract check, `Idempotency-Key` on creation.

**Operations.** Environment variables are validated at boot; secrets only from the environment, never in code. No N+1 queries (use aggregation or `$lookup`). List endpoints are paginated and return the envelope `{ data, total, page, limit, totalPages }`.

**Smart contract** (`packages/contracts`). Do not modify unless the task says so. No proxy, `Ownable2Step`, `renounceOwnership()` always reverts with `RenounceDisabled()` for everyone, compile with `evmVersion: "paris"`, custom errors only.

## 6. Frontend and integration rules

1. **Visual design stays the same.** Reuse existing components, CSS, Tailwind classes, tokens and copy. New UI (dialogs, banners, loading/empty/error states) must follow existing patterns. No redesign.
2. **The PRD wins over mocks.** If a mock field does not exist in the PRD or backend (`kk`, `pekerjaan`, `penghasilan`, `tanggungan`, `unit`, `criteria`, illustrative metrics), remove it from the UI. Never invent storage. List every removal in the report.
3. **No mock data in production paths** and no silent fallback to mocks when an API call fails; show the error state. `src/mocks` and `src/stores` are deleted only in the final hardening task.
4. **Architecture.** `src/lib/api` (client, errors, query keys, per-domain hooks), `src/lib/api/adapters` (pure DTO -> view-model functions with unit tests), `src/lib/wallet`, `src/components/features/**` (UI only; components never call `fetch` directly and never import Mongoose, `server-only` code or `src/modules/**`).
5. **Shared typed contract** in `src/lib/api-contract` (no `server-only`), used by backend and frontend. Parse responses with the schema in development and in tests.
6. **TypeScript strict.** No `any`, no `@ts-ignore`, no non-null assertions on API data; use discriminated unions for async states.
7. **Libraries (PRD 8.3):** TanStack Query v5 (fetching, cache, polling), React Hook Form + Zod (forms), Zustand (wallet and transaction UI state only). Replace SWR everywhere and remove it in the final task. Do not add other state libraries or UI kits.
8. **Browser security.** Never put a NIK in a URL, storage, log or analytics. No secrets in `NEXT_PUBLIC_*`. The browser never holds a private key and never reads the session cookie.
9. **States.** Every list and page has loading (skeleton), empty and error states with a retry action. Errors show the Indonesian message mapped from the API `code`, plus the `requestId` in small text.
10. **UX and accessibility** (PRD 13.2): status is never only color; a summary confirmation dialog precedes any signature; irreversible actions need double confirmation; complete wallet states; hashes are shortened with a copy button and an explorer link; rupiah as `Rp 600.000`; dates in WITA (Asia/Makassar); `aria-live` for transaction status; WCAG 2.2 AA; touch targets of at least 44 px on public pages.

## 7. Definition of done and final report

A task is done only when all of this is true: typecheck is clean, the related tests pass, `pnpm test:all` passes, no unrelated file changed, and the PRD is still consistent with the behavior.

End every task with this report (Indonesian prose, English identifiers):

1. **Files changed**, one line each.
2. **Commands run** and their real results.
3. **UI fields removed** (frontend tasks).
4. **Deviations from the PRD**, with the reason.
5. **Not done / TODO**, including anything you could not run.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
