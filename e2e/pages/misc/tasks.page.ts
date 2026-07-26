import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ENV } from '../../support/env';

/**
 * Page object for the Tasks / المهمات screen (/workflow/tasks). A two-pane
 * board: a filterable list of workflow-run tasks (left) and a detail panel
 * (right) with captured results, per-step approvals, a review section
 * (gated by *hasPermission="Tasks.Review"), and comments.
 *
 * Selectors come straight from tasks.component.html and are structural.
 */
export class TasksPage extends BasePage {
  readonly root: Locator;
  readonly mineToggle: Locator;
  readonly statusFilter: Locator;
  readonly refreshBtn: Locator;
  readonly summaryChips: Locator;
  readonly list: Locator;
  readonly cards: Locator;
  readonly emptyState: Locator;
  readonly detail: Locator;
  readonly detailEmpty: Locator;
  readonly detailTitle: Locator;
  readonly reviewSection: Locator;
  readonly reviewComment: Locator;
  readonly markInReviewBtn: Locator;
  readonly approveBtn: Locator;
  readonly rejectBtn: Locator;
  readonly commentInput: Locator;

  constructor(page: Page) {
    super(page, '/workflow/tasks');
    this.root = page.locator('.tk-page');
    this.mineToggle = page.locator('.tk-switch input[type="checkbox"]');
    this.statusFilter = page.locator('.tk-filters select');
    this.refreshBtn = page.locator('.tk-filters button');
    this.summaryChips = page.locator('.tk-summary .tk-chip');
    this.list = page.locator('.tk-list');
    this.cards = page.locator('.tk-list .tk-card');
    this.emptyState = page.locator('.tk-list .tk-empty');
    this.detail = page.locator('.tk-detail');
    this.detailEmpty = page.locator('.tk-detail-empty');
    this.detailTitle = page.locator('.tk-detail-head h5');
    this.reviewSection = page.locator('.tk-section', {
      has: page.locator('.tk-review-actions'),
    });
    this.reviewComment = this.reviewSection.locator('textarea');
    this.markInReviewBtn = this.reviewSection.locator('.btn-outline-secondary');
    this.approveBtn = this.reviewSection.locator('.btn-success');
    this.rejectBtn = this.reviewSection.locator('.btn-danger');
    this.commentInput = page.locator('.tk-comment-add input');
  }

  /** True once either at least one task card OR the empty-state placeholder is shown. */
  async waitForListSettled(): Promise<void> {
    await expect(this.cards.first().or(this.emptyState.first())).toBeVisible({
      timeout: ENV.navTimeout,
    });
  }

  async openFirstTask(): Promise<void> {
    await this.cards.first().click();
    await expect(this.detailTitle).toBeVisible({ timeout: ENV.slowExpect });
  }
}
