import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { expectShell, waitForSpinnersGone } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { VoucherFormPage } from '../../pages/accounting/voucher-form.page';

/**
 * Cheques-payment voucher (سند دفع شيكات) — /accounting/cheques/payment-voucher.
 *
 * A two-grid balance voucher like cash-payment, but every credit line additionally
 * requires a cheque number. Read-only coverage exercises render, tabs, add-line, the
 * balance bar, and the cheque-number required validation; the save is gated by
 * requireWrites.
 */
test.describe('Accounting — Cheques-payment voucher (سند دفع شيكات)', () => {
  let cp: VoucherFormPage;

  test.beforeEach(async ({ page }) => {
    cp = new VoucherFormPage(page, '/accounting/cheques/payment-voucher', 'grid');
    await cp.goto();
  });

  test('renders the form with debit/credit grids and a balance bar', async ({ page, errors }) => {
    await expectShell(page);
    await expect(cp.headerTitle()).toBeVisible();
    await expect(cp.debitGrid()).toBeVisible();
    await expect(cp.creditGrid()).toBeVisible();
    await expect(cp.balanceBar).toBeVisible();
    await expect(cp.debitRows()).toHaveCount(1);
    await expect(cp.creditRows()).toHaveCount(1);
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('the credit grid shows a cheque-number column input per row', async () => {
    // Credit rows carry a second numeric input (the cheque number) beyond the amount.
    const numericInputs = cp.creditRows().nth(0).locator('input[type=number]');
    await expect(numericInputs).toHaveCount(2);
  });

  test('adds lines to each grid', async () => {
    await cp.addDebitLine();
    await expect(cp.debitRows()).toHaveCount(2);
    await cp.addCreditLine();
    await expect(cp.creditRows()).toHaveCount(2);
  });

  test('the balance bar tracks debit vs credit amounts', async () => {
    await cp.setDebitAmount(0, 250);
    await cp.expectUnbalanced();
    await expect(cp.totalDebitCell()).toContainText('250');

    await cp.setCreditAmount(0, 250);
    await cp.expectBalanced();
    await expect(cp.totalCreditCell()).toContainText('250');
  });

  test('switches to the vouchers list and back', async ({ page }) => {
    await cp.switchToList();
    await expect(page.locator('.card-body table').first()).toBeVisible();
    await expect(cp.searchButton.first()).toBeVisible();

    await cp.switchToForm();
    await expect(cp.debitGrid()).toBeVisible();
  });

  test('a save attempt with a missing cheque number flags the credit line', async () => {
    // No persistence happens: the client blocks the save before any network call.
    if ((await cp.saveButton.count()) === 0) {
      test.skip(true, 'Account lacks Cheques.Create — Save button absent.');
    }

    const gotDebit = await cp.pickGridAccount('debit', 0, 0);
    const gotCredit = await cp.pickGridAccount('credit', 0, 1);
    test.skip(!gotDebit || !gotCredit, 'Not enough postable accounts to exercise validation.');

    // Balanced amounts, but leave the cheque number empty.
    await cp.setDebitAmount(0, 5);
    await cp.setCreditAmount(0, 5);

    await cp.saveButton.first().click();

    // The cheque-number input (2nd numeric input of the credit row) is marked invalid.
    const cheqNoInput = cp.creditRows().nth(0).locator('input[type=number]').nth(1);
    await expect(cheqNoInput).toHaveClass(/is-invalid/);
  });

  test.describe('write flows', () => {
    test('saves a balanced cheques-payment voucher', async ({ page }) => {
      requireWrites();

      if ((await cp.saveButton.count()) === 0) {
        test.skip(true, 'Account lacks Cheques.Create — Save button absent.');
      }

      const gotDebit = await cp.pickGridAccount('debit', 0, 0);
      const gotCredit = await cp.pickGridAccount('credit', 0, 1);
      test.skip(!gotDebit || !gotCredit, 'Not enough postable accounts to seed a voucher.');

      await cp.setDebitAmount(0, 1);
      await cp.setCreditAmount(0, 1);
      await cp.setCreditChequeNo(0, Number(String(Date.now()).slice(-6)));
      await cp.expectBalanced();

      await cp.saveButton.first().click();
      await waitForSpinnersGone(page);
      await expect(cp.toast('success').first()).toBeVisible();
    });
  });
});
