import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * طباعة الباركود — Barcode label printing. Entirely client-side: it reads the item
 * list, builds CODE128 labels for a chosen item range, and renders them into a
 * print area. No records are ever written, so every scenario here is read-only.
 */
export class BarcodePrintPage extends BasePage {
  readonly card: Locator;
  readonly fromItemSelect: Locator;
  readonly toItemSelect: Locator;
  readonly copiesInput: Locator;
  readonly showNameCheck: Locator;
  readonly showPriceCheck: Locator;
  readonly previewBtn: Locator;
  readonly printBtn: Locator;
  readonly clearBtn: Locator;
  readonly labels: Locator;
  readonly barcodeSvgs: Locator;
  readonly hint: Locator;
  readonly labelsCount: Locator;

  constructor(page: Page) {
    super(page, '/warehouse/vouchers/barcode-print');
    this.card = page.locator('.card.custom-card:not(.attachments-panel)');
    this.fromItemSelect = page.locator('.card-body ng-select').nth(0);
    this.toItemSelect = page.locator('.card-body ng-select').nth(1);
    // The only numeric input on the page is the copies field.
    this.copiesInput = page.locator('input[type="number"]');
    this.showNameCheck = page.locator('#showName');
    this.showPriceCheck = page.locator('#showPrice');
    this.previewBtn = page.locator('button:has(.ti-eye)');
    this.printBtn = page.locator('button:has(.ti-printer)');
    this.clearBtn = page.locator('button:has(.ti-x)');
    this.labels = page.locator('.labels .label');
    this.barcodeSvgs = page.locator('.labels svg.label-bc');
    this.hint = page.locator('.text-center.text-muted');
    this.labelsCount = page.locator('.ms-auto.text-muted');
  }

  /** Pick option `optionIndex` from an @ng-select. Returns false if too few. */
  async pickOption(select: Locator, optionIndex = 0): Promise<boolean> {
    await select.click();
    const panel = this.page.locator('.ng-dropdown-panel');
    await expect(panel).toBeVisible();
    const options = panel.locator('.ng-option:not(.ng-option-disabled)');
    if ((await options.count()) <= optionIndex) {
      await this.page.keyboard.press('Escape');
      await expect(panel).toBeHidden().catch(() => {});
      return false;
    }
    await options.nth(optionIndex).click();
    await expect(panel).toBeHidden();
    return true;
  }

  async setCopies(n: number): Promise<void> {
    await this.copiesInput.fill(String(n));
    await this.copiesInput.blur();
  }
}
