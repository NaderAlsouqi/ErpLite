import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { waitForApi, toast } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { OutgoingChequePage } from '../../pages/cheques/outgoing-cheq1.page';

/**
 * إخراج شيكات صادرة — outgoing cheque entry.
 * A valid line additionally requires a non-empty Draw (الساحب) value.
 */
test.describe('Cheques — outgoing entry (outgoing-first)', () => {
  let cheq: OutgoingChequePage;

  test.beforeEach(async ({ page }) => {
    cheq = new OutgoingChequePage(page);
    await cheq.goto();
  });

  test('renders the page shell with entry + list tabs', async ({ errors }) => {
    await cheq.expectRendered();
    await expect(cheq.headerTitle()).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('form grid exposes the cheque columns', async () => {
    // CheqNum, Date1, Bank, Amt, CustAcc, Draw, Delete
    await expect(cheq.columnHeaders()).toHaveCount(7);
    await expect(cheq.firstRowCheqNum()).toBeVisible();
    await expect(cheq.firstRowDraw()).toBeVisible();
  });

  test('add-line adds a row and remove is disabled on the last remaining row', async () => {
    await expect(cheq.gridRows()).toHaveCount(1);
    await expect(cheq.removeFirstRowButton()).toBeDisabled();

    await cheq.addLineButton().click();
    await expect(cheq.gridRows()).toHaveCount(2);
    await expect(cheq.removeFirstRowButton()).toBeEnabled();
  });

  test('running total reflects an entered amount', async () => {
    await cheq.firstRowCheqNum().fill('900002');
    await cheq.firstRowAmt().fill('77');
    const total = cheq.table().locator('tfoot td.text-start');
    await expect(total).toContainText('77');
  });

  test('list tab shows the voucher list with columns and paginator', async () => {
    await cheq.openList();
    // DocNum, Date, CheqNum, Date1, Bank, Amt, CustAcc, Draw, Actions
    await expect(cheq.columnHeaders()).toHaveCount(9);
    await expect(cheq.listRefreshButton()).toBeVisible();
    await expect(cheq.paginator()).toBeVisible();
  });

  test('changing the list year filter keeps the table rendered without errors', async ({
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
    test.skip((await save.count()) === 0, 'Account lacks OutgoingCheq1.Create');
    await save.click();
    await expect(toast(page, 'warning').first()).toBeVisible();
    await expect(page).toHaveURL(/outgoing-first/);
  });

  test('[write] creates an outgoing cheque voucher and cleans it up via API', async ({
    page,
    api,
  }) => {
    requireWrites();
    const save = cheq.saveButton();
    test.skip((await save.count()) === 0, 'Account lacks OutgoingCheq1.Create');

    const uniqueCheqNum = String(Date.now()).slice(-8);
    await cheq.firstRowCheqNum().fill(uniqueCheqNum);
    await cheq.firstRowAmt().fill('1');
    await cheq.firstRowDraw().fill('E2E_' + uniqueCheqNum);

    const res = await waitForApi(page, cheq.saveApi, async () => {
      await save.click();
    });
    expect(res.status(), 'save should not 5xx').toBeLessThan(500);
    await expect(cheq.toast('success').first()).toBeVisible();

    if (res.status() < 400) {
      const body = await res.json().catch(() => null);
      const payload = res.request().postDataJSON();
      if (body?.DocNum && payload) {
        await api.delete(cheq.deletePath(body.DocNum, payload.MyYear, payload.VType));
      }
    }
  });
});
