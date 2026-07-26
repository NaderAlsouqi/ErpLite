# ErpLite — Functional (E2E) Test Suite

End-to-end functional tests for the ErpLite Angular app + CashVanApi backend, built with
[Playwright](https://playwright.dev). Tests drive a real Chromium browser against a running
frontend (`ng serve`) and the real backend API, exercising user-facing scenarios across all
modules.

---

## What it covers

| Area | Coverage |
|------|----------|
| **Auth** | Login form rendering, field validation, invalid credentials, password toggle, forgot-password modal, language toggle, valid login, remember-me vs session storage, logout |
| **AuthGuard** | Unauthenticated redirects to `/auth/login`, root redirect, public 404 |
| **Route smoke** | Every one of the **133 navigable routes** loads, renders, keeps the shell, and produces no console/JS/5xx errors (permission-guarded & placeholder routes handled specially) |
| **Sales** | Invoices, refunds, service invoices, virtual invoices, transfers |
| **Warehouse** | Inbound/outbound/damage/transfer vouchers, item card, barcode, entities (units, stores, vendors, …) |
| **Accounting** | Journal / receipt / cash-payment vouchers, chart of accounts, definitions, document posting/unposting |
| **Cheques** | Incoming/outgoing lifecycle: deposit → collection → return → re-return, withdrawal, endorsement, tracking |
| **Reports** | Filter → generate → assert columns/totals, clear-on-filter-change, export |
| **Permissions** | Grid, grant/revoke, gating effect (`*hasPermission`) |

Deep specs live under `tests/<module>/`; the exhaustive per-route smoke lives under `tests/smoke/`.

---

## Prerequisites

- **Node 18+**
- The **CashVanApi backend running** (default `https://localhost:7089`). Self-signed TLS is tolerated.
- A **test account** on a test tenant (ideally with broad permissions so guarded pages are exercised).
- The Angular dev server — Playwright will **auto-start `npm start`** for you (or reuse it if already running).

## Setup

```bash
cd e2e
npm install
npm run install:browsers          # one-time: download Chromium
cp .env.example .env              # then edit .env with real values
```

Fill in `.env`:

```ini
BASE_URL=http://localhost:4200
API_URL=https://localhost:7089/api
TEST_USERNAME=your_test_user
TEST_PASSWORD=your_test_password
TEST_LANG=en
ALLOW_WRITES=false                # keep false for a safe read-only run
```

## Running

```bash
npm test                  # everything (auto-starts ng serve, logs in once, runs all specs)
npm run test:smoke        # all 133 routes load without errors
npm run test:auth         # login/guard suite (no credentials needed for most of it)
npm run test:authed       # authenticated deep specs only
npm run test:sales        # a single module
npm run test:headed       # watch it run in a real browser
npm run test:ui           # Playwright's interactive UI mode
npm run report            # open the last HTML report
```

### Write safety

By default (`ALLOW_WRITES=false`) any spec that **creates, edits, posts, or deletes** real
records is **skipped**, so a run is safe and read-only. Set `ALLOW_WRITES=true` **only against a
test tenant** to exercise the full business/write flows. Write specs use uniquely-prefixed
(`E2E_…`) test data and clean up after themselves where the API allows.

### No credentials?

Without `TEST_USERNAME`/`TEST_PASSWORD`, credential-dependent specs auto-skip. The login-form,
validation, invalid-credential, and auth-guard tests still run (they need no account).

---

## Project structure

```
e2e/
├── playwright.config.ts     # projects: setup → guest (no auth) / authed (reuses session)
├── .env.example             # copy to .env
├── fixtures/
│   ├── auth.setup.ts        # logs in once via UI, saves .auth/user.json
│   └── test-fixtures.ts     # extends `test`: page(lang), errors, api, page objects, requireWrites()
├── pages/                   # Page Object Model
│   ├── base.page.ts         # goto + toast helpers, extended by feature pages
│   ├── login.page.ts
│   ├── shell.page.ts        # sidebar/header/logout
│   └── <module>.page.ts     # per-module page objects
├── support/
│   ├── env.ts               # typed .env access, STORAGE_STATE, requireCreds()
│   ├── routes.catalog.ts    # AUTO-GENERATED inventory of all 133 routes + metadata
│   ├── helpers.ts           # goto, ng-select, dates, tables, toasts, waitForApi…
│   ├── console-guard.ts     # collects console/JS/5xx errors, with a noise allow-list
│   └── api-client.ts        # authenticated backend client for setup/teardown/assertions
├── scripts/
│   └── extract-routes.cjs   # regenerates routes.catalog.ts from the Angular route files
└── tests/
    ├── smoke/               # routes.smoke.spec.ts, auth-guard.guest.spec.ts
    ├── auth/                # login.spec.ts  (guest project)
    ├── sales/  warehouse/  accounting/  cheques/  reports/  permissions/  workflow/
```

### Test projects (in `playwright.config.ts`)

- **setup** — runs `fixtures/auth.setup.ts`, logs in, saves storage state.
- **guest** — specs under `tests/auth/**` or named `*.guest.spec.ts`; **no** stored session.
- **authed** — everything else; reuses the saved session (depends on `setup`).

---

## Conventions for adding tests

- Import `{ test, expect }` from `../../fixtures/test-fixtures` (not from `@playwright/test`).
- Prefer **structural selectors** (ids, classes, roles) over translated text; the app is
  Arabic-RTL by default. Where text is unavoidable, match both AR + EN (`buttonByNames`).
- Gate write flows with `requireWrites()`; gate credential-only flows with `requireCredentials()`.
- Put a page's selectors + actions in a `pages/*.page.ts` object; keep specs about scenarios.
- Use `errors` fixture + `hasErrors()` to assert a page produced no runtime errors.

### Regenerating the route catalog

If routes change in the Angular app:

```bash
npm run routes:extract
```

---

## CI

```bash
npm ci
npx playwright install --with-deps chromium
E2E_START_WEBSERVER=false BASE_URL=https://staging.example.com npm test
```

Set `CI=1` for retries + capped workers. Artifacts: `playwright-report/` (HTML), `test-results/`
(traces, screenshots, videos on failure).

## Troubleshooting

- **All authed tests error at `setup`** → credentials missing/wrong, or backend down. Check `.env`.
- **`ng serve` never starts** → run it yourself and set `E2E_START_WEBSERVER=false`, or raise the
  webServer timeout in `playwright.config.ts`.
- **Guarded route smoke "skips" the render** → the test account lacks that permission; grant it or
  ignore (the test tolerates the guard redirect).
- **Flaky text assertions** → confirm `TEST_LANG` matches what you assert; prefer structural selectors.
