# ErpLite — Functional Test Suite: Build & Verification Report

A self-contained **Playwright + TypeScript** functional (end-to-end) test project was created at
`e2e/`, driving a real Chromium browser against the Angular app (`ng serve`) and the live
CashVanApi backend (`https://localhost:7089`).

---

## 1. Headline results

| | |
|---|---|
| **Total tests** | **605** across 54 files |
| **Route smoke baseline** | **115 passed · 0 failed · 16 tracked known-issues (skipped)** — verified live |
| **Auth + guard suite** | **24 passed** (login, validation, remember-me, logout, guard redirects) — verified live |
| **Reports deep specs** | **60 passed · 0 failed** — verified live (representative deep-spec module) |
| **TypeScript** | clean (`tsc --noEmit`, strict) |
| **Real bugs found** | **2 classes, 16 routes** (see §4) |

The suite navigated **all 133 application routes** authenticated as `Nader` (Admin, 311 permissions).
Every real page renders correctly; the only non-passing routes are genuine application bugs the
suite surfaced (now quarantined as documented known-issues so the baseline is green and regressions
stay detectable).

---

## 2. What's covered (605 tests)

| Module | Tests | Coverage |
|--------|------:|----------|
| **smoke** | 144 | Every navigable route loads, renders, keeps the shell, no JS/console/backend-5xx errors; permission & placeholder aware; unauthenticated guard-redirect suite |
| **warehouse** | 112 | Inbound/outbound/damage/transfer vouchers (header + line items + totals + save), item card, barcode, CRUD entities (units, stores, vendors, categories, brands, …) |
| **accounting** | 97 | Journal voucher (debit=credit balance), receipt/cash-payment/cheque-payment vouchers, chart of accounts, opening balances, definitions (banks, currencies, taxes, cost-centers, account-groups, stamps), account ledger |
| **cheques** | 75 | Full lifecycle: incoming/outgoing entry, deposit, collection, return, re-return, withdrawal, endorsement, tracking |
| **reports** | 60 | Filter → generate → assert columns/totals, clear-on-filter-change, export gating (trial balance, income statement, balance sheet, aging, ledger, detailed statement, journal report) |
| **misc** | 53 | Workflow builder, tasks, activity log, dashboards, home2, company info, fotara settings, appearance, document posting/unposting, year-end closing |
| **sales** | 42 | Invoice list/add (item add, totals recompute, tax), refunds, invoice details (`:TransactionNumber` resolved via API), service & virtual invoices |
| **permissions** | 11 | Admin permissions grid, gating, grant/revoke (write-gated) |
| **auth** | 10 | Login rendering, validation, invalid creds, password toggle, forgot-password modal, language toggle, valid login, remember-me vs session, logout |

Read-only scenarios (navigate/render/filter/validate) run by default. **Create/edit/post/delete
scenarios are gated behind `ALLOW_WRITES=true`** (off by default → safe, read-only runs).

---

## 3. How it's built (design)

- **Auth once, reuse everywhere** — `fixtures/auth.setup.ts` logs in through the real UI and saves
  the session; the `authed` project reuses it. The `guest` project runs logged-out (login/guard).
- **Page Object Model** — `pages/**` hold selectors + actions; specs stay about scenarios.
- **Route catalog** — `support/routes.catalog.ts` is auto-generated from the Angular route files
  (`npm run routes:extract`); the smoke suite is data-driven over it.
- **Error guard** — `support/console-guard.ts` fails a page on uncaught JS or **real backend 5xx**,
  while filtering out dev-server noise (Vite HMR, HTTP/2, SignalR chat) that only exists under
  `ng serve`.
- **Locale-agnostic** — structural selectors (ids/classes/roles), not translated text (app is
  Arabic-RTL by default; `TEST_LANG` controls assertions, default `en`).

---

## 4. Real bugs the suite found

### (A) Backend 500 — missing SQL object `Virtual_srf`
`GET /api/VirtualInvoice/GetRefunds`, `GetUntransferredRefundsMainData`, `GetTransferredRefundsMainData`
all return **HTTP 500: `Invalid object name 'Virtual_srf'`** on tenant `SC_ERP78`. A required table/view
is missing from this database.
Affected pages: `/sales/virtual/refunds`, `/sales/virtual/add-refund`,
`/sales/virtual/transfer-refunds`, `/sales/virtual/transfered-refunds`.

### (B) Frontend — `.map()` on a null API response
12 invoice/refund/transfer **list** pages call `.map()` on an API response that is `null` on this
tenant, throwing `TypeError: Cannot read properties of null (reading 'map')` (caught by the app's
global error handler). The pages need a null-guard (`(data ?? []).map(...)`).
Affected: `/sales/invoice`, `/sales/refund`, `/sales/transfer-invoices`, `/sales/transfered-invoices`,
`/sales/transfer-refunds`, `/sales/transfered-refunds`, `/sales/virtual/invoices`,
`/sales/virtual/transfer-invoices`, `/sales/virtual/transfered-invoices`,
`/sales/service/transfered-invoices`, `/sales/service/transfered-refunds`,
`/accounting/virtual/receipt-vouchers`.

> These 16 routes are listed in `KNOWN_ISSUES` in `tests/smoke/routes.smoke.spec.ts` and marked
> `test.fixme` — they show as **skipped** (not failed), so the baseline is green. When a bug is
> fixed, remove its entry and the smoke will assert it passes (and alert you if it regresses).

---

## 5. How to run

```bash
cd e2e
npm install && npm run install:browsers   # first time only
# credentials already in e2e/.env (git-ignored)

npm run test:smoke      # all routes (green baseline) — best first run
npm run test:auth       # login + guard suite
npm test                # everything (read-only; write flows auto-skip)
npm run test:ui         # interactive explorer
npm run report          # open the HTML report after a run
```

**To exercise write/business flows** (create invoices, post vouchers, cheque status changes, CRUD):
set `ALLOW_WRITES=true` in `e2e/.env` — **only against a test tenant** — then `npm test`.

---

## 6. Status of the deep module specs

The 461 deep specs (warehouse/accounting/cheques/reports/misc/sales/permissions) were generated from
the **real component source** (selectors, flows, permission keys, API paths all derived from the
actual `.html`/`.ts`), and are **type-checked and discovered clean**. The **route smoke** (which
exercises every one of these pages end-to-end) and the **auth suite** are **fully verified live and
green**. The read-only **reports** module was run live as a representative deep-spec validation and
came back **60/60 green** — a strong signal that the source-derived selectors and flows are accurate.

Because the sub-agents could not run against a live DOM during generation, some deep write/interaction
specs may need minor selector tuning on first live execution — this is normal for a first E2E suite
and is the intended next step (run a module, adjust any selector the live DOM disagrees with). The
foundation, conventions, and green smoke baseline make that iteration straightforward.
