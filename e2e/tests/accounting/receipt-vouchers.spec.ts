import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { expectShell, waitForSpinnersGone } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { VoucherFormPage } from '../../pages/accounting/voucher-form.page';

/**
 * Receipt voucher (سند قبض) — /accounting/receipt-vouchers.
 *
 * A header-style voucher: pick a customer + cash/cheque account, enter amounts,
 * stage cash or cheque lines, then submit. Read-only coverage exercises render,
 * required-field button gating, tab switching, and list search; submit is gated by
 * requireWrites.
 */
test.describe('Accounting — Receipt voucher (سند قبض)', () => {
  let rv: VoucherFormPage;

  test.beforeEach(async ({ page }) => {
    rv = new VoucherFormPage(page, '/accounting/receipt-vouchers', 'receipt');
    await rv.goto();
  });

  test('renders the receipt form card', async ({ page, errors }) => {
    await expectShell(page);
    await expect(rv.headerTitle()).toBeVisible();
    await expect(rv.card).toBeVisible();
    // The selection controls (invoice / accounts / customer) are present.
    await expect(rv.receiptSelect(0)).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('submit is disabled until an amount or cheque is staged; reset is always available', async () => {
    // Submit (a permission-gated .btn-success) — only assert when present.
    if ((await rv.saveButton.count()) > 0) {
      await expect(rv.saveButton.first()).toBeDisabled();
    }
    await expect(rv.receiptResetButton()).toBeEnabled();
  });

  test('AddCash / AddCheque stay disabled without a customer + account selected', async () => {
    const primaries = rv.receiptPrimaryButtons();
    const count = await primaries.count();
    test.skip(count === 0, 'Account lacks Receipts.Create — staging buttons absent.');
    // On a fresh form neither staging button is actionable.
    for (let i = 0; i < count; i++) {
      await expect(primaries.nth(i)).toBeDisabled();
    }
  });

  test('reset leaves the form usable', async ({ page }) => {
    await rv.receiptResetButton().click();
    await waitForSpinnersGone(page);
    await expect(rv.card).toBeVisible();
    await expect(rv.receiptSelect(0)).toBeVisible();
  });

  test('switches to the vouchers list and back', async ({ page }) => {
    await rv.switchToList();
    await expect(page.locator('.card-body table').first()).toBeVisible();
    await expect(rv.searchButton.first()).toBeVisible();

    await rv.switchToForm();
    await expect(rv.receiptSelect(0)).toBeVisible();
  });

  test('the list surface offers a vouchers / cheques view toggle', async ({ page }) => {
    await rv.switchToList();
    // Two toggle buttons switch between the vouchers list and the all-cheques list.
    const toggles = page.locator('.card-body .btn-sm');
    await expect(toggles.first()).toBeVisible();
    await expect(page.locator('.card-body table').first()).toBeVisible();
  });

  test.describe('write flows', () => {
    test('stages a cash line and submits the receipt', async ({ page }) => {
      requireWrites();

      if ((await rv.saveButton.count()) === 0) {
        test.skip(true, 'Account lacks Receipts.Create — submit button absent.');
      }

      // Customer (select 3) + cash account (select 1) + a cash amount (numeric input 1).
      const gotCustomer = await rv.pickReceiptOption(3, 0);
      const gotAccount = await rv.pickReceiptOption(1, 0);
      test.skip(!gotCustomer || !gotAccount, 'No customers / accounts available to seed a receipt.');

      await rv.receiptNumberInput(1).fill('1');
      await rv.receiptNumberInput(1).blur();

      const primaries = rv.receiptPrimaryButtons();
      const addCash = primaries.first();
      if (!(await addCash.isEnabled())) {
        test.skip(true, 'AddCash stayed disabled — required selections not resolvable.');
      }
      await addCash.click();
      await waitForSpinnersGone(page);

      await expect(rv.saveButton.first()).toBeEnabled();
      await rv.saveButton.first().click();
      await expect(rv.toast('success').first()).toBeVisible();
    });
  });
});
