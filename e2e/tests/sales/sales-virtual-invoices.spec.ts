import { test, expect, requireCredentials } from '../../fixtures/test-fixtures';
import {
  goto,
  expectShell,
  expectFeaturePageRendered,
  toast,
  waitForSpinnersGone,
} from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { ENV } from '../../support/env';

/**
 * Virtual invoices (Sales/Virtual/*): list, the add-invoice form (branch-driven),
 * details resolved via /VirtualInvoice/GetInvoicesMainData, and the payback page.
 */
test.describe('Sales — virtual invoices list', () => {
  const table = 'table[mat-table]';

  test.beforeEach(async ({ page }) => {
    await goto(page, '/sales/virtual/invoices');
    await expectShell(page);
    await waitForSpinnersGone(page);
  });

  test('renders the virtual invoices table and controls', async ({ page, errors }) => {
    await expect(page.locator('.skyline-page-header__title')).toBeVisible();
    await expect(page.locator(table)).toBeVisible();
    await expect(page.locator('.input-group:has(.ti-search) input').first()).toBeVisible();
    await expect(page.locator('.btn-group.w-100 button')).toHaveCount(3);
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('exposes the expected virtual-invoice columns', async ({ page }) => {
    // Date, Number, Customer, FinancialYear, Amount, Status, Actions.
    await expect(page.locator(`${table} th[mat-header-cell]`)).toHaveCount(7);
  });

  test('a non-matching search clears the result rows', async ({ page }) => {
    const search = page.locator('.input-group:has(.ti-search) input').first();
    await search.click();
    await search.pressSequentially('zzz_no_virtual_' + Date.now());
    await waitForSpinnersGone(page);
    await expect(page.locator(`${table} tr[mat-row]`)).toHaveCount(0);
  });

  test('the Add-invoice control is permission-gated (present or cleanly absent)', async ({
    page,
  }) => {
    const add = page.locator('.card-options button:has(.ti-plus)');
    if ((await add.count()) === 0) {
      test.info().annotations.push({
        type: 'permission',
        description: 'VirtualInvoices.Create not granted — add button hidden.',
      });
      return;
    }
    await expect(add.first()).toBeVisible();
  });
});

test.describe('Sales — virtual add invoice', () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, '/sales/virtual/add-invoice');
    await expectShell(page);
    await waitForSpinnersGone(page);
  });

  test('renders the branch-driven form', async ({ page, errors }) => {
    await expect(page.locator('.skyline-page-header__title')).toBeVisible();
    await expect(page.locator('select.form-select[size="3"]')).toBeVisible();
    await expect(page.locator('.card.custom-card').first()).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('branch search narrows the branch list', async ({ page }) => {
    const branchSelect = page.locator('select.form-select[size="3"]');
    const options = branchSelect.locator('option');
    const before = await options.count();
    test.skip(before === 0, 'No branches available for this account.');
    // The branch search input sits in the same card as the branch list box.
    const search = page
      .locator('.card', { has: branchSelect })
      .locator('input[type="text"]')
      .first();
    await search.fill('zzz_no_branch_' + Date.now());
    await expect(options).toHaveCount(0);
  });
});

test.describe('Sales — virtual invoice details', () => {
  test('renders a real virtual invoice', async ({ page, api, errors }) => {
    requireCredentials();

    const login = await (
      await api.post('/Auth/Login', {
        Login_Name: ENV.username,
        Password: ENV.password,
        RememberMe: true,
      })
    ).json();
    const deliveryId = Number((login && (login.DeliveryID ?? login.deliveryID)) ?? 0);

    let transactionNumber: string | null = null;
    try {
      const rows = await api.getJson<Array<{ TransactionNumber: string }>>(
        `/VirtualInvoice/GetInvoicesMainData/${deliveryId}`
      );
      if (Array.isArray(rows) && rows.length > 0) {
        transactionNumber = String(rows[0].TransactionNumber);
      }
    } catch {
      /* handled by skip */
    }
    test.skip(!transactionNumber, 'No existing virtual invoices to resolve a TransactionNumber.');

    await goto(page, `/sales/virtual/invoice-details/${transactionNumber}`);
    await expectShell(page);
    await waitForSpinnersGone(page);
    await expect(page.locator('.skyline-page-header__title')).toBeVisible();
    await expect(page.locator('.card.custom-card').first()).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });
});

test.describe('Sales — virtual add refund', () => {
  test('payback lookup validates an empty invoice number', async ({ page }) => {
    await goto(page, '/sales/virtual/add-refund');
    await expectShell(page);
    await waitForSpinnersGone(page);
    const invoice = page.locator('#invoiceNumber');
    await expect(invoice).toBeVisible();
    await invoice.fill('');
    await page.locator('button:has(.ti-search)').first().click();
    await expect(toast(page, 'warning').first()).toBeVisible();
  });
});
