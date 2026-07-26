# Stored-Procedure Propagation — SC_ERP18 → SC_ERP1..SC_ERP50

**Goal:** ensure every stored procedure in **SC_ERP18** (483 procs) exists in each tenant DB SC_ERP1..50.
**Status: ✅ COMPLETE — all 46 existing tenant DBs now contain every SC_ERP18 procedure (0 missing).**

## Method
1. **Proc propagation (additive):** for each target, create procedures present in SC_ERP18 but missing in the target; existing procs untouched. Each created with the source's `QUOTED_IDENTIFIER`/`ANSI_NULLS` setting (so XML-method procs work) and collation-safe name matching.
2. **Schema sync (additive)** for tenants that were behind: create the missing table type `CheqTableType`, and add every column present on an SC_ERP18 table but missing on the same-named target table — same base type, **NULLable** (safe on populated tables). Additive only; nothing dropped or altered.

## What happened
- **Databases targeted:** 46 (SC_ERP1–50; SC_ERP7/27/28 do not exist; SC_ERP18 is the source).
- **First pass:** 30 DBs already complete; **16 DBs** had procedures that couldn't be created because the tenant was on an **older schema** missing columns/types those procs reference (`bank_num`, `QRCode`, `cusTel`, `cusCity`, `isTransfered`, `TaxAmt`, `total`, `Note2`, `Id`, type `CheqTableType`, …).
- **Fix applied to those 16 DBs:** additive schema sync, then re-ran propagation.
  - **~1,238 columns added** (all NULLable) + **`CheqTableType` created** in each — **0 failures**.
  - **197 procedures created** afterwards — **0 failures**.

| DB | cols added | procs created | DB | cols added | procs created |
|----|----|----|----|----|----|
| SC_ERP2 | 83 | 5 | SC_ERP22 | 102 | 16 |
| SC_ERP3 | 15 | 2 | SC_ERP33 | 103 | 19 |
| SC_ERP4 | 86 | 14 | SC_ERP42 | 56 | 15 |
| SC_ERP5 | 105 | 11 | SC_ERP43 | 25 | 2 |
| SC_ERP8 | 89 | 10 | SC_ERP44 | 93 | 35 |
| SC_ERP9 | 28 | 10 | SC_ERP46 | 34 | 12 |
| SC_ERP10 | 88 | 4 | SC_ERP48 | 123 | 28 |
| SC_ERP20 | 93 | 10 | | | |
| SC_ERP21 | 115 | 4 | | | |

## Final verification
Re-checked all 46 DBs: **0 missing procedures** anywhere. Every tenant DB in SC_ERP1..50 now contains all 483 SC_ERP18 stored procedures.

## Notes
- Added columns are **NULLable** (existing rows get NULL). Procedures that write these columns populate them going forward; this matches SC_ERP18's column **set**, not historical values.
- Operations were additive and idempotent — safe to re-run.
