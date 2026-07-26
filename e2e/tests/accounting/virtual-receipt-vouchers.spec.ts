import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { expectShell, waitForSpinnersGone } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { VoucherFormPage } from '../../pages/accounting/voucher-form.page';

/**
 * Virtual receipt voucher (سند قبض تقديري) — /accounting/virtual/receipt-vouchers.
 *
 * A single-page variant of the receipt voucher (no form/list tabs): the staging
 * form on top, a mat-tab-group of staged cash/cheque lines, and a bottom search
 * card. Read-only coverage exercises render + required-field gating; the submit is
 * gated by requireWrites.
 */
test.describe('Accounting — Virtual receipt voucher (سند قبض تقديري)', () => {
  let rv: VoucherFormPage;

  test.beforeEach(async ({ page }) => {
    rv = new VoucherFormPage(page, '/accounting/virtual/receipt-vouchers', 'receipt');
    await rv.goto();
  });

  test('renders the staging form and selection controls', async ({ page, errors }) => {
    await expectShell(page);
    await expect(rv.headerTitle()).toBeVisible();
    await expect(rv.card).toBeVisible();
    await expect(rv.receiptSelect(0)).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('shows the staged cash / cheque tab group', async ({ page }) => {
    await expect(page.locator('mat-tab-group')).toBeVisible();
  });

  test('staging buttons are disabled on a fresh form; reset stays available', async () => {
    const primaries = rv.receiptPrimaryButtons();
    const count = await primaries.count();
    test.skip(count === 0, 'Account lacks Receipts.Create — staging buttons absent.');
    for (let i = 0; i < count; i++) {
      await expect(primaries.nth(i)).toBeDisabled();
    }
    await expect(rv.receiptResetButton()).toBeEnabled();
  });

  test('the account-statement search is disabled until its filters are provided', async () => {
    // The bottom search button requires a start date, end date, and account.
    await expect(rv.searchButton.first()).toBeDisabled();
  });

  test('reset keeps the form usable', async ({ page }) => {
    await rv.receiptResetButton().click();
    await waitForSpinnersGone(page);
    await expect(rv.receiptSelect(0)).toBeVisible();
  });

  test.describe('write flows', () => {
    test('stages a cash line and submits the estimated receipt', async ({ page }) => {
      requireWrites();

      const primaries = rv.receiptPrimaryButtons();
      // AddCash(0), AddCheque(1), Submit(2) — all permission-gated.
      test.skip((await primaries.count()) < 3, 'Account lacks Receipts.Create — buttons absent.');

      const gotCustomer = await rv.pickReceiptOption(3, 0);
      const gotAccount = await rv.pickReceiptOption(1, 0);
      test.skip(!gotCustomer || !gotAccount, 'No customers / accounts available to seed a receipt.');

      await rv.receiptNumberInput(1).fill('1');
      await rv.receiptNumberInput(1).blur();

      const addCash = primaries.nth(0);
      if (!(await addCash.isEnabled())) {
        test.skip(true, 'AddCash stayed disabled — required selections not resolvable.');
      }
      await addCash.click();
      await waitForSpinnersGone(page);

      const submit = primaries.nth(2);
      await expect(submit).toBeEnabled();
      await submit.click();
      await expect(rv.toast('success').first()).toBeVisible();
    });
  });
});
