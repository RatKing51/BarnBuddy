import { test, expect } from '@playwright/test';

test('homepage preview, chapter navigation, and mobile menu work', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const screenshots = page.getByRole('group', { name: 'Product screenshots' });
  await screenshots.getByRole('button').nth(1).click();
  await expect(screenshots.getByRole('button').nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.bb-product-preview img')).toBeVisible();
  await page.locator('.bb-explorer').getByRole('button', { name: 'Herd overview', exact: true }).click();
  await expect(page.locator('.bb-explorer-image img')).toHaveAttribute('src', /dashboard.png/);
  await expect(page.locator('.bb-explorer').getByRole('button', { name: 'Herd overview', exact: true })).toHaveAttribute('aria-pressed', 'true');
  if (testInfo.project.name === 'firefox-narrow') {
    const menu = page.getByRole('button', { name: 'Open navigation menu' });
    await menu.click();
    await expect(page.locator('#mobile-primary-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#mobile-primary-menu')).toHaveCount(0);
    await expect(menu).toBeFocused();
    await menu.click();
  }
  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Chapter Mode', exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/#chapter-mode$/);
  await expect(page.locator('#chapter-mode')).toBeInViewport();
  await expect.poll(() => page.locator('#chapter-mode').evaluate(el => Math.round(el.getBoundingClientRect().top))).toBeGreaterThanOrEqual(72);
  await expect.poll(() => page.locator('#chapter-mode').evaluate(el => Math.round(el.getBoundingClientRect().top))).toBeLessThanOrEqual(100);
  await expect(page.getByText('Members choose what to share. Private projects stay private.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('homepage.png'), fullPage: true });
});

test('reduced motion keeps chapter content readable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#chapter-mode');
  await expect(page.locator('.bb-chapter-flow')).toBeVisible();
  await expect(page.locator('.bb-chapter-flow')).toHaveCSS('opacity', '1');
  await expect(page.locator('html')).not.toHaveClass(/lenis/);
});

test('manual scrolling tracks the current homepage section', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const [selector, section] of [['#features', 'Features'], ['#chapter-mode', 'Chapter Mode'], ['.bb-story', null]]) {
    await page.locator(selector).evaluate(el => el.scrollIntoView({ block: 'start' }));
    const nav = page.getByRole('navigation', { name: 'Primary navigation' });
    if (testInfo.project.name === 'firefox-narrow') {
      await nav.getByRole('button', { name: 'Open navigation menu' }).click();
    }
    const active = nav.locator('a[aria-current="location"]:visible');
    if (section) await expect(active).toHaveAccessibleName(section);
    else await expect(active).toHaveCount(0);
    if (testInfo.project.name === 'firefox-narrow') await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/$/);
  }
});
