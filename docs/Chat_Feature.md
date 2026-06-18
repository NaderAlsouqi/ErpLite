# In-app Chat (real-time support)

**Added:** 2026-06-15
**Stack:** Angular 17 (`@microsoft/signalr` client) + .NET 7 SignalR hub + SQL Server (central `ERP_Manager` store)

## What it does
A regular user — in **any** tenant — gets a floating chat bubble to message support.
**Chat is CROSS-TENANT and centralized:** a customer's message lands in **every
admin's inbox across all tenants**; the **first admin to reply "claims"** the
conversation (1:1 from then on). Real-time delivery is via SignalR. Online admins
receive it instantly; if none are online it queues in the inbox until one opens it.
Admins see a "support online" presence dot and the **customer's company (`TenantDb`)**
on each conversation. **Hidden in the public demo session.**

- **Chat admin** = a user with the `Admin` role **or** the `Admin.ManagePermissions`
  permission (same rule on the client and in the JWT claims on the server).
  ⚠️ Every such admin in EVERY tenant sees ALL customers' conversations — this is
  the chosen model; chat content is **not** isolated per company.
- **Central store:** all conversations/messages live in **`ERP_Manager`** (not
  per-tenant), keyed by the globally-unique central SEC `User_ID` / `Login_Name`.
  Each conversation records the customer's `TenantDb` for admin context.

## Architecture
- **Persistence** happens in `ChatController` (HTTP), which writes to the central
  `ERP_Manager` DB via `IDbContext.CreateConnectionForDatabaseConnections()`. The
  customer's own tenant DB (resolved by the request middleware) is recorded on the
  conversation as `TenantDb` — it is NOT where chat is stored.
- **The hub does NO DB work.** On connect it subscribes the connection to global
  groups: own user group `u:{userId}` and (for admins) the shared `admins` group.
  The controller pushes saved messages to those groups via `IHubContext<ChatHub>`.
- WebSocket can't send the `Authorization` header, so the client passes the JWT
  as `?access_token=…`; `JwtBearerEvents.OnMessageReceived` reads it for the
  `/chatHub` path. Client uses `withCredentials:false` (API CORS = AllowAnyOrigin).

## Files
**Backend (`CashVanApi`)**
| File | Purpose |
|---|---|
| `CashVanApi/SQL/Chat_Schema.sql` | central tables + 7 stored procs (idempotent; deploy to **ERP_Manager** with `sqlcmd -I`) |
| `CashVanAPI.Core/DTO/ChatDtos.cs` | DTOs (incl. `UserLogin`, `TenantDb`) |
| `CashVanAPI.Core/IRepository/IChatRepository.cs`, `Infra/Repository/ChatRepository.cs` | Dapper SP calls over the central connection |
| `CashVanAPI.Core/IService/IChatService.cs`, `Infra/Service/ChatService.cs` | service (presence window = 45s) |
| `CashVanApi/Hubs/ChatHub.cs`, `Hubs/ChatGroups.cs` | SignalR hub + global group/admin helpers |
| `CashVanApi/Controllers/ChatController.cs` | REST endpoints + hub push |
| `CashVanApi/Program.cs` | `AddSignalR().AddJsonProtocol(PascalCase)`, JWT-in-query-string, `MapHub<ChatHub>("/chatHub")`, DI |
| `CashVanAPI.Core/ICommon/IDbContext.cs` + `Infra/Common/DbContext.cs` | `CurrentDatabaseName` (recorded as the customer's `TenantDb`) |

**Frontend (`ErpLite`)**
| File | Purpose |
|---|---|
| `src/app/shared/services/chat.service.ts` | SignalR connection + REST calls (models incl. `TenantDb`) |
| `src/app/shared/components/chat-widget/` | floating widget (user + admin modes); admin inbox shows the company |
| `src/app/app.component.ts` / `.html` | mounts `<app-chat-widget>`; reacts to login/logout |
| `src/assets/i18n/ar.json`, `en.json` | `Chat.*` keys |
| `package.json` | `@microsoft/signalr` dependency |

## REST endpoints (all `[Authorize]`, under `/api/Chat`)
- `POST Send` `{Body}` — user sends → pushes to the global `admins` group.
- `GET User/Messages?afterId=` — user thread.
- `GET ActiveAdmins` — "support online?" indicator.
- `POST Admin/Heartbeat` — admin presence (client sends every 20s).
- `GET Admin/Conversations` — inbox (all conversations assigned-to-me OR unassigned).
- `GET Admin/Messages?conversationId=&afterId=` — a conversation's thread.
- `POST Admin/Reply` `{ConversationId, Body}` — reply (claims conv) → pushes to user + admins.

## Deployment checklist
1. **DB:** run `CashVanApi/SQL/Chat_Schema.sql` against **`ERP_Manager`** ONCE
   (`sqlcmd -S <server> -U sa -P <pwd> -d ERP_Manager -I -i Chat_Schema.sql`).
   Already deployed. (The earlier per-tenant chat tables were dropped.)
2. **Backend:** rebuild & redeploy `CashVanApi`, then **restart** it. ⚠️ Do this at
   a controlled time — the running instance serves from the source dir, so building
   over it mid-run would interrupt the live API.
3. **Frontend:** prod build (`ng build`), publish `dist/preview/browser/`. `appVersion`
   bumped to `1.0.12` (cache-bust).

## Notes / future
- Delivery is real-time via SignalR; presence is a DB heartbeat (admin "online"
  if seen < 45s). No history pruning/archival yet (conversations stay `open`).
- To change who is a chat admin, edit `ChatGroups.IsAdmin` (server) and the
  `isAdmin` check in `chat-widget.component.ts` together. If per-company isolation
  is ever wanted, re-introduce a tenant key on groups + the inbox query.
