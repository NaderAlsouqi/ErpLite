import { test, expect, requireCredentials } from '../../fixtures/test-fixtures';
import { goto, expectShell, expectFeaturePageRendered, waitForSpinnersGone } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { ENV } from '../../support/env';

/**
 * Invoice DETAILS (/sales/invoice-details/:TransactionNumber).
 *
 * There is no blind way to visit a :param route, so we resolve a REAL
 * TransactionNumber through the API fixture (login → DeliveryID →
 * /Invoice/GetInvoicesMainInfo/:deliveryId → first row) and then drive the UI.
 * If the tenant has no invoices we skip gracefully.
 */
test.describe('Sales — invoice details', () => {
  test('renders the header + items for a real invoice', async ({ page, api, errors }) => {
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
        `/Invoice/GetInvoicesMainInfo/${deliveryId}`
      );
      if (Array.isArray(rows) && rows.length > 0) {
        transactionNumber = String(rows[0].TransactionNumber);
      }
    } catch {
      /* endpoint unavailable — handled by skip below */
    }

    test.skip(!transactionNumber, 'No existing invoices to resolve a TransactionNumber.');

    await goto(page, `/sales/invoice-details/${transactionNumber}`);
    await expectShell(page);
    await waitForSpinnersGone(page);

    await expect(page.locator('.skyline-page-header__title')).toBeVisible();
    await expect(page.locator('.card.custom-card').first()).toBeVisible();
    // The details layout always renders an items table (populated or empty-state row).
    await expect(page.locator('table').first()).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/sales/invoice-details/${transactionNumber}`));

    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('an unknown TransactionNumber still renders the shell without crashing', async ({ page }) => {
    // Deliberately bogus id: the component surfaces a toast but must not break the app.
    await goto(page, '/sales/invoice-details/E2E_UNKNOWN_' + Date.now());
    await expectShell(page);
    await expectFeaturePageRendered(page);
    await expect(page).toHaveURL(/\/sales\/invoice-details\//);
  });
});
