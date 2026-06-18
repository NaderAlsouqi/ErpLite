# ErpLite Documentation

Documentation for the **ErpLite** accounting & sales ERP (Angular 17 frontend · CashVanApi .NET backend · SQL Server).

| Document | Contents |
|----------|----------|
| [SYSTEM_DOCUMENTATION.md](./SYSTEM_DOCUMENTATION.md) | Purpose, technology stack, architecture (multi‑tenant), auth & permissions, module catalog, data model, deployment (IIS + cache‑busting). |
| [USE_CASES.md](./USE_CASES.md) | Actors and actor‑level use cases (login, GL, vouchers, cheques, sales, definitions, reporting, administration) with flows and a permission map. |

## Quick facts
- **Default landing page:** `/home2` (voucher analytics dashboard + shortcuts).
- **Languages:** Arabic / English (`src/assets/i18n/ar.json`, `en.json`) — add new keys to **both**.
- **Build:** `npm run build` → `dist/preview/browser/` (production). Bump `appVersion` (env files + `app.component.ts`) on every deploy.
- **API:** `CashVanApi` — feature layering DTO→Repository(Dapper)→Service→Controller, stored‑procedure driven, JWT auth.
- **Databases:** tenant DBs (`SC_ERP*`) for accounting + permissions; `SEC_ERP` central users; `ERP_Manager` connection registry.
