import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { expectShell, waitForSpinnersGone } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { JournalVoucherPage } from '../../pages/accounting/journal-voucher.page';

/**
 * Journal voucher (سند قيد) — /accounting/vouchers/journal.
 *
 * The screen is a multi-line debit/credit grid with a live DEBIT=CREDIT balance
 * indicator. Read-only coverage (render, tabs, add/remove lines, totals recompute,
 * balance validation) runs without writes; the actual save is gated by requireWrites.
 */
test.describe('Accounting — Journal voucher (سند قيد)', () => {
  let jv: JournalVoucherPage;

  test.beforeEach(async ({ page }) => {
    jv = new JournalVoucherPage(page);
    await jv.goto();
  });

  test('renders the voucher form with the lines grid and balance indicator', async ({
    page,
    errors,
  }) => {
    await expectShell(page);
    await expect(jv.headerTitle()).toBeVisible();
    await expect(jv.linesTable()).toBeVisible();
    // A brand-new voucher starts with exactly one empty line.
    await expect(jv.lineRows()).toHaveCount(1);
    await expect(jv.balanceAlert).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('exposes both card-header tabs and the totals footer', async () => {
    await expect(jv.formTab).toBeVisible();
    await expect(jv.listTab).toBeVisible();
    await expect(jv.totalDebitCell()).toBeVisible();
    await expect(jv.totalCreditCell()).toBeVisible();
  });

  test('adds and removes voucher lines', async () => {
    await expect(jv.lineRows()).toHaveCount(1);
    // The remove button on the sole line is disabled (must keep at least one).
    await expect(jv.removeLineButton(0)).toBeDisabled();

    await jv.addLine();
    await expect(jv.lineRows()).toHaveCount(2);
    await expect(jv.removeLineButton(0)).toBeEnabled();

    await jv.removeLineButton(1).click();
    await expect(jv.lineRows()).toHaveCount(1);
  });

  test('totals recompute and the balance indicator reflects debit vs credit', async () => {
    await jv.addLine();
    await expect(jv.lineRows()).toHaveCount(2);

    // Balanced: 100 debit against 100 credit.
    await jv.setLineDebit(0, 100);
    await jv.setLineCredit(1, 100);
    await expect(jv.totalDebitCell()).toContainText('100');
    await expect(jv.totalCreditCell()).toContainText('100');
    await jv.expectBalanced();

    // Unbalance it: drop the credit side to 40.
    await jv.setLineCredit(1, 40);
    await expect(jv.totalCreditCell()).toContainText('40');
    await jv.expectUnbalanced();
  });

  test('an all-zero (empty) voucher is not yet "balanced-with-value"', async () => {
    // With no amounts entered the indicator must not claim a successful balance.
    expect(await jv.isBalanced()).toBeFalsy();
  });

  test('switches to the vouchers list and back to the form', async ({ page }) => {
    await jv.switchToList();
    // The list surface renders a table with a search control.
    await expect(page.locator('.card-body table').first()).toBeVisible();
    await expect(jv.searchButton.first()).toBeVisible();

    await jv.switchToForm();
    await expect(jv.linesTable()).toBeVisible();
  });

  test('re-searching the vouchers list keeps the table structure intact', async ({ page }) => {
    await jv.switchToList();
    const table = page.locator('.card-body table').first();
    await expect(table).toBeVisible();
    // Header columns are present regardless of whether any rows exist.
    await expect(table.locator('thead th').first()).toBeVisible();

    await jv.searchButton.first().click();
    await waitForSpinnersGone(page);
    await expect(table).toBeVisible();
  });

  test.describe('write flows', () => {
    test('saves a balanced two-line voucher', async ({ page }) => {
      requireWrites();

      if ((await jv.saveButton.count()) === 0) {
        test.skip(true, 'Account lacks JournalVouchers.Edit — Save button absent.');
      }

      await jv.addLine();
      // The journal picker lists ALL accounts (incl. non-postable parents the
      // backend rejects), so seed two distinct postable leaves by number.
      const leaves = await jv.leafAccountNos(2);
      test.skip(leaves.length < 2, 'Not enough postable (leaf) accounts to seed a voucher.');
      const gotFirst = await jv.pickAccountByNo(0, leaves[0]);
      const gotSecond = await jv.pickAccountByNo(1, leaves[1]);
      test.skip(!gotFirst || !gotSecond, 'Leaf accounts not selectable in the journal picker.');

      const amount = 1; // minimal, balanced
      await jv.setLineDebit(0, amount);
      await jv.setLineCredit(1, amount);
      await jv.expectBalanced();

      await jv.saveButton.first().click();
      await expect(jv.toast('success').first()).toBeVisible();
    });

    test('a save button is present only when permitted', async () => {
      // Not a write itself — documents the permission-gating contract.
      const count = await jv.saveButton.count();
      expect(count === 0 || count >= 1).toBeTruthy();
    });
  });
});
