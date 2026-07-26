import { test, expect } from '../../fixtures/test-fixtures';
import { expectShell, waitForSpinnersGone } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { SalesInvoiceListPage } from '../../pages/sales/sales-invoice-list.page';

/**
 * Sales invoice LIST (/sales/invoice): render, columns, search, status filter,
 * sorting, pagination and the grand-total footer. All read-only.
 */
test.describe('Sales — invoice list', () => {
  let list: SalesInvoiceListPage;

  test.beforeEach(async ({ page }) => {
    list = new SalesInvoiceListPage(page);
    await list.goto();
    await list.expectLoaded();
  });

  test('renders the shell, page header and invoices table', async ({ page, errors }) => {
    await expectShell(page);
    await expect(list.headerTitle()).toBeVisible();
    await expect(list.table).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('table exposes the expected invoice columns', async () => {
    // InvoiceDate, InvoiceNumber, CustomerName, FinancialYear, InvoiceAmount, Status, Actions.
    expect(await list.columnCount()).toBe(7);
  });

  test('renders the search box, status toggles, customer picker and paginator', async () => {
    await expect(list.searchInput).toBeVisible();
    await expect(list.customerSelect).toBeVisible();
    await expect(list.paginator).toBeVisible();
    await expect(list.statusButtons).toHaveCount(3);
  });

  test('a non-matching search clears the result rows', async ({ page }) => {
    await list.search('zzz_no_such_invoice_' + Date.now());
    await waitForSpinnersGone(page);
    await expect(list.rows()).toHaveCount(0);
  });

  test('status filter toggles keep the page stable and highlight the active toggle', async ({
    page,
    errors,
  }) => {
    await test.step('filter → Transferred', async () => {
      await list.filterByStatus(1);
      await expect(list.statusButtons.nth(1)).toHaveClass(/btn-primary/);
    });
    await test.step('filter → Not transferred', async () => {
      await list.filterByStatus(2);
      await expect(list.statusButtons.nth(2)).toHaveClass(/btn-primary/);
    });
    await test.step('filter → All', async () => {
      await list.filterByStatus(0);
      await expect(list.statusButtons.nth(0)).toHaveClass(/btn-primary/);
    });
    await expect(list.table).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('sorting by the first column does not break the table', async ({ page }) => {
    await list.headerCells.first().click();
    await waitForSpinnersGone(page);
    await expect(list.table).toBeVisible();
  });

  test('renders a numeric grand-total footer', async () => {
    await expect(list.grandTotal).toBeVisible();
    const text = (await list.grandTotal.innerText()).trim();
    expect(text).toMatch(/-?[\d.,]+/);
  });

  test('the Add-invoice control is permission-gated (present or cleanly absent)', async ({
    page,
  }) => {
    const count = await list.addButton.count();
    if (count === 0) {
      test.info().annotations.push({
        type: 'permission',
        description: 'Invoices.Create not granted — add button hidden.',
      });
      return;
    }
    await expect(list.addButton.first()).toBeVisible();
  });
});
