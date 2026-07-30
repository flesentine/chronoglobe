const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Confirmed new-game accessibility contract runs once on desktop Chromium');
}

test('confirming a new game clears progress and restores the start screen', async ({ page }, testInfo) => {
  desktopOnly(testInfo);

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#startScreen')).toHaveClass(/show/);

  await page.locator('#startGameBtn').click();
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#roundStat')).toContainText('1 / 5');
  await expect(page.locator('#factText')).not.toHaveText('Choose a game to begin.');

  await page.evaluate(() => window.placeGuess(12, 12));
  await expect(page.locator('#lockBtn')).toBeEnabled();
  await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('chronoglobeActiveGame')))).toBe(true);

  await page.locator('#menuBtn').click();
  await expect(page.locator('#gameMenu')).toHaveClass(/show/);
  await expect(page.locator('#gameApp')).toHaveAttribute('inert', '');

  await page.locator('#newGameBtn').click();
  await expect(page.locator('#confirmNewGame')).toHaveClass(/show/);
  await expect(page.locator('#cancelNewGameBtn')).toBeFocused();
  expect(await page.evaluate(() => document.querySelector('#confirmNewGame')?.contains(document.activeElement))).toBe(true);
  await expect(page.locator('#gameMenu')).toHaveAttribute('inert', '');
  await expect(page.locator('#gameMenu')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#gameApp')).toHaveAttribute('inert', '');

  await page.locator('#confirmNewGameBtn').click();

  await expect(page.locator('#confirmNewGame')).not.toHaveClass(/show/);
  await expect(page.locator('#gameMenu')).not.toHaveClass(/show/);
  await expect(page.locator('#startScreen')).toHaveClass(/show/);
  await expect(page.locator('#startScreen')).not.toHaveAttribute('inert', '');
  await expect(page.locator('#startScreen')).not.toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#gameApp')).not.toHaveAttribute('inert', '');
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#startGameBtn')).toBeFocused();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeActiveGame'))).toBeNull();
});