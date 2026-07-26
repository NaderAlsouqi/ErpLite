import { test, expect, requireCredentials, requireWrites } from '../../fixtures/test-fixtures';
import { goto, expectShell, toast, waitForSpinnersGone } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { ENV } from '../../support/env';
import { SalesInvoiceRefundPage } from '../../pages/sales/sales-invoice-refund.page';
import { SalesAddRefundPage } from '../../pages/sales/sales-add-refund.page';

/**
 * Refund flows: the refunds LIST (/sales/refund), the ADD-REFUND / payback page
 * (/sales/add-refund) and the REFUND DETAILS page (/sales/refund-details, which
 * is driven by ?doc&bill&year query params resolved from a real refund).
 */
test.describe('Sales — refunds list', () => {
  let list: SalesInvoiceRefundPage;

  test.beforeEach(async ({ page }) => {
    list = new SalesInvoiceRefundPage(page);
    await list.goto();
    await list.expectLoaded();
  });

  test('renders the refunds table and controls without errors', async ({ page, errors }) => {
    await expectShell(page);
    await expect(list.headerTitle()).toBeVisible();
    await expect(list.table).toBeVisible();
    await expect(list.searchInput).toBeVisible();
    await expect(list.statusButtons).toHaveCount(3);
    await expect(list.paginator).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('exposes the expected refund columns', async () => {
    // Date, RefundNumber, InvoiceNumber, Customer, FinancialYear, Amount, Status, Actions.
    expect(await list.columnCount()).toBe(8);
  });

  test('a non-matching search clears the result rows', async ({ page }) => {
    await list.search('zzz_no_such_refund_' + Date.now());
    await waitForSpinnersGone(page);
    await expect(list.rows()).toHaveCount(0);
  });

  test('the Add-refund control is permission-gated (present or cleanly absent)', async () => {
    const count = await list.addRefundButton.count();
    if (count === 0) {
      test.info().annotations.push({
        type: 'permission',
        description: 'Refunds.Create not granted — add-refund button hidden.',
      });
      return;
    }
    await expect(list.addRefundButton.first()).toBeVisible();
  });
});

test.describe('Sales — add refund (payback)', () => {
  let form: SalesAddRefundPage;

  test.beforeEach(async ({ page }) => {
    form = new SalesAddRefundPage(page);
    await form.goto();
    await form.expectReady();
  });

  test('renders the invoice lookup with an empty state', async ({ errors }) => {
    await expect(form.invoiceNumberInput).toBeVisible();
    await expect(form.fetchButton).toBeVisible();
    await expect(form.emptyState).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('fetching with an empty invoice number warns and stays empty', async ({ page }) => {
    await form.invoiceNumberInput.fill('');
    await form.fetchButton.click();
    await expect(toast(page, 'warning').first()).toBeVisible();
    await expect(form.emptyState).toBeVisible();
  });

  test('fetching an unknown invoice number surfaces feedback, no items shown', async ({ page }) => {
    await form.fetch('E2E_NO_INVOICE_' + Date.now());
    await waitForSpinnersGone(page);
    await expect(toast(page).first()).toBeVisible();
    // No invoice details card should appear for a bogus number.
    await expect(form.invoiceDetailsCard).toHaveCount(0);
  });

  test('submitting a resolved payback [write]', async ({ page, api }) => {
    requireWrites();
    requireCredentials();

    const login = await (
      await api.post('/Auth/Login', {
        Login_Name: ENV.username,
        Password: ENV.password,
        RememberMe: true,
      })
    ).json();
    const deliveryId = Number((login && (login.DeliveryID ?? login.deliveryID)) ?? 0);

    // Find a real invoice number to load into the payback screen.
    let invoiceNumber: string | null = null;
    try {
      const rows = await api.getJson<Array<{ InvoiceNumber: string }>>(
        `/Invoice/GetInvoicesMainInfo/${deliveryId}`
      );
      if (Array.isArray(rows) && rows.length > 0) invoiceNumber = String(rows[0].InvoiceNumber);
    } catch {
      /* handled by skip */
    }
    test.skip(!invoiceNumber, 'No invoice available to build a payback.');

    await form.fetch(invoiceNumber as string);
    await waitForSpinnersGone(page);
    await expect(toast(page).first()).toBeVisible();

    // Only continue if the invoice actually loaded with items + a process button.
    if ((await form.invoiceDetailsCard.count()) === 0 || (await form.processButton.count()) === 0) {
      test.info().annotations.push({ type: 'note', description: 'Invoice not refundable; stopped.' });
      return;
    }
    const qtyInputs = form.itemsTable.locator('input[type="number"]');
    test.skip((await qtyInputs.count()) === 0, 'No return-quantity inputs rendered.');
    await qtyInputs.first().fill('1');
    await qtyInputs.first().blur();
    await expect(form.processButton.first()).toBeEnabled();
    await form.processButton.first().click();
    await expect(toast(page).first()).toBeVisible();
  });
});

test.describe('Sales — refund details', () => {
  test('renders a resolved refund via query params', async ({ page, api, errors }) => {
    requireCredentials();

    const login = await (
      await api.post('/Auth/Login', {
        Login_Name: ENV.username,
        Password: ENV.password,
        RememberMe: true,
      })
    ).json();
    const deliveryId = Number((login && (login.DeliveryID ?? login.deliveryID)) ?? 0);

    let refund: { DocumentNumber: string; InvoiceNumber: string; FinancialYear: string } | null =
      null;
    try {
      const rows = await api.getJson<
        Array<{ DocumentNumber: string; InvoiceNumber: string; FinancialYear: string | number }>
      >(`/Invoice/GetRefundsMainInfo/${deliveryId}`);
      if (Array.isArray(rows) && rows.length > 0) {
        const r = rows[0];
        refund = {
          DocumentNumber: String(r.DocumentNumber),
          InvoiceNumber: String(r.InvoiceNumber),
          FinancialYear: String(Math.floor(Number(r.FinancialYear))),
        };
      }
    } catch {
      /* handled by skip */
    }
    test.skip(!refund, 'No existing refunds to resolve details.');

    const q = refund as { DocumentNumber: string; InvoiceNumber: string; FinancialYear: string };
    await goto(
      page,
      `/sales/refund-details?doc=${encodeURIComponent(q.DocumentNumber)}&bill=${encodeURIComponent(
        q.InvoiceNumber
      )}&year=${encodeURIComponent(q.FinancialYear)}`
    );
    await expectShell(page);
    await waitForSpinnersGone(page);

    await expect(page.locator('.skyline-page-header__title')).toBeVisible();
    await expect(page.locator('.invoice-summary-grid')).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });
});
