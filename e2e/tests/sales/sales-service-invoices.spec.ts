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
 * Service invoices (Sales/ServiceInvoices/*): list, the add-invoice stub,
 * details resolved via /ServiceInvoice/GetInvoicesMainData, and the payback page.
 */
test.describe('Sales — service invoices list', () => {
  const table = 'table[mat-table]';

  test.beforeEach(async ({ page }) => {
    await goto(page, '/sales/service/invoice');
    await expectShell(page);
    await waitForSpinnersGone(page);
  });

  test('renders the service invoices table and controls', async ({ page, errors }) => {
    await expect(page.locator('.skyline-page-header__title')).toBeVisible();
    await expect(page.locator(table)).toBeVisible();
    await expect(page.locator('.input-group:has(.ti-search) input')).toBeVisible();
    await expect(page.locator('.btn-group.w-100 button')).toHaveCount(3);
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('exposes the expected service-invoice columns', async ({ page }) => {
    // Date, Number, Customer, FinancialYear, Amount, TransferStatus, Actions.
    await expect(page.locator(`${table} th[mat-header-cell]`)).toHaveCount(7);
  });

  test('a non-matching search clears the result rows', async ({ page }) => {
    const search = page.locator('.input-group:has(.ti-search) input');
    await search.click();
    await search.pressSequentially('zzz_no_service_' + Date.now());
    await waitForSpinnersGone(page);
    await expect(page.locator(`${table} tr[mat-row]`)).toHaveCount(0);
  });

  test('status filter toggles keep the table stable', async ({ page }) => {
    const buttons = page.locator('.btn-group.w-100 button');
    await buttons.nth(1).click();
    await expect(buttons.nth(1)).toHaveClass(/btn-primary/);
    await buttons.nth(0).click();
    await expect(buttons.nth(0)).toHaveClass(/btn-primary/);
    await expect(page.locator(table)).toBeVisible();
  });
});

test.describe('Sales — service add invoice', () => {
  test('placeholder screen loads inside the shell', async ({ page }) => {
    await goto(page, '/sales/service/add-invoice');
    await expectShell(page);
    // This screen is a stub in the current build.
    await expect(page.getByText(/service-add-invoice works/i)).toBeVisible();
  });
});

test.describe('Sales — service invoice details', () => {
  test('renders a real service invoice', async ({ page, api, errors }) => {
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
        `/ServiceInvoice/GetInvoicesMainData/${deliveryId}`
      );
      if (Array.isArray(rows) && rows.length > 0) {
        transactionNumber = String(rows[0].TransactionNumber);
      }
    } catch {
      /* handled by skip */
    }
    test.skip(!transactionNumber, 'No existing service invoices to resolve a TransactionNumber.');

    await goto(page, `/sales/service/invoice-details/${transactionNumber}`);
    await expectShell(page);
    await waitForSpinnersGone(page);
    await expect(page.locator('.skyline-page-header__title')).toBeVisible();
    await expectFeaturePageRendered(page);
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });
});

test.describe('Sales — service refunds', () => {
  test('service refunds list renders', async ({ page, errors }) => {
    await goto(page, '/sales/service/refunds');
    await expectShell(page);
    await waitForSpinnersGone(page);
    await expectFeaturePageRendered(page);
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('service add-refund lookup validates an empty invoice number', async ({ page }) => {
    await goto(page, '/sales/service/add-refund');
    await expectShell(page);
    await waitForSpinnersGone(page);
    const invoice = page.locator('#invoiceNumber');
    await expect(invoice).toBeVisible();
    await invoice.fill('');
    await page.locator('button:has(.ti-search)').first().click();
    await expect(toast(page, 'warning').first()).toBeVisible();
  });
});
