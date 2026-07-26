import { test, expect, requireWrites } from '../../fixtures/test-fixtures';
import { waitForApi } from '../../support/helpers';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { WorkflowBuilderPage } from '../../pages/misc/workflow-builder.page';

/**
 * Workflow Builder / منشئ سير العمل (/workflow/builder).
 * Read-only coverage of the drag-and-drop designer (palette, canvas, meta form,
 * saved-list tab). Creating a workflow is a write flow gated by requireWrites
 * and is cleaned up via the API afterwards.
 */
test.describe('Workflow Builder (/workflow/builder)', () => {
  let wf: WorkflowBuilderPage;

  test.beforeEach(async ({ page }) => {
    wf = new WorkflowBuilderPage(page);
    await wf.goto();
  });

  test('renders the header, palette and empty canvas', async ({ errors }) => {
    await expect(wf.headerTitle()).toBeVisible();
    await expect(wf.builder).toBeVisible();
    await expect(wf.palette).toBeVisible();
    await expect(wf.canvas).toBeVisible();
    // A fresh workflow starts with the "drop here" placeholder and 0 steps.
    await expect(wf.canvasEmpty).toBeVisible();
    await expect(wf.paletteItems.first()).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('palette search filters the catalog items', async () => {
    const before = await wf.paletteItems.count();
    expect(before).toBeGreaterThan(0);
    await wf.paletteSearch.fill('zzzzz_no_such_page_zzzzz');
    await expect(wf.paletteItems).toHaveCount(0);
    await wf.paletteSearch.fill('');
    await expect(wf.paletteItems.first()).toBeVisible();
  });

  test('adding a palette item pushes a step onto the canvas', async () => {
    await expect(wf.canvasEmpty).toBeVisible();
    await wf.addFirstStep();
    await expect(wf.steps).toHaveCount(1);
    await expect(wf.canvasEmpty).toBeHidden();
    await expect(wf.stepCount).toContainText('1');
  });

  test('meta form exposes name, reviewer, trigger and status controls', async () => {
    await expect(wf.nameInput).toBeVisible();
    await expect(wf.reviewerSelect).toBeVisible();
    await expect(wf.triggerSelect).toBeVisible();
    await expect(wf.statusSelect).toBeVisible();
  });

  test('switching to the saved-list tab loads the workflow list', async ({ page, errors }) => {
    const res = await waitForApi(page, '/Workflow/List', () => wf.switchTab('list'));
    expect(res.status()).toBeLessThan(400);
    // Either a populated table or the "no workflows" placeholder renders.
    const table = wf.listTable;
    const empty = page.locator('.wf-list .wf-empty-small');
    await expect(table.or(empty).first()).toBeVisible();
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('saving an empty workflow is rejected client-side with a warning', async ({ page }) => {
    // Save is gated by *hasPermission="Workflow.Create|Edit" — only assert when present.
    if ((await wf.saveBtn.count()) === 0) {
      test.info().annotations.push({ type: 'skip', description: 'account lacks Workflow.Create/Edit' });
      return;
    }
    await wf.saveBtn.click();
    await expect(page.locator('.toast-warning').first()).toBeVisible();
  });

  test('creates and then deletes a workflow [write]', async ({ page, api }) => {
    requireWrites();
    if ((await wf.saveBtn.count()) === 0) {
      test.info().annotations.push({ type: 'skip', description: 'account lacks Workflow.Create/Edit' });
      return;
    }

    await wf.addFirstStep();
    await expect(wf.steps).toHaveCount(1);
    const name = 'E2E_' + Date.now();
    await wf.setName(name);

    const res = await waitForApi(page, '/Workflow/Save', () => wf.saveBtn.click());
    expect(res.status()).toBeLessThan(400);
    await expect(page.locator('.toast-success').first()).toBeVisible();

    // Clean up the record we created (tolerant of casing / failures).
    const body = await res.json().catch(() => ({}));
    const id = body?.WorkflowId ?? body?.workflowId;
    if (id) {
      await api.delete(`/Workflow/Delete/${id}`).catch(() => undefined);
    }
  });
});
