# Stored-Procedure Propagation Report — SC_ERP18 → SC_ERP1…SC_ERP50

**Server:** 94.127.211.111 (test environment)
**Source of truth:** `SC_ERP18` (452 procedures)
**Goal:** Ensure every `SC_ERP1`…`SC_ERP50` tenant database contains all of SC_ERP18's stored procedures.
**Policy:** Add **missing** procedures only — existing procedures in each target were **not** overwritten.

---

## Method
1. Snapshotted all 452 procedures (name + definition) from `SC_ERP18`.
2. Enumerated every online `SC_ERP<1–50>` database on the server (excluding the source `SC_ERP18`).
3. For each target, computed the set of SC_ERP18 procedures it was missing, then created each one in the target's context via `EXEC <target>.sys.sp_executesql @definition` (both DBs share the server).
4. Forced `COLLATE DATABASE_DEFAULT` on all name comparisons to resolve an Arabic collation conflict (`Arabic_CI_AI_KS` vs `Arabic_CI_AS`) that otherwise blocked SC_ERP38/39/40.
5. Each `CREATE` was wrapped in `TRY/CATCH`, so a failure in one procedure never aborted the run.

---

## Results at a glance
| Metric | Value |
|---|---|
| Target databases processed | **46** |
| Procedures **created** | **9,457** |
| Procedures **failed** (schema drift) | **197** |
| Procedures skipped (encrypted/no definition) | 0 |
| Databases **fully synced** with SC_ERP18 | **30 / 46** |
| Databases with remaining gaps | **16** |

**Databases that do not exist on the server (in range, skipped):** `SC_ERP7`, `SC_ERP27`, `SC_ERP28`.

---

## Per-database results
| DB | Created | Failed | DB | Created | Failed |
|----|--------:|-------:|----|--------:|-------:|
| SC_ERP1 | 203 | 0 | SC_ERP26 | 188 | 0 |
| SC_ERP2 | 201 | 5 | SC_ERP29 | 188 | 0 |
| SC_ERP3 | 200 | 2 | SC_ERP30 | 188 | 0 |
| SC_ERP4 | 192 | 14 | SC_ERP31 | 199 | 0 |
| SC_ERP5 | 186 | 11 | SC_ERP32 | 188 | 0 |
| SC_ERP6 | 195 | 0 | SC_ERP33 | 239 | 19 |
| SC_ERP8 | 186 | 10 | SC_ERP34 | 188 | 0 |
| SC_ERP9 | 225 | 10 | SC_ERP35 | 188 | 0 |
| SC_ERP10 | 196 | 4 | SC_ERP36 | 188 | 0 |
| SC_ERP11 | 197 | 0 | SC_ERP37 | 203 | 0 |
| SC_ERP12 | 195 | 0 | SC_ERP38 | 268 | 0 |
| SC_ERP13 | 188 | 0 | SC_ERP39 | 188 | 0 |
| SC_ERP14 | 188 | 0 | SC_ERP40 | 188 | 0 |
| SC_ERP15 | 188 | 0 | SC_ERP41 | 203 | 0 |
| SC_ERP16 | 188 | 0 | SC_ERP42 | 240 | 15 |
| SC_ERP17 | 188 | 0 | SC_ERP43 | 325 | 2 |
| SC_ERP19 | 188 | 0 | SC_ERP44 | 392 | 35 |
| SC_ERP20 | 185 | 10 | SC_ERP45 | 190 | 0 |
| SC_ERP21 | 188 | 4 | SC_ERP46 | 246 | 12 |
| SC_ERP22 | 237 | 16 | SC_ERP47 | 188 | 0 |
| SC_ERP23 | 188 | 0 | SC_ERP48 | 259 | 28 |
| SC_ERP24 | 188 | 0 | SC_ERP49 | 147 | 0 |
| SC_ERP25 | 188 | 0 | SC_ERP50 | 188 | 0 |

---

## The 16 databases still missing procedures
| DB | Still missing |
|----|--------------:|
| SC_ERP44 | 35 |
| SC_ERP48 | 28 |
| SC_ERP33 | 19 |
| SC_ERP22 | 16 |
| SC_ERP42 | 15 |
| SC_ERP4 | 14 |
| SC_ERP46 | 12 |
| SC_ERP5 | 11 |
| SC_ERP8 | 10 |
| SC_ERP9 | 10 |
| SC_ERP20 | 10 |
| SC_ERP2 | 5 |
| SC_ERP21 | 4 |
| SC_ERP10 | 4 |
| SC_ERP3 | 2 |
| SC_ERP43 | 2 |

---

## Why the 197 failed — schema drift (not a copy error)
These procedures could not be created because the target tenant **has the referenced table but it is missing a column** (or a user-defined type) that the SC_ERP18 procedure uses. SQL Server checks columns/types of *existing* objects at `CREATE` time (only entirely-missing tables get deferred resolution), so the create is rejected. The procedure copy mechanism worked correctly — the tenant schema is simply older.

Failure breakdown (all 197):

| Missing column / type | Count | Example procedures affected |
|---|--:|---|
| `bank_num` | 44 | SP_AddCurrency, SP_GetAllCurrencies, SP_GetCurrencyById, SP_UpdateCurrency |
| `QRCode` | 30 | GetQRCode, UpdateQRCode, GetRefundQRCode, UpdateRefundQRCode |
| `cusTel` | 28 | GetInvoiceDetails*, GetInvoiceHeaderByBillNumber |
| `isTransfered` | 18 | DeleteInvoice, GetTransferred*/Untransferred* invoice SPs |
| `Id` | 14 | GetCompanyImagePath, UpdateCompanyImagePath |
| `cusCity` | 12 | GetInvoiceHeaderByTransNo |
| `TaxAmt` | 12 | SP_GetServBillHeader, SP_InsertServBillHeader, SP_InsertServBillRefundHeader |
| `taxamt` | 9 | Service_GetRefundDetails, Service_GetRefund* |
| **type** `dbo.CheqTableType` | 9 | InsertNewTransactionByCheq (missing table type) |
| `Note2` | 6 | GetInvoiceItemsByBillNumber, GetInvoiceItemsByTransNo |
| `total` | 4 | SP_UpdateCostCenter |
| `type` | 3 | GetAllClusef |
| `Item_Name` | 3 | Service_GetTransferRefundInvoiceData |
| `RIsTransfered` | 2 | — |
| `PoNumber` | 2 | — |
| `Offers` | 1 | InsertSalesInvoicePayback |

---

## To close the remaining 197
Propagating procedures alone is not enough for these 16 tenants — their **table schemas must be aligned with SC_ERP18 first**:
- Add the missing columns to the relevant tables (e.g. `bank_num` on the currency table, `QRCode`/`Id` on the company table, `cusTel`/`cusCity`/`Note2`/`isTransfered`/`PoNumber`/`Offers` on the invoice tables, `TaxAmt`/`taxamt`/`Item_Name` on the service-bill/service tables, `total`, `type`).
- Create the user-defined table type `dbo.CheqTableType` where missing.

After the schema is aligned, re-running `docs/propagate_sps_from_SC_ERP18.sql` will create the rest (it is idempotent — it only adds procedures that are still missing).

*Generated 2026-06-10.*
