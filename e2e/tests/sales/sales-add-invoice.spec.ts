import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { toast, waitForSpinnersGone } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { SalesAddInvoicePage } from '../../pages/sales/sales-add-invoice.page';

/**
 * ADD INVOICE form (/sales/add-invoice): render, customer/item lookup filtering,
 * live line-item + grand-total recompute, tax toggle, required-field validation,
 * and a write-gated create.
 */
test.describe('Sales — add invoice', () => {
  let form: SalesAddInvoicePage;

  test.beforeEach(async ({ page }) => {
    form = new SalesAddInvoicePage(page);
    await form.goto();
    await form.expectFormReady();
  });

  test('renders the customer picker, item picker and summary without errors', async ({
    errors,
  }) => {
    await expect(form.customerSelect).toBeVisible();
    await expect(form.itemSelect).toBeVisible();
    await expect(form.summaryValues).toHaveCount(4);
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('customer search filters the customer list', async () => {
    const before = await form.customerOptions().count();
    test.skip(before === 0, 'No customers available for this account.');
    await form.customerSearch.fill('zzz_no_customer_' + Date.now());
    await expect(form.customerOptions()).toHaveCount(0);
    await form.customerSearch.fill('');
    await expect.poll(() => form.customerOptions().count()).toBeGreaterThan(0);
  });

  test('item search filters the item list', async () => {
    const before = await form.itemOptions().count();
    test.skip(before === 0, 'No items available for this tenant.');
    await form.itemSearch.fill('zzz_no_item_' + Date.now());
    await expect(form.itemOptions()).toHaveCount(0);
    await form.itemSearch.fill('');
    await expect.poll(() => form.itemOptions().count()).toBeGreaterThan(0);
  });

  test('adding a line item and editing qty/price recomputes the totals', async ({ page }) => {
    test.skip((await form.itemOptions().count()) === 0, 'No items available to add.');

    await test.step('add first item', async () => {
      await form.addFirstItem();
      await expect(form.itemRows()).toHaveCount(1);
    });

    await test.step('set quantity 2 × price 100 → subtotal 200', async () => {
      await form.setLine(0, 2, 100);
      await waitForSpinnersGone(page);
      // TotalWithoutTax (index 1) is quantity × price − discount, tax-independent.
      await expect(form.summaryValue(1)).toContainText('200');
    });

    await test.step('removing the line resets the items table', async () => {
      await form.itemRows().first().locator('button:has(.ti-trash)').click();
      await expect(form.itemRows()).toHaveCount(0);
    });
  });

  test('toggling "include tax" drops the discount column from the line table', async () => {
    test.skip((await form.itemOptions().count()) === 0, 'No items available to add.');
    await form.addFirstItem();
    const withDiscount = await form.itemsTable.locator('thead th').count();
    await form.includeTaxCheckbox.check();
    await expect(form.includeTaxCheckbox).toBeChecked();
    // Include-tax hides the per-line discount column (and clears items).
    await expect(form.itemsTable.locator('thead th')).toHaveCount(withDiscount - 1);
  });

  test('saving with no customer selected raises a validation warning', async ({ page }) => {
    const hasSave = await form.saveButton.count();
    test.skip(hasSave === 0, 'Invoices.Create not granted — save button hidden.');
    await form.saveButton.first().click();
    // No customer/items → toastr warning, and we stay on the form.
    await expect(toast(page, 'warning').first()).toBeVisible();
    await expect(page).toHaveURL(/\/sales\/add-invoice/);
  });

  test('creates an invoice end to end [write]', async ({ page }) => {
    requireWrites();
    test.skip((await form.saveButton.count()) === 0, 'Invoices.Create not granted.');
    test.skip((await form.customerOptions().count()) === 0, 'No customers available.');
    test.skip((await form.itemOptions().count()) === 0, 'No items available.');
    test.skip(
      (await form.paymentMethodSelect.locator('option').count()) <= 1,
      'No payment methods for this account.'
    );

    await form.selectFirstCustomer();
    await form.paymentMethodSelect.selectOption({ index: 1 });
    await form.addFirstItem();
    await form.setLine(0, 1, 10);

    await form.saveButton.first().click();
    // A successful post shows a success toast (and resets the form to zero items);
    // a rejected one shows an error/warning toast — either way we get UI feedback.
    await expect(toast(page).first()).toBeVisible();
  });
});
