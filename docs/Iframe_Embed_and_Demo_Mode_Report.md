# ErpLite — Cross-Origin Iframe Embedding & Demo Mode

**Prepared:** 2026-06-14
**App:** ErpLite (Angular 17 SPA) + CashVanApi (.NET 7 API)
**Goal:** Let the Skyline marketing site embed ErpLite in a cross-origin `<iframe>` and offer a no-login "demo" preview, without weakening security more than necessary.

---

## 1. Executive summary

| Area | Status |
|---|---|
| Cross-origin framing locked to an allowlist (CSP `frame-ancestors`) | ✅ Implemented (IIS `web.config`) |
| `X-Frame-Options` removed (can't override the allowlist) | ✅ Implemented |
| Frame-busting code | ✅ None existed — nothing to remove |
| Auth method | **JWT token in `localStorage`/`sessionStorage` (no cookies)** — iframe-safe, no `SameSite` change needed |
| Demo mode (`?demo=1` auto-login → dashboard) | ✅ Implemented (frontend + backend endpoint) |
| Demo credentials in the JS bundle | ✅ **None** — server-side `DemoLogin` endpoint issues the token |
| Demo-login rate limiting | ✅ Per-IP, 10/min |
| Demo "sample data" banner | ✅ Implemented |
| Normal login when `demo=1` absent | ✅ Unchanged |
| **Demo account provisioning (sandbox tenant, read-only)** | ⚠️ **Action required — must be done by ops/DBA (see §6)** |

---

## 2. Cross-origin framing (CSP)

The Angular app is served as static files by **IIS**, whose headers are controlled by `web.config`. Previously there was **no framing restriction**. Added a framing allowlist and dropped any legacy `X-Frame-Options`.

**Header now sent on every app response:**
```
Content-Security-Policy: frame-ancestors 'self' https://www.skyline-inov.com http://localhost:5460 http://localhost:8088
```
- Only `frame-ancestors` is set (not a full CSP), so the app's own resource loading is unaffected — nothing else is restricted or broken.
- `<remove name="X-Frame-Options" />` guarantees an inherited `DENY`/`SAMEORIGIN` can't override the allowlist.

**File:** `src/web.config` (`<system.webServer><httpProtocol><customHeaders>`), also synced into `dist/preview/browser/web.config`.

> ⚠️ **`SKYLINE-DOMAIN` was a placeholder, filled with `https://www.skyline-inov.com`.** Verify this is the exact marketing-site origin and edit that one line if different (an inline comment in `web.config` flags it). A wrong value fails *safe* — framing is blocked on the real site; it never over-permits.

---

## 3. Demo mode

### 3.1 Trigger & flow
The embed loads `https://testerplite.skyline-inov.com/?demo=1`.

1. At **app bootstrap** (an Angular `APP_INITIALIZER`, which runs **before** the router and auth guard), the app checks for `demo=1`.
2. If present **and there is no valid session**, it calls `POST /api/Auth/DemoLogin` (empty body) and stores the returned JWT in **`sessionStorage`** (ephemeral; never written to `localStorage`).
3. It then rewrites the URL to the dashboard (`/home2`) via `history.replaceState`, so routing lands on the dashboard instead of the login screen. **No routing/login-component changes were needed.**
4. A `demoMode` flag is kept in `sessionStorage` — it survives in-app navigation and iframe refresh, and on refresh the existing session is reused (no second demo login).

Without `?demo=1`, the initializer returns immediately — **a complete no-op**.

### 3.2 No credentials in the browser — backend endpoint
A dedicated server endpoint issues the demo token, so **no demo password ships in the JS bundle**:

```
POST /api/Auth/DemoLogin        (AllowAnonymous, rate-limited per IP: 10/min)
```
- Reads the demo account's credentials from **server config** (`appsettings.json → "Demo": { Login_Name, Password }`).
- Reuses the normal login path (`CheckUserAsync`) and returns the same JWT response.
- **Disabled by default:** returns `404` until `Demo` is configured.

### 3.3 Demo banner
A small fixed pill — **"وضع تجريبي — بيانات نموذجية فقط / Demo mode — sample data only"** — is shown only while the demo session is active (`General.DemoBanner`, ar + en).

---

## 4. Auth method & iframe compatibility

- **Token-based (JWT), not cookies.** The token is read via `getToken()` (`localStorage ?? sessionStorage`) and sent as `Authorization: Bearer`. A whole-tree search found **no `document.cookie`, no `withCredentials`, no cookie library, and nothing reading the token from a cookie.**
- Because auth is in storage (not third-party cookies), it works inside a cross-site iframe with **no `SameSite=None; Secure` change**.
- The demo login completes **inside the frame** (in the bootstrap initializer), so write + reads happen in the same storage partition — robust even under strict-privacy browsers.

---

## 5. Frame-busting

Searched the whole `src/` tree (`.ts`/`.html`/`.js`, plus `index.html`/`main.ts`) for `window.top`, `top.location`, `self !== top`, `parent.location`, `framebust`, etc. **No frame-busting code exists** — nothing to remove.

---

## 6. ⚠️ Security posture & required provisioning

Auto-login from a public page makes the demo account **effectively public to anyone on the internet.** The implementation enforces least-privilege through the **existing permission system** — `*hasPermission` hides every Create/Edit/Delete/Print/transfer button and the server's `[HasPermission]` blocks them — **but only if the demo account is provisioned correctly.** This is an ops/DBA task and **must be completed before enabling demo mode:**

1. **Dedicated user** — create a new login (e.g. `demo`) in `SEC_ERP`. **Never** a real or admin account.
2. **Sandbox tenant** — in `ERP_Manager`, map that user to a **throwaway tenant DB with sample/anonymized data only** (no real PII/financials). Never a production tenant.
3. **Read-only grants** — grant **only `*.View`** permission keys; **no** Create/Edit/Delete/Print, **no** `SalesTransfer`/`ServiceTransfer` roles (those fire outbound Fotara calls on login), **no** admin/permissions pages. Example:
   ```sql
   INSERT INTO UserPermissions (UserId, PermissionKey)
   SELECT @demoUserId, [Key] FROM Permissions WHERE [Key] LIKE '%.View';
   ```
4. **Config** — set the demo user's `Login_Name` + a strong password in `appsettings.json → Demo` (server-side only). Keep `AppSettings:TokenExpiryHours` short (currently `1`).
5. **Periodic reset (recommended)** — schedule a job to restore the sandbox tenant from a clean snapshot so any stray edits don't accumulate.

**Residual risk:** a single global demo account behind a public iframe is reachable by anyone; the per-IP rate limit + read-only sandbox + short-lived token are the mitigations. Treat that tenant as **fully public and disposable**.

---

## 7. Files changed

**Frontend (`ErpLite`)**
| File | Change |
|---|---|
| `src/app/shared/services/auth.service.ts` | `demoLogin()`, `isDemoMode`, shared `storeSession()`; `clearLocalStorage()` clears `demoMode` |
| `src/app/app.config.ts` | `initDemoFactory` `APP_INITIALIZER` (demo bootstrap) |
| `src/app/shared/interceptor/auth.interceptor.ts` | skip token check for `/Auth/DemoLogin` |
| `src/app/app.component.ts` / `.html` / `.scss` | demo banner + `isDemo` getter |
| `src/assets/i18n/ar.json`, `en.json` | `General.DemoBanner` |
| `src/web.config` (+ `dist` copy) | CSP `frame-ancestors` + remove `X-Frame-Options` |

**Backend (`CashVanApi`)**
| File | Change |
|---|---|
| `CashVanApi/Controllers/AuthController.cs` | `DemoLogin` endpoint (config-driven, rate-limited) |
| `CashVanApi/Program.cs` | per-IP rate-limiter policy `demo-login` + `UseRateLimiter()` |
| `CashVanApi/appsettings.json` | empty `"Demo"` section (disabled until configured) |

---

## 8. Deployment checklist

1. **Provision the demo account/tenant** (§6) and set `appsettings.json → Demo`.
2. **Rebuild & redeploy CashVanApi** (the `DemoLogin` endpoint + rate limiter are source changes; the endpoint stays 404 until `Demo` is set).
3. **Confirm the Skyline origin** in `web.config` (`frame-ancestors`).
4. **Rebuild the Angular `dist`** (new JS/i18n) and bump `appVersion`; publish `dist/preview/browser/` to IIS.
5. Embed `https://testerplite.skyline-inov.com/?demo=1` in the Skyline page.

---

## 9. Verification performed

- Frontend builds clean with all demo wiring.
- Confirmed token-based auth / zero cookie usage / zero frame-busting by full-tree search.
- Backend changes reviewed against the standard .NET 7 rate-limiting + config patterns (not compiled locally — the running API instance must not be rebuilt mid-session; build on deploy).
