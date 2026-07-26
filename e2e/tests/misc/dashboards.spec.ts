import { test, expect } from '../../fixtures/test-fixtures';
import { waitForApi } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { DashboardPage } from '../../pages/misc/dashboard.page';
import { Home2Page } from '../../pages/misc/home2.page';

/**
 * Analytics dashboards: /dashboard, /dashboard2 and the /home2 landing board.
 * All read-only. We assert structure (header, KPI cards, apexcharts SVG) and
 * behaviour (refresh / filter re-fetch), never specific figures.
 */

interface DashConfig {
  title: string;
  path: string;
  api: string;
}

const DASHBOARDS: DashConfig[] = [
  { title: 'Dashboard', path: '/dashboard', api: '/Dashboard/GetDashboardData' },
  { title: 'Dashboard 2', path: '/dashboard2', api: '/Dashboard/GetDashboard2Data' },
];

for (const cfg of DASHBOARDS) {
  test.describe(`${cfg.title} (${cfg.path})`, () => {
    let dash: DashboardPage;

    test.beforeEach(async ({ page }) => {
      dash = new DashboardPage(page, cfg.path);
      await dash.goto();
    });

    test('renders the header, KPI cards and apexcharts', async ({ errors }) => {
      await expect(dash.title).toBeVisible();
      await expect(dash.kpiCards.first()).toBeVisible();
      await expect(dash.charts.first()).toBeVisible();
      // apexcharts draws an <svg> once data is bound.
      await expect(dash.chartSvgs.first()).toBeVisible();
      expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
    });

    test('refresh re-fetches the dashboard data', async ({ page }) => {
      const res = await waitForApi(page, cfg.api, () => dash.refreshBtn.click());
      expect(res.status()).toBeLessThan(400);
      await expect(dash.charts.first()).toBeVisible();
    });
  });
}

test.describe('Home2 landing board (/home2)', () => {
  let home: Home2Page;

  test.beforeEach(async ({ page }) => {
    home = new Home2Page(page);
    await home.goto();
  });

  test('renders the filter card, voucher cards, charts and shortcuts', async ({ errors }) => {
    await expect(home.headerTitle()).toBeVisible();
    await expect(home.filterCard).toBeVisible();
    await expect(home.dateFrom).toBeVisible();
    await expect(home.dateTo).toBeVisible();
    await expect(home.postStatusSelect).toBeVisible();
    await expect(home.voucherCards.first()).toBeVisible();
    await expect(home.charts.first()).toBeVisible();
    await expect(home.shortcutButtons.first()).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('changing the date filter auto-reloads the voucher analytics', async ({ page }) => {
    const res = await waitForApi(page, '/VoucherDashboard/Get', () =>
      home.setDateFrom('2021-01-01')
    );
    expect(res.status()).toBeLessThan(400);
    expect(res.url()).toMatch(/dateFrom=2021-01-01/);
  });

  test('changing the post-status filter auto-reloads', async ({ page }) => {
    const res = await waitForApi(page, '/VoucherDashboard/Get', async () => {
      await home.postStatusSelect.selectOption({ index: 1 });
    });
    expect(res.status()).toBeLessThan(400);
  });
});
