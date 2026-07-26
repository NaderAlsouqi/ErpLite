import { Page, Locator, expect } from '@playwright/test';
import { ENV } from '../../support/env';
import { goto, waitForSpinnersGone } from '../../support/helpers';

/**
 * Page object for the two analytics dashboards (/dashboard and /dashboard2).
 * Each renders a `.dashboard-header` with a refresh button, a `.kpi-grid` of
 * KPI cards, and one or more apexcharts (`apx-chart`). These components do NOT
 * use app-page-header or .custom-card, so this object navigates directly rather
 * than via BasePage. Derived from dashboard(2).component.html.
 */
export class DashboardPage {
  readonly header: Locator;
  readonly title: Locator;
  readonly refreshBtn: Locator;
  readonly kpiCards: Locator;
  readonly chartCards: Locator;
  readonly charts: Locator;
  readonly chartSvgs: Locator;

  constructor(
    private readonly page: Page,
    readonly path: string
  ) {
    this.header = page.locator('.dashboard-header');
    this.title = page.locator('.dashboard-title');
    this.refreshBtn = page.locator('.dashboard-header button');
    this.kpiCards = page.locator('.kpi-card');
    this.chartCards = page.locator('.chart-card');
    this.charts = page.locator('apx-chart');
    this.chartSvgs = page.locator('apx-chart svg');
  }

  async goto(): Promise<void> {
    await goto(this.page, this.path);
    await expect(this.header).toBeVisible({ timeout: ENV.navTimeout });
    await waitForSpinnersGone(this.page);
  }
}
