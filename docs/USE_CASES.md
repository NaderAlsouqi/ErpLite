# ErpLite — Use Cases

Actor‑level use cases for the ErpLite accounting & sales ERP. Each use case lists the **actor**, **preconditions**,
**main flow**, key **alternate/exception flows**, and **postconditions**. See `SYSTEM_DOCUMENTATION.md` for architecture.

---

## Actors

| Actor | Description |
|-------|-------------|
| **Administrator** | Full access; manages users, permissions, company settings. |
| **Manager** | Oversees accounting & sales operations and reports. |
| **Accountant** | Day‑to‑day GL, vouchers, cheques, reconciliations, reports. |
| **Salesperson** (`Sales` / `VirtualSales`) | Creates invoices/refunds (real or virtual). |
| **Service operator** (`ServiceInvoices`) | Creates and transfers service invoices. |
| **Delivery driver** | Views/transfers assigned delivery invoices. |
| **Cashier** (`CashLink*`) | Cash/receipt operations. |
| **System** | Background behaviors (auth, posting triggers, e‑invoice QR, activity log). |

---

## A. Authentication & Access

### UC‑01 Log in
- **Actor:** Any user
- **Preconditions:** Valid account exists in the security DB; account mapped to a tenant in `ERP_Manager`.
- **Main flow:** User enters login name + password → system resolves the user’s database, validates credentials, issues a
  JWT (roles + permission claims) → user lands on **Home** (`/home2`).
- **Alternate:** Invalid credentials → error toast, stays on login. Forgot password → email reset link (EmailJS).
- **Postcondition:** Authenticated session; menu and action buttons reflect the user’s roles/permissions.

### UC‑02 Manage permissions
- **Actor:** Administrator (`Admin.ManagePermissions`)
- **Preconditions:** Logged in; permission keys seeded.
- **Main flow:** Open **Admin → Permissions** → pick a user → toggle permissions in the module matrix → **Save**.
- **Postcondition:** User’s grants updated; UI actions appear/disappear after that user’s next login.

### UC‑03 Switch language / theme
- **Actor:** Any user
- **Main flow:** Toggle language (AR/EN) → UI text and direction (RTL/LTR) switch instantly; toggle dark/light theme.
- **Postcondition:** Preference applied (and remembered) for the session.

---

## B. General Ledger

### UC‑10 Maintain Chart of Accounts
- **Actor:** Accountant / Administrator
- **Preconditions:** Logged in.
- **Main flow:** Open **GL → Accounts List** → expand the tree → add a child account / edit name / set branch &
  cost‑center flags → **Save**. Optionally **Import** from Excel or **Export**.
- **Exception:** Deleting an account in use is blocked (validation/`CanDelete`); posting to a parent (non‑leaf) account is
  rejected by a DB trigger.
- **Postcondition:** Account structure updated.

### UC‑11 Enter a Journal Voucher (قيد)
- **Actor:** Accountant
- **Preconditions:** Accounts and fiscal year exist.
- **Main flow:** Open **Vouchers → Journal** → set date, serial type, currency → add debit/credit lines (account,
  cost center, amount, description) until **balanced (difference = 0)** → **Save**.
- **Alternate:** Unbalanced entry is flagged and cannot be saved; recall an existing voucher via navigation/serial.
- **Postcondition:** Voucher stored in `transf1`/`transf2` (doctype 1).

### UC‑12 Receipt / Cash‑Payment / Cheque‑Payment vouchers
- **Actor:** Accountant / Cashier
- **Main flow:** Open the relevant voucher screen → choose party account + cash/bank account → enter amount & details →
  **Save** (and print).
- **Postcondition:** Voucher posted (doctype 2 receipt / 4 cash payment / 3 cheque payment).

### UC‑13 Post / Un‑post documents
- **Actor:** Accountant / Manager
- **Main flow:** Open **Misc → Document Posting** (or Un‑posting) → select documents/range → execute.
- **Postcondition:** `post` flag updated on the affected vouchers.

### UC‑14 Year‑End Closing
- **Actor:** Administrator / Manager (`YearEndClosing.Execute`)
- **Preconditions:** Fiscal year complete; P&L account chosen.
- **Main flow:** Open **Misc → Year‑End Closing** → confirm → a closing voucher (doctype 73, dated 31/12) is generated
  that nets income‑statement leaf accounts into the P&L account; progress bar shows status.
- **Alternate:** **Delete** (`YearEndClosing.Delete`) removes the closing voucher for the year.
- **Postcondition:** Year‑end closing entry created/removed.

---

## C. Cheque Management

### UC‑20 Register incoming / outgoing cheques
- **Actor:** Accountant
- **Main flow:** Open **Cheques → Incoming/Outgoing (first)** → enter cheque number, bank, drawer, dates, amount,
  currency → **Save**.
- **Postcondition:** Cheque recorded in `cheq1`/`cheq2` with an initial status.

### UC‑21 Cheque lifecycle operations
- **Actor:** Accountant
- **Main flow:** Move cheques through **Deposit → Collection**, or handle **Return / Re‑deposit returned / Withdrawal /
  Endorsement**, each producing the corresponding GL voucher.
- **Postcondition:** Cheque status and ledger updated.

### UC‑22 Track cheques
- **Actor:** Accountant / Manager
- **Main flow:** Open **Cheques → Tracking** (or the cheque reports) → filter by serial type/number/value/date →
  view the cheque’s movement history.
- **Postcondition:** Read‑only insight; printable.

---

## D. Sales & Invoicing

### UC‑30 Create a sales invoice
- **Actor:** Salesperson
- **Preconditions:** Customer & items defined.
- **Main flow:** Open **Sales → Invoice / Add Invoice** → select customer → add lines (item, qty, price, discount, tax)
  → **Save**.
- **Alternate:** Service invoice and Virtual invoice variants follow the same pattern under their menus.
- **Postcondition:** Invoice persisted; available for transfer/refund/print.

### UC‑31 Transfer invoice to e‑invoicing (JoFawtara / Fotara)
- **Actor:** Salesperson / System
- **Preconditions:** Invoice eligible; Fotara credentials configured.
- **Main flow:** Select untransferred invoices → system sends each to the Fotara API and stores the returned **QR code**
  on the invoice.
- **Postcondition:** Invoice marked transferred with QR; failures logged, others continue.

### UC‑32 Refund an invoice
- **Actor:** Salesperson / Manager
- **Main flow:** Open the invoice → **Refund** → confirm lines/amount → **Save**.
- **Postcondition:** Refund document created and linked to the original invoice.

---

## E. Definitions

### UC‑40 Manage a definition (Currency example)
- **Actor:** Accountant / Administrator
- **Main flow:** Open **Definitions → Currencies** → add/edit (number, AR/EN name, rate, decimals, symbols) → **Save**;
  delete with confirmation; **Print** the list.
- **Variants:** Banks, Taxes, Stamps, Cost Centers, Account Groups follow the same master‑data pattern with their own
  `*.Create/Delete/Print` permissions.
- **Postcondition:** Definition list updated.

---

## F. Reporting & Analytics

### UC‑50 Generate a financial report
- **Actor:** Accountant / Manager
- **Preconditions:** Posted data exists.
- **Main flow:** Open a report (e.g. **Trial Balance**, **Income Statement**, **Balance Sheet**, **Detailed Statement**,
  **Aging Analysis**) → set filters (dates, account range, currency, posted status, etc.) → **Generate** → review → **Print**.
- **Behavior:** Changing any filter clears previously shown results; many reports support deep‑links to source vouchers
  and Excel export.
- **Postcondition:** Report rendered; no data change.

### UC‑51 Account Ledger & drill‑down
- **Actor:** Accountant
- **Main flow:** Open **Misc → Account Ledger** → choose account + period → **Fetch** → see opening balance, movements
  (running balance), final balance. Click a row’s document number to open its voucher, or open the **Detailed Statement**
  pre‑filtered for the same account.
- **Postcondition:** Read‑only analysis.

### UC‑52 Missing / Unbalanced vouchers
- **Actor:** Accountant / Auditor
- **Main flow:** Open **Misc → Missing Vouchers** → select voucher type (auto‑fills the document number min/max) →
  **Run** to list gaps in the numbering, or switch to the **Unbalanced** view to find vouchers whose lines don’t net to
  zero.
- **Postcondition:** Exceptions surfaced for correction.

### UC‑53 Voucher dashboard (Home)
- **Actor:** Any authorized user
- **Main flow:** Open **Home** → set **date range / currency / posted‑status** filters (auto‑applied & remembered) →
  view per‑type KPIs, a data grid and a chart for **Journal, Cash Payment, Cheque Payment, Receipt**; switch each chart’s
  type (column/line/area/pie/donut) — the choice is persisted per chart.
- **Postcondition:** At‑a‑glance overview; no data change.

---

## G. Administration & System

### UC‑60 Configure company & appearance
- **Actor:** Administrator
- **Main flow:** Open **System → Company Info** (name, decimals, branding) / **Settings → Appearance** (theme, RTL) →
  save. Settings are loaded app‑wide.

### UC‑61 Review activity log
- **Actor:** Administrator / Manager
- **Main flow:** Open **Activity Log** → filter → review user actions/audit trail.

### UC‑62 In‑field calculator
- **Actor:** Any user (accounting module)
- **Main flow:** Focus a numeric field → press **F2** → a calculator opens anchored to the field; the result is written
  back on apply.

---

## Permission ↔ Use‑case map (selected)

| Use case | Permission key(s) |
|----------|-------------------|
| Manage permissions (UC‑02) | `Admin.ManagePermissions` |
| Maintain currencies (UC‑40) | `Currencies.Create` / `.Delete` / `.Print` |
| Year‑end closing (UC‑14) | `YearEndClosing.Execute` / `.Delete` |
| Account ledger (UC‑51) | `AccountLedger.Print` |
| Cheque/cost‑center reports (UC‑50) | `InwardCheques.*`, `OutwardCheques.*`, `PaymentVouchers.*`, `CostCenterAccBalances.*`, `CostCenterTransactions.*`, `IncomingChequeMovement.*`, `ChequesToBeneficiary.*`, `MissingVouchers.*` |
| Invoices (UC‑30/31/32) | `Invoices.*`, `ServiceInvoices.*`, `VirtualInvoices.*`, `Refunds.*` |

> Permission gating is applied at the **UI action** level via `*hasPermission`. Pages without a gate are open to any
> authenticated user (except the Permissions admin page).
