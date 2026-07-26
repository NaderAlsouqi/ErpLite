import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ENV } from '../../support/env';

/**
 * Page object for the Workflow Builder / منشئ سير العمل screen
 * (/workflow/builder). A drag-and-drop automation designer: a left palette of
 * page "catalog" items, a canvas where steps are dropped/added, a meta form
 * (name / reviewer / trigger / status), and a saved-workflows list tab.
 *
 * Selectors are derived from workflow-builder.component.html and are purely
 * structural (class-based) so they survive translation and the ar/en locales.
 * Save / Run / Delete controls are gated by *hasPermission and may be absent.
 */
export class WorkflowBuilderPage extends BasePage {
  readonly root: Locator;
  readonly tabs: Locator;
  readonly builder: Locator;
  readonly palette: Locator;
  readonly paletteSearch: Locator;
  readonly paletteItems: Locator;
  readonly addStepButtons: Locator;
  readonly canvas: Locator;
  readonly canvasEmpty: Locator;
  readonly steps: Locator;
  readonly nameInput: Locator;
  readonly reviewerSelect: Locator;
  readonly triggerSelect: Locator;
  readonly statusSelect: Locator;
  readonly stepCount: Locator;
  readonly newBtn: Locator;
  readonly saveBtn: Locator;
  readonly runBtn: Locator;
  readonly listTable: Locator;

  constructor(page: Page) {
    super(page, '/workflow/builder');
    this.root = page.locator('.wf-page');
    this.tabs = page.locator('.wf-tabs button');
    this.builder = page.locator('.wf-builder');
    this.palette = page.locator('.wf-palette');
    this.paletteSearch = page.locator('.wf-search input');
    this.paletteItems = page.locator('.wf-cat');
    this.addStepButtons = page.locator('.wf-cat .wf-add');
    this.canvas = page.locator('#wfCanvas');
    this.canvasEmpty = page.locator('.wf-canvas-empty');
    this.steps = page.locator('.wf-canvas .wf-step');
    this.nameInput = page.locator('.wf-meta input[type="text"]').first();
    this.reviewerSelect = page.locator('.wf-meta ng-select').first();
    this.triggerSelect = page.locator('.wf-meta select').first();
    this.statusSelect = page.locator('.wf-meta select').nth(1);
    this.stepCount = page.locator('.wf-count');
    this.newBtn = page.locator('.wf-actions .btn-light');
    this.saveBtn = page.locator('.wf-actions .btn-primary');
    this.runBtn = page.locator('.wf-actions .btn-success');
    this.listTable = page.locator('.wf-list table.wf-table');
  }

  /** Switch to the builder or saved-list tab (index 0 = builder, 1 = list). */
  async switchTab(which: 'builder' | 'list'): Promise<void> {
    await this.tabs.nth(which === 'builder' ? 0 : 1).click();
  }

  /** Add the first palette catalog item as a canvas step (no drag needed). */
  async addFirstStep(): Promise<void> {
    await expect(this.addStepButtons.first()).toBeVisible({ timeout: ENV.slowExpect });
    await this.addStepButtons.first().click();
  }

  async setName(value: string): Promise<void> {
    await this.nameInput.fill(value);
  }
}
