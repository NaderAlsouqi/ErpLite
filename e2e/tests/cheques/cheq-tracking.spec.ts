import { test, expect } from '../../fixtures/test-fixtures';
import { toast } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { ENV } from '../../support/env';
import { CheqTrackingPage } from '../../pages/cheques/cheq-tracking.page';

/**
 * متابعة الشيكات — cheque tracking. A filter → results report: the period
 * filter + Fetch (احضار) pulls matching cheques into a selectable grid. Fetching
 * is a read operation; only the final Save is a write (gated by requireWrites).
 */
test.describe('Cheques — tracking (tracking)', () => {
  let track: CheqTrackingPage;

  test.beforeEach(async ({ page }) => {
    track = new CheqTrackingPage(page);
    await track.goto();
  });

  test('renders the page shell with entry + list tabs', async ({ errors }) => {
    await track.expectRendered();
    await expect(track.headerTitle()).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('form exposes the period filter, fetch button and selectable grid', async () => {
    await expect(track.periodFromInput()).toBeVisible();
    await expect(track.periodToInput()).toBeVisible();
    await expect(track.fetchButton()).toBeVisible();
    await expect(track.selectAllCheckbox()).toBeVisible();
    // IsSelected, CheqNum, Date1, Amt, Ben, BankAcc, Acc2, Delete
    await expect(track.columnHeaders()).toHaveCount(8);
  });

  test('the empty grid shows a no-data placeholder before fetching', async () => {
    await expect(track.gridRows()).toHaveCount(1);
    await expect(track.noRecordsCell()).toBeVisible();
  });

  test('fetching by period returns cheques or reports none — without a server error', async ({
    page,
  }) => {
    const respPromise = page
      .waitForResponse((r) => r.url().includes(track.availableChequesApi), {
        timeout: ENV.navTimeout,
      })
      .catch(() => null);
    await track.fetchButton().click();
    const resp = await respPromise;

    if (resp) {
      expect(resp.status()).toBeLessThan(500);
    } else {
      // No API call → the form warned (e.g. no voucher type). A toast confirms it.
      await expect(toast(page).first()).toBeVisible();
    }
  });

  test('select-all toggles every fetched row (when any are returned)', async ({ page }) => {
    const respPromise = page
      .waitForResponse((r) => r.url().includes(track.availableChequesApi), {
        timeout: ENV.navTimeout,
      })
      .catch(() => null);
    await track.fetchButton().click();
    await respPromise;

    const rowCount = await track.rowCheckboxes().count();
    test.skip(rowCount === 0, 'No cheques returned for this tenant/period');

    await track.selectAllCheckbox().check();
    for (let i = 0; i < rowCount; i++) {
      await expect(track.rowCheckboxes().nth(i)).toBeChecked();
    }
    await expect(track.selectedCount()).toHaveText(String(rowCount));
  });

  test('list tab shows the voucher list with a type filter and paginator', async () => {
    await track.openList();
    // DocNo, Date, LineCount, Total, Actions
    await expect(track.columnHeaders()).toHaveCount(5);
    await expect(track.cardBody().locator('.row.g-2 ng-select').first()).toBeVisible();
    await expect(track.listRefreshButton()).toBeVisible();
    await expect(track.paginator()).toBeVisible();
  });

  test('changing the list year filter keeps the table rendered without errors', async ({
    errors,
  }) => {
    await track.openList();
    await track.yearInput().fill('2024');
    await track.yearInput().blur();
    await expect(track.table()).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('save with nothing selected triggers a validation warning', async ({ page }) => {
    const save = track.saveButton();
    test.skip((await save.count()) === 0, 'Account lacks CheqTracking.Create');
    await save.click();
    await expect(toast(page, 'warning').first()).toBeVisible();
  });
});
