import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { waitForApi, toast } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { IncomingChequePage } from '../../pages/cheques/incoming-cheq1.page';

/**
 * إدخال شيكات واردة — incoming cheque entry.
 * Read-only structure/behaviour coverage plus a write-gated create+cleanup flow.
 */
test.describe('Cheques — incoming entry (incoming-first)', () => {
  let cheq: IncomingChequePage;

  test.beforeEach(async ({ page }) => {
    cheq = new IncomingChequePage(page);
    await cheq.goto();
  });

  test('renders the page shell with entry + list tabs', async ({ page, errors }) => {
    await cheq.expectRendered();
    await expect(cheq.headerTitle()).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('form grid exposes the cheque columns', async () => {
    // CheqNum, Date1, Bank, Amt, CustAcc, Draw, Delete
    await expect(cheq.columnHeaders()).toHaveCount(7);
    await expect(cheq.firstRowCheqNum()).toBeVisible();
    await expect(cheq.firstRowAmt()).toBeVisible();
  });

  test('offers the three cheque status options with a default selection', async () => {
    const radios = cheq.statusRadios();
    await expect(radios).toHaveCount(3);
    // Default status (InBox = 0) is selected.
    await expect(radios.first()).toBeChecked();
  });

  test('add-line adds a row and remove is disabled on the last remaining row', async () => {
    await expect(cheq.gridRows()).toHaveCount(1);
    await expect(cheq.removeFirstRowButton()).toBeDisabled();

    await cheq.addLineButton().click();
    await expect(cheq.gridRows()).toHaveCount(2);
    // With more than one row the remove control becomes enabled.
    await expect(cheq.removeFirstRowButton()).toBeEnabled();
  });

  test('running total reflects an entered amount', async () => {
    await cheq.firstRowCheqNum().fill('900001');
    await cheq.firstRowAmt().fill('125');
    // The footer total cell should reflect the amount just entered.
    const total = cheq.table().locator('tfoot td.text-start');
    await expect(total).toContainText('125');
  });

  test('list tab shows the voucher list with columns, refresh and paginator', async () => {
    await cheq.openList();
    // DocNum, Date, Status, LineCount, Total, Actions
    await expect(cheq.columnHeaders()).toHaveCount(6);
    await expect(cheq.listRefreshButton()).toBeVisible();
    await expect(cheq.paginator()).toBeVisible();
  });

  test('changing the list year filter keeps the table rendered without errors', async ({
    page,
    errors,
  }) => {
    await cheq.openList();
    await cheq.yearInput().fill('2024');
    await cheq.yearInput().blur();
    await expect(cheq.table()).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('save with an empty grid triggers a client-side validation warning', async ({ page }) => {
    const save = cheq.saveButton();
    test.skip((await save.count()) === 0, 'Account lacks IncomingCheq1.Create');
    // No cheque lines are valid → validateForm() warns and never posts.
    await save.click();
    await expect(toast(page, 'warning').first()).toBeVisible();
    await expect(page).toHaveURL(/incoming-first/);
  });

  test('[write] creates an incoming cheque voucher and cleans it up via API', async ({
    page,
    api,
  }) => {
    requireWrites();
    const save = cheq.saveButton();
    test.skip((await save.count()) === 0, 'Account lacks IncomingCheq1.Create');

    const uniqueCheqNum = String(Date.now()).slice(-8);
    await cheq.firstRowCheqNum().fill(uniqueCheqNum);
    await cheq.firstRowAmt().fill('1');

    const res = await waitForApi(page, cheq.saveApi, async () => {
      await save.click();
    });
    expect(res.status(), 'save should not 5xx').toBeLessThan(500);
    await expect(cheq.toast('success').first()).toBeVisible();

    // Clean up the row we just created (best-effort).
    if (res.status() < 400) {
      const body = await res.json().catch(() => null);
      const payload = res.request().postDataJSON();
      if (body?.DocNum && payload) {
        await api.delete(cheq.deletePath(body.DocNum, payload.MyYear, payload.VType));
      }
    }
  });
});
