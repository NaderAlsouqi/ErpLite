import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { expectShell, waitForSpinnersGone } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { VoucherFormPage } from '../../pages/accounting/voucher-form.page';

/**
 * Cash-payment voucher (سند صرف نقدي) — /accounting/vouchers/cash-payment.
 *
 * Two-grid (debit / credit) balance voucher. Read-only coverage exercises render,
 * tabs, add-line, and the balance bar reacting to amounts; the save is gated by
 * requireWrites.
 */
test.describe('Accounting — Cash-payment voucher (سند صرف نقدي)', () => {
  let cp: VoucherFormPage;

  test.beforeEach(async ({ page }) => {
    cp = new VoucherFormPage(page, '/accounting/vouchers/cash-payment', 'grid');
    await cp.goto();
  });

  test('renders the form with debit and credit grids and a balance bar', async ({
    page,
    errors,
  }) => {
    await expectShell(page);
    await expect(cp.headerTitle()).toBeVisible();
    await expect(cp.debitGrid()).toBeVisible();
    await expect(cp.creditGrid()).toBeVisible();
    await expect(cp.balanceBar).toBeVisible();
    // Each grid starts with a single line.
    await expect(cp.debitRows()).toHaveCount(1);
    await expect(cp.creditRows()).toHaveCount(1);
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('adds lines to each grid', async () => {
    await cp.addDebitLine();
    await expect(cp.debitRows()).toHaveCount(2);
    await cp.addCreditLine();
    await expect(cp.creditRows()).toHaveCount(2);
  });

  test('the balance bar tracks debit vs credit amounts', async () => {
    // Entering a debit amount with no matching credit is unbalanced.
    await cp.setDebitAmount(0, 100);
    await cp.expectUnbalanced();
    await expect(cp.totalDebitCell()).toContainText('100');

    // Matching the credit side balances it.
    await cp.setCreditAmount(0, 100);
    await cp.expectBalanced();
    await expect(cp.totalCreditCell()).toContainText('100');
  });

  test('switches to the vouchers list and back', async ({ page }) => {
    await cp.switchToList();
    await expect(page.locator('.card-body table').first()).toBeVisible();
    await expect(cp.searchButton.first()).toBeVisible();

    await cp.switchToForm();
    await expect(cp.debitGrid()).toBeVisible();
  });

  test('re-searching the list preserves the table columns', async ({ page }) => {
    await cp.switchToList();
    const table = page.locator('.card-body table').first();
    await expect(table.locator('thead th').first()).toBeVisible();
    await cp.searchButton.first().click();
    await waitForSpinnersGone(page);
    await expect(table).toBeVisible();
  });

  test.describe('write flows', () => {
    test('saves a balanced cash-payment voucher', async () => {
      requireWrites();

      if ((await cp.saveButton.count()) === 0) {
        test.skip(true, 'Account lacks CashPayment.Create — Save button absent.');
      }

      const gotDebit = await cp.pickGridAccount('debit', 0, 0);
      const gotCredit = await cp.pickGridAccount('credit', 0, 1);
      test.skip(!gotDebit || !gotCredit, 'Not enough postable accounts to seed a voucher.');

      await cp.setDebitAmount(0, 1);
      await cp.setCreditAmount(0, 1);
      await cp.expectBalanced();

      await cp.saveButton.first().click();
      await expect(cp.toast('success').first()).toBeVisible();
    });
  });
});
