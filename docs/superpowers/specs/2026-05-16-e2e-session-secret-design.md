# E2E: Provide SESSION_SECRET to Playwright's webServer

## Problem

After installing Playwright browsers in CI, the next failure is:

```
[WebServer] [browser] Uncaught Error: SESSION_SECRET environment variable is required
[WebServer]     at getSessionOptions (lib/auth/session.ts:12:22)
[WebServer]     at Page (app/page.tsx:15:87)
```

The Playwright `webServer` boots `npm run dev` with no env passing (`playwright.config.ts:34`). On any environment without a `.env` file (CI, fresh clones), `process.env.SESSION_SECRET` is undefined and `getSessionOptions()` throws at the very first SSR (the home page calls `getIronSession` at `app/page.tsx:15`).

`SESSION_SECRET` is intentionally absent from `.env.example` — it's treated as a real secret in production. The fix must not weaken that guard.

## Goal

Allow `npm run test:e2e` to boot the Next.js server in any environment (CI, fresh clone) without:
- Leaking or fabricating a "real" secret.
- Loosening the missing-secret throw in `lib/auth/session.ts`.
- Adding `SESSION_SECRET` to `.env.example` (which would imply it's a non-secret).

## Design

Move env passing into Playwright's `webServer.env` block in `playwright.config.ts`.

```ts
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3000/api/health',
  reuseExistingServer: !process.env.CI,
  timeout: 60_000,
  env: {
    NEXT_PUBLIC_TEST_MODE: '1',
    SESSION_SECRET:
      process.env.SESSION_SECRET ??
      'e2e-test-only-not-for-production-use-0000',
  },
},
```

### Rationale

- **`webServer.env` not `cross-env` in command.** Playwright's `webServer` block accepts an `env` map natively. Using it collapses `cross-env NEXT_PUBLIC_TEST_MODE=1 npm run dev` to `npm run dev` and keeps all test-server env in one declarative place.
- **Honour existing `process.env.SESSION_SECRET`.** If a developer has `.env` populated and runs E2E against it, don't override. Only fall back to the literal when nothing is set.
- **Fixed literal, not random.** Matches the `dev:demo` script's convention (`package.json`) of a clearly-labelled non-secret placeholder. Stable across runs — important if any test asserts cookie shape.
- **32+ chars.** `lib/auth/session.ts:11–13` rejects secrets shorter than 32 characters. The literal `e2e-test-only-not-for-production-use-0000` is 42 chars.
- **No app code change.** `getSessionOptions` stays strict; the throw still guards production.
- **No workflow change.** `release.yml` doesn't need to know about test envs.

### Files changed

- `playwright.config.ts` — modify `webServer` block. ~6 line delta.

### Out of scope

- Other missing envs (`STEAM_API_KEY`, `REFRESH_SECRET`, `DATABASE_URL`, `SITE_BASE_URL`). Fix opportunistically when they surface as test failures — premature stubbing risks masking real bugs.
- Authenticated-flow test helpers (cookie creation, signed-in fixtures). Current `tests/e2e/responsive/*` specs don't need them.
- `.env.test` file, CI GitHub Secrets, or any refactor of `lib/auth/session.ts`.

## Verification

1. Run `npm run test:e2e` locally with no `.env` file (rename it temporarily). The dev server boots; the responsive nav-drawer specs run.
2. Run with the existing `.env`. The dev server boots using the real `SESSION_SECRET` from `.env`. Cookie behaviour identical to current dev.
3. CI: next push to `main` runs `Release` → `E2E tests` step completes past server boot. Previously failing `tests/e2e/responsive/nav-drawer.spec.ts` cases run.

## Risks

- **Single literal across runs.** If two parallel CI jobs ever shared the cookie store, sessions would be cross-talkable. Not applicable: each runner has an isolated filesystem. If parallelism within a job is later added, the literal can be regenerated per worker.
- **The fix is test-only and never reaches production.** `playwright.config.ts` is not part of any production bundle.
