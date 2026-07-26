import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { toast, waitForApi } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { ChequeOpsPage, ChequeOpsOptions } from '../../pages/cheques/cheque-ops.page';

/**
 * Cheque OPERATION screens — deposit / collection / return / re-return /
 * withdrawal / endorsement. These act on EXISTING cheques (filtered by status):
 * pick a cheque from the dropdown, its data fills the row, then Save posts a
 * status change. Read-only coverage runs unconditionally; the actual status
 * change is gated by requireWrites and skips gracefully when no cheque exists.
 */
interface OpsConfig extends ChequeOpsOptions {
  title: string;
  /** Number of columns in the list-tab table. */
  listCols: number;
}

const OPS: OpsConfig[] = [
  {
    title: 'deposit',
    path: '/accounting/cheques/deposit',
    controller: 'ChequeDeposit',
    hasDebitAcc: true,
    hasDepositType: true,
    listCols: 6,
  },
  {
    title: 'collection',
    path: '/accounting/cheques/collection',
    controller: 'ChequeCollection',
    hasDebitAcc: true,
    listCols: 5,
  },
  {
    title: 'return',
    path: '/accounting/cheques/return',
    controller: 'ChequeReturn',
    hasDebitAcc: false,
    listCols: 5,
  },
  {
    title: 're-return',
    path: '/accounting/cheques/re-return',
    controller: 'ReDepositRet',
    hasDebitAcc: false,
    listCols: 5,
  },
  {
    title: 'withdrawal',
    path: '/accounting/cheques/withdrawal',
    controller: 'ChequeWithdrawal',
    hasDebitAcc: false,
    listCols: 5,
  },
  {
    title: 'endorsement',
    path: '/accounting/cheques/endorse',
    controller: 'ChequeEndorsement',
    hasDebitAcc: false,
    listCols: 5,
  },
];

for (const cfg of OPS) {
  test.describe(`Cheques — ${cfg.title} operation`, () => {
    let ops: ChequeOpsPage;

    test.beforeEach(async ({ page }) => {
      ops = new ChequeOpsPage(page, cfg);
      await ops.goto();
    });

    test('renders the page shell with entry + list tabs', async ({ errors }) => {
      await ops.expectRendered();
      await expect(ops.headerTitle()).toBeVisible();
      expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
    });

    test('form grid exposes the cheque-operation columns', async () => {
      // CheqNum, Amt, Draw, VhrNo, Date1, CustAcc, BankNum, Bank, Delete
      await expect(ops.columnHeaders()).toHaveCount(9);
      // The cheque column is a searchable dropdown of existing cheques.
      await expect(ops.chequeSelect(0)).toBeVisible();
    });

    test(`marks ${cfg.hasDebitAcc ? 'debit + credit' : 'credit'} account(s) as required`, async () => {
      await expect(ops.requiredAccountSelects()).toHaveCount(cfg.hasDebitAcc ? 2 : 1);
    });

    test('list tab shows the voucher list with filters and paginator', async () => {
      await ops.openList();
      await expect(ops.columnHeaders()).toHaveCount(cfg.listCols);
      // At least a voucher-type (نوع التسلسل) filter select is present.
      await expect(ops.cardBody().locator('.row.g-2 ng-select').first()).toBeVisible();
      await expect(ops.listRefreshButton()).toBeVisible();
      await expect(ops.paginator()).toBeVisible();
    });

    test('changing the list year filter keeps the table rendered without errors', async ({
      errors,
    }) => {
      await ops.openList();
      await ops.yearInput().fill('2024');
      await ops.yearInput().blur();
      await expect(ops.table()).toBeVisible();
      expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
    });

    test('selecting an available cheque fills its amount into the row', async () => {
      const count = await ops.openChequeDropdown(0);
      test.skip(count === 0, 'No available cheques to act on in this tenant');
      await ops.selectFirstCheque(0);
      const amount = await ops.rowAmtInput(0).inputValue();
      expect(Number(amount)).toBeGreaterThan(0);
    });

    test('save with no cheque selected triggers a validation warning', async ({ page }) => {
      const save = ops.saveButton();
      test.skip((await save.count()) === 0, `Account lacks ${cfg.controller}.Create`);
      await save.click();
      await expect(toast(page, 'warning').first()).toBeVisible();
    });

    test('[write] posts a status change for a selected cheque then cleans up', async ({
      page,
      api,
    }) => {
      requireWrites();
      const save = ops.saveButton();
      test.skip((await save.count()) === 0, `Account lacks ${cfg.controller}.Create`);

      const count = await ops.openChequeDropdown(0);
      test.skip(count === 0, 'No available cheques to act on');
      await ops.selectFirstCheque(0);

      // Provide the required account(s).
      if (cfg.hasDebitAcc) {
        await ops.selectRequiredAccount(0, 0);
        await ops.selectRequiredAccount(1, 1);
      } else {
        await ops.selectRequiredAccount(0, 0);
      }

      const res = await waitForApi(page, ops.saveApi, async () => {
        await save.click();
      });
      expect(res.status(), 'save should not 5xx').toBeLessThan(500);
      await expect(ops.toast().first()).toBeVisible();

      // Best-effort cleanup when the post succeeded.
      if (res.status() < 400) {
        const body = await res.json().catch(() => null);
        const payload = res.request().postDataJSON();
        if (body?.DocNum && payload) {
          await api.delete(
            ops.deletePath(body.DocNum, payload.MyYear, payload.VType, payload.DepositType)
          );
        }
      }
    });

    // ── Deposit-only behaviour ──────────────────────────────────
    if (cfg.hasDepositType) {
      test('deposit: offers three deposit types and toggles cash mode', async ({ page }) => {
        await expect(ops.depositTypeRadios()).toHaveCount(3);
        // Cash mode (dt_8) removes the cheque grid and shows a cash amount input.
        await page.locator('#dt_8').click();
        await expect(page.locator('#dt_8')).toBeChecked();
        await expect(ops.chequeSelect(0)).toHaveCount(0);
        await expect(ops.cashAmountInput()).toBeVisible();
      });

      test('deposit: list tab adds a deposit-type filter', async () => {
        await ops.openList();
        // vType + depositType selects.
        await expect(ops.cardBody().locator('.row.g-2 ng-select')).toHaveCount(2);
      });
    }
  });
}
