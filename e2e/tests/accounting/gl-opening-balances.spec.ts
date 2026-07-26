import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { OpeningBalancesPage } from '../../pages/accounting/opening-balances.page';

test.describe('Opening Balances (/accounting/gl/opening-balances)', () => {
  let ob: OpeningBalancesPage;

  test.beforeEach(async ({ page }) => {
    ob = new OpeningBalancesPage(page);
    await ob.goto();
  });

  test('renders the info bar, grid columns and balance footer', async ({ errors }) => {
    await expect(ob.headerTitle()).toBeVisible();
    await expect(ob.infoBar).toBeVisible();
    await expect(ob.table).toBeVisible();
    // No / Name / Debit / Credit / Currency / CurrencyName / Rate / ForeignAmount.
    await expect(ob.headers).toHaveCount(8);
    await expect(ob.totalsRow).toBeVisible();
    await expect(ob.footer).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('the Save/Discard actions are hidden until a balance is edited', async () => {
    await expect(ob.saveBtn).toHaveCount(0);
    await expect(ob.discardBtn).toHaveCount(0);
  });

  test('search narrows the grid and clearing restores it', async () => {
    test.skip((await ob.rows.count()) === 0, 'No leaf accounts to filter.');
    await expect(ob.rows.first()).toBeVisible();
    await ob.search('zzz_no_match_' + Date.now());
    await expect(ob.emptyStateRow).toBeVisible();
    await ob.clearSearch();
    await expect(ob.rows.first()).toBeVisible();
  });

  test('entering a balance marks the row dirty and can be discarded', async () => {
    requireWrites();
    const rowCount = await ob.rows.count();
    test.skip(rowCount === 0, 'No leaf accounts available to edit.');

    const firstRow = ob.rows.first();
    await test.step('enter a debit value', async () => {
      await ob.debitInput(firstRow).fill('7.777');
      // A dirty row surfaces the Discard action and a dirty CSS marker.
      await expect(ob.discardBtn).toBeVisible();
      await expect(firstRow).toHaveClass(/ob-row-dirty/);
    });

    await test.step('discard reverts without persisting', async () => {
      await ob.discardBtn.click();
      await expect(ob.discardBtn).toHaveCount(0);
    });
  });
});
