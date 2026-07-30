const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Stacked tutorial backdrop accessibility contract runs once on desktop Chromium');
}

test('clicking the tutorial backdrop from the game menu restores the parent menu safely', async ({ page }, testInfo) => {
  desktopOnly(testInfo);

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#startScreen')).toHaveClass(/show/);

  await page.locator('#startGameBtn').click();
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#roundStat')).toContainText('1 / 5');
  await expect(page.locator('#factText')).not.toHaveText('Choose a game to begin.');

  await page.locator('#menuBtn').click();
  await expect(page.locator('#gameMenu')).toHaveClass(/show/);
  await expect(page.locator('#gameApp')).toHaveAttribute('inert', '');

  await page.locator('#menuHowToBtn').click();
  await expect(page.locator('#tutorial')).toHaveClass(/show/);
  await expect(page.locator('#gameMenu')).toHaveAttribute('inert', '');
  await expect(page.locator('#gameMenu')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#gameApp')).toHaveAttribute('inert', '');

  await page.locator('#tutorial').click({ position: { x: 4, y: 4 } });

  await expect(page.locator('#tutorial')).not.toHaveClass(/show/);
  await expect(page.locator('#gameMenu')).toHaveClass(/show/);
  await expect(page.locator('#gameMenu')).not.toHaveAttribute('inert', '');
  await expect(page.locator('#gameMenu')).not.toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#gameApp')).toHaveAttribute('inert', '');
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#menuHowToBtn')).toBeFocused();

  await page.evaluate(() => document.querySelector('#menuBtn')?.focus());
  expect(await page.evaluate(() => document.querySelector('#gameMenu')?.contains(document.activeElement))).toBe(true);

  await page.locator('#resumeBtn').click();
  await expect(page.locator('#gameApp')).not.toHaveAttribute('inert', '');
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#menuBtn')).toBeFocused();
});
