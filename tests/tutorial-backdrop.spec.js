const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Tutorial backdrop accessibility contract runs once on desktop Chromium');
}

test('clicking the tutorial backdrop restores the start screen and opener focus', async ({ page }, testInfo) => {
  desktopOnly(testInfo);

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#startScreen')).toHaveClass(/show/);

  await page.locator('#startHowToBtn').click();
  await expect(page.locator('#tutorial')).toHaveClass(/show/);
  await expect(page.locator('#startScreen')).toHaveAttribute('inert', '');
  await expect(page.locator('#startScreen')).toHaveAttribute('aria-hidden', 'true');
  expect(await page.evaluate(() => document.querySelector('#tutorial')?.contains(document.activeElement))).toBe(true);

  await page.locator('#tutorial').click({ position: { x: 4, y: 4 } });

  await expect(page.locator('#tutorial')).not.toHaveClass(/show/);
  await expect(page.locator('#startScreen')).toHaveClass(/show/);
  await expect(page.locator('#startScreen')).not.toHaveAttribute('inert', '');
  await expect(page.locator('#startScreen')).not.toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#startHowToBtn')).toBeFocused();
});
