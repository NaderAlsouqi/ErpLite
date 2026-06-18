# ErpLite — System Documentation

> Skyline Innovation — Cloud ERP / Accounting platform
> Frontend: **ErpLite** (Angular 17) · Backend: **CashVanApi** (.NET / ASP.NET Core) · Database: **SQL Server** (multi‑tenant)

---

## 1. Purpose & Scope

ErpLite is a bilingual (Arabic / English) **accounting & sales ERP** delivered as a web application. It covers the full
financial cycle for small‑to‑mid businesses:

- **General Ledger** – chart of accounts, journal vouchers, posting/un‑posting, year‑end closing.
- **Receivables & Payables** – customers, suppliers, receipt & payment vouchers.
- **Cheque management** – full incoming/outgoing cheque lifecycle (deposit, collection, return, endorsement, withdrawal, tracking).
- **Sales & Invoicing** – sales / service / virtual invoices, transfers, refunds, and Jordan e‑invoicing (JoFawtara / Fotara) QR.
- **Reporting** – statements, trial balance, income statement, balance sheet, aging, cost‑center and cheque reports, dashboards.
- **Definitions** – banks, currencies, taxes, stamps, cost centers, account groups.
- **Administration** – company info, appearance/theme, **fine‑grained permissions**, activity log.

---

## 2. Technology Stack

| Layer | Technology |
|------|------------|
| Frontend | Angular **17** (standalone components), TypeScript |
| UI | Bootstrap 5.3, Angular Material 17, `@ng-select/ng-select`, Tabler/Bootstrap icons |
| Charts | `ng-apexcharts` (ApexCharts) |
| i18n | `@ngx-translate/core` (Arabic `ar.json` / English `en.json`), RTL/LTR switching |
| Notifications | `ngx-toastr` |
| Excel | `xlsx` (SheetJS) for import/export |
| Backend | ASP.NET Core Web API (.NET), **Dapper** (micro‑ORM) |
| Database | Microsoft SQL Server, stored‑procedure driven |
| Auth | JWT bearer tokens with permission claims |
| Hosting | IIS (frontend SPA + `web.config` rewrite), Kestrel/IIS (API) |

---

## 3. Architecture

```
┌──────────────────────────┐      HTTPS/JSON      ┌──────────────────────────┐
│   ErpLite (Angular SPA)   │  ───────────────▶   │   CashVanApi (.NET API)   │
│   served by IIS            │  ◀───────────────   │   Controllers→Services→   │
│   web.config SPA rewrite   │      JWT bearer      │   Repositories (Dapper)   │
└──────────────────────────┘                      └────────────┬─────────────┘
                                                                │ SQL (stored procs)
                       ┌────────────────────────────────────────┼───────────────────────────┐
                       ▼                                         ▼                           ▼
              ┌─────────────────┐                     ┌────────────────────┐       ┌────────────────────┐
              │  ERP_Manager     │  login → resolve    │  SEC_ERP            │       │  Tenant DBs         │
              │  (connection      │  user's server/db   │  (central security: │       │  SC_ERP49 / 78 /…   │
              │   registry)       │                     │  SEC_USERS_DEF, …) │       │  (accounting data + │
              └─────────────────┘                     └────────────────────┘       │   Permissions/Roles)│
                                                                                     └────────────────────┘
```

### 3.1 Layered backend (per feature)
Each feature follows: **DTO → IRepository → Repository (Dapper) → IService → Service → Controller**, registered in
`Program.cs`. Repositories call **stored procedures** via `_dbContext.CreateConnection()`.

### 3.2 Multi‑tenant connection model
- **`ERP_Manager`** holds the registry that maps a login → its SQL server, tenant database and credentials.
- On login, `AuthRepository.GetDatabaseConnection` resolves the user’s connection; subsequent requests run against the
  **tenant database** (e.g. `SC_ERP49`), set per‑request by `DatabaseConnectionMiddleware`.
- **`SEC_ERP`** is the central security database holding the master **user list** (`SEC_USERS_DEF`). The permission‑grant
  tables (`Permissions`, `UserPermissions`, `Roles`, `RolePermissions`, `UserRoles`) live **inside each tenant DB**;
  the admin “users” list reads `SEC_ERP.dbo.SEC_USERS_DEF` via a cross‑database reference.

---

## 4. Authentication & Authorization

### 4.1 Authentication
- `POST /api/Auth` validates credentials against the resolved security DB and returns a **JWT** containing user id,
  roles, the tenant database name, and **permission claims**.
- The token is attached as `Authorization: Bearer …` to every API call.
- After login the user is routed to the configured landing page (`AuthService.getHomepageByRole()` → `/home2`).

### 4.2 Authorization — two complementary layers
1. **Roles** (coarse) — e.g. `Admin`, `Manager`, `Sales`, `VirtualSales`, `DeliveryDriver`, `ServiceInvoices`,
   `Accountant`, `CashLink`/`CashLinkLimit`, `VirtualCashLink`/`VirtualCashLinkLimit`. Drive menu visibility and (where
   used) route guards.
2. **Permissions** (fine‑grained, `Module.Action`) — e.g. `Currencies.Print`, `YearEndClosing.Execute`,
   `AccountLedger.Print`. Enforced in the UI via the `*hasPermission` structural directive on action buttons, sourced
   from the JWT permission claims.

### 4.3 Managing permissions
- **`/accounting/admin/permissions`** (gated by `Admin.ManagePermissions`) shows a user × permission **matrix** grouped
  by system/module. Granting/revoking a key shows/hides the corresponding UI actions after the user’s next login.
- Permission definitions are seeded with `SQL/Permissions/*.sql` (`02_SeedPermissions.sql`, `06_SeedNewPagePermissions.sql`)
  and auto‑granted to the **Administrator** role.

---

## 5. Module Catalog

### 5.1 Accounting — General Ledger
| Page | Route | Notes |
|------|-------|-------|
| Chart of Accounts | `gl/accounts-list` | Tree editor, inline add/edit/delete, Excel import/export |
| Opening Balances | `gl/opening-balances` | |
| Link Groups to Accounts / Link Accounts | `gl/link-groups-accounts`, `gl/link-accounts` | |
| Edit Account Name | `gl/edit-account-name` | |
| Clear Cost Centers / Transfer Account Movements | `gl/clear-cost-centers`, `gl/transfer-account-movements` | |
| Cost‑Center Opening Balances | `gl/cc-opening-balances` | |

### 5.2 Vouchers & Documents
| Page | Route | doctype |
|------|-------|---------|
| Journal Vouchers (القيود) | `vouchers/journal` | 1 |
| Receipt Vouchers (سند قبض) | `receipt-vouchers` | 2 |
| Cheque Payment Voucher (صرف شيكات) | `cheques/payment-voucher` | 3 |
| Cash Payment Voucher (صرف نقدي) | `vouchers/cash-payment` | 4 |
| Document Posting / Un‑posting | `misc/document-posting`, `misc/document-unposting` | |
| Year‑End Closing | `misc/year-end-closing` | 73 |

### 5.3 Cheque Management
`cheques/incoming-first`, `cheques/outgoing-first`, `cheques/deposit`, `cheques/collection`, `cheques/return`,
`cheques/re-return`, `cheques/withdrawal`, `cheques/endorse`, `cheques/tracking`. Backed by `cheq1` (incoming) /
`cheq2` (outgoing) tables and `VoucherType` codes.

### 5.4 Reports
Detailed Statement, Account Belong, **Trial Balance**, **Income Statement**, **Balance Sheet**, Aging Analysis,
Accounts List, Beginning/Monthly Balances, Account Groups, **Cost‑Center Account Balances**, **Cost‑Center Transactions**,
**Incoming Cheque Movement**, **Inward/Outward Cheques**, **Cheques to Beneficiary**, **Payment Vouchers**,
**Missing Vouchers**, **Account Ledger**. All support filter‑driven generation and print; many export to Excel.

### 5.5 Definitions & Sales
- **Definitions:** Banks, Currencies, Taxes, Stamps, Cost Centers, Account Groups.
- **Sales:** sales/service/virtual invoices, transfers, refunds, transferred lists, and **JoFawtara (Fotara)** e‑invoice
  QR generation via `FotaraProxy`.

### 5.6 Dashboards
- **Home** (`/home2`) — default landing: filterable voucher analytics (date range, currency, posted status) with
  switchable, persisted chart types (column/line/area/pie/donut) for Journal, Cash Payment, Cheque Payment, Receipt;
  plus all page shortcuts. (Legacy `/home` and `/dashboard2` exist but are hidden from the menu.)
- **Financial Dashboard** — balance‑sheet / income / trial‑balance / aging summaries.

### 5.7 Administration
Company Info, Appearance (theme/RTL), Permissions matrix, Activity Log.

---

## 6. Cross‑Cutting Features

- **Internationalization:** every label uses a translation key (`Nav.*`, `Home2.*`, `<Feature>.*`). Switching language
  toggles `ar`/`en` and document direction (RTL/LTR). Missing keys render the raw key — always add to **both** JSON files.
- **Theming:** light/dark via `data-theme-mode`, plus an `editorial` app theme. Table styling is globally unified to the
  *currencies* table look (brand‑tinted header, bordered, hover) for both Bootstrap and Material tables.
- **Printing:** a shared `ReportService.printReport(...)` renders consistent printable report layouts.
- **Excel:** import/export via `xlsx` (e.g. chart of accounts, opening balances).
- **Calculator:** press **F2** in any numeric field under the accounting module to open an in‑place calculator.

---

## 7. Data Model Highlights

| Object | Meaning |
|--------|---------|
| `transf1` / `transf2` | GL voucher header / lines. `doctype` (→ `VoucherType.VTypeNo`), `V_Type`, `post`, `myear`, `date`, `cur_no`, `rate`. `Trans_Num` links header↔lines; `transf2.amt` is signed (debit > 0). |
| `VoucherType` | Voucher type catalog: 1 G.L, 2 Receipt, 3 Cheque Payment, 4 Cash Payment, 5 Beg. inward cheques, 73 Year‑end close, … |
| `cheq1` / `cheq2` | Incoming / outgoing cheques (status, dates, bank, drawer, amount). |
| `accf` | Account master (no, name/Ename, branch, belong, level). A trigger blocks posting to parent (non‑leaf) accounts. |
| `Permissions`, `Roles`, `UserPermissions`, `RolePermissions`, `UserRoles` | Authorization (per tenant DB). |
| `SEC_USERS_DEF` | Central user definitions (in `SEC_ERP`). |

---

## 8. Deployment

### 8.1 Frontend (IIS)
1. `npm run build` → output in **`dist/preview/browser/`** (production config swaps in `environment.prod.ts`).
2. Copy the **contents** of that folder to the IIS site path; app pool **No Managed Code**.
3. The included **`web.config`** rewrites all routes to `index.html` — requires the IIS **URL Rewrite** module.
4. The site is built for root (`<base href="/">`); for a sub‑application rebuild with `--base-href /subpath/`.

### 8.2 Cache‑busting (important)
Non‑hashed assets (`assets/i18n/*.json`) are requested with `?v=${appVersion}`. **Bump `appVersion`** in
`environment.ts`, `environment.prod.ts` **and** the `currentVersion` constant in `app.component.ts` on every deploy that
changes translations/assets — otherwise clients keep serving cached JSON and new keys appear as raw text. The version
check also clears `localStorage`/`sessionStorage` and reloads each client once.

### 8.3 Backend & Database
- The API points to the production base URL configured in `environment.prod.ts` (`apiUrl`). Ensure CORS allows the
  site origin.
- Apply SQL changes by running the scripts in `CashVanApi/SQL/**` against each tenant database (and `SEC_ERP` where
  noted). Restart the API after deploying new endpoints/DLLs.

---

*See `USE_CASES.md` for actor‑level use cases and workflows.*
