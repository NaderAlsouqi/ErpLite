import { test, expect } from '../../fixtures/test-fixtures';
import { hasErrors, errorSummary } from '../../support/console-guard';
import { AppearancePage } from '../../pages/misc/appearance.page';

/**
 * Appearance / المظهر (/accounting/settings/appearance). Client-side theme
 * preferences only (no server writes). We verify the toggles actually mutate
 * the <html> data attributes that AppStateService manages, and restore the
 * original selection afterwards so the shared session is left untouched.
 */
test.describe('Appearance settings (/accounting/settings/appearance)', () => {
  let appearance: AppearancePage;

  test.beforeEach(async ({ page }) => {
    appearance = new AppearancePage(page);
    await appearance.goto();
  });

  test('renders both preference cards with their theme tiles', async ({ errors }) => {
    await expect(appearance.headerTitle()).toBeVisible();
    await expect(appearance.cards).toHaveCount(2);
    await expect(appearance.appThemeCards).toHaveCount(2);
    await expect(appearance.colorModeCards).toHaveCount(2);
    expect(hasErrors(errors), errorSummary(errors)).toBeFalsy();
  });

  test('color-mode toggle applies data-theme-mode to <html>', async () => {
    const original = await appearance.htmlAttr('data-theme-mode');
    const target = original === 'dark' ? 'light' : 'dark';
    const targetCard = target === 'dark' ? appearance.darkCard : appearance.lightCard;

    await targetCard.click();
    await expect.poll(() => appearance.htmlAttr('data-theme-mode')).toBe(target);
    await expect(targetCard).toHaveClass(/active/);

    // Restore the original mode.
    const restoreCard = original === 'dark' ? appearance.darkCard : appearance.lightCard;
    await restoreCard.click();
  });

  test('app-theme toggle applies data-app-theme to <html>', async () => {
    const original = (await appearance.htmlAttr('data-app-theme')) || 'classic';
    const target = original === 'editorial' ? 'classic' : 'editorial';
    const targetCard = target === 'editorial' ? appearance.editorialCard : appearance.classicCard;

    await targetCard.click();
    await expect.poll(() => appearance.htmlAttr('data-app-theme')).toBe(target);
    await expect(targetCard).toHaveClass(/active/);

    // Restore the original theme.
    const restoreCard = original === 'editorial' ? appearance.editorialCard : appearance.classicCard;
    await restoreCard.click();
  });
});
