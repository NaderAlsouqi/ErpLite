import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { waitForApi } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { TasksPage } from '../../pages/misc/tasks.page';

/**
 * Tasks / المهمات (/workflow/tasks). Read-only coverage of the list/detail
 * board, filters and summary chips. Reviewing a task is a write flow gated by
 * requireWrites and only runs when a reviewable task + the review section
 * (Tasks.Review) are actually present.
 */
test.describe('Tasks board (/workflow/tasks)', () => {
  let tasks: TasksPage;

  test.beforeEach(async ({ page }) => {
    tasks = new TasksPage(page);
    await tasks.goto();
    await tasks.waitForListSettled();
  });

  test('renders the toolbar, summary chips and the task list', async ({ errors }) => {
    await expect(tasks.headerTitle()).toBeVisible();
    await expect(tasks.mineToggle).toBeVisible();
    await expect(tasks.statusFilter).toBeVisible();
    await expect(tasks.summaryChips).toHaveCount(4);
    // Empty selection shows the "select a task" hint.
    await expect(tasks.detailEmpty).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('changing the status filter reloads the list and clears selection', async ({ page }) => {
    const res = await waitForApi(page, '/Tasks/List', async () => {
      await tasks.statusFilter.selectOption({ index: 1 });
    });
    expect(res.status()).toBeLessThan(400);
    await expect(tasks.detailEmpty).toBeVisible();
  });

  test('toggling "mine only" reloads the list', async ({ page }) => {
    const res = await waitForApi(page, '/Tasks/List', () => tasks.mineToggle.click());
    expect(res.status()).toBeLessThan(400);
  });

  test('refresh re-fetches the list', async ({ page }) => {
    const res = await waitForApi(page, '/Tasks/List', () => tasks.refreshBtn.click());
    expect(res.status()).toBeLessThan(400);
  });

  test('opening a task shows its detail panel', async ({ page, errors }) => {
    if ((await tasks.cards.count()) === 0) {
      test.info().annotations.push({ type: 'skip', description: 'no tasks in this tenant' });
      await expect(tasks.emptyState).toBeVisible();
      return;
    }
    const res = await waitForApi(page, '/Tasks/Get/', () => tasks.cards.first().click());
    expect(res.status()).toBeLessThan(400);
    await expect(tasks.detailTitle).toBeVisible();
    // Captured-results section header is always rendered in the detail panel.
    await expect(page.locator('.tk-section-title').first()).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('marks a task in-review [write]', async ({ page }) => {
    requireWrites();
    if ((await tasks.cards.count()) === 0) {
      test.info().annotations.push({ type: 'skip', description: 'no tasks to review' });
      return;
    }
    await tasks.openFirstTask();
    // The review action row is gated by *hasPermission="Tasks.Review".
    if ((await tasks.markInReviewBtn.count()) === 0) {
      test.info().annotations.push({ type: 'skip', description: 'account lacks Tasks.Review' });
      return;
    }
    const res = await waitForApi(page, '/Tasks/Review', () => tasks.markInReviewBtn.click());
    expect(res.status()).toBeLessThan(400);
    await expect(page.locator('.toast-success').first()).toBeVisible();
  });
});
