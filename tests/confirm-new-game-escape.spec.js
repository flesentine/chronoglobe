const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Nested confirmation Escape contract runs once on desktop Chromium');
}

test('Escape cancels new-game confirmation and restores the game menu', async ({ page }, testInfo) => {
  desktopOnly(testInfo);

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#startScreen')).toHaveClass(/show/);

  await page.locator('#startGameBtn').click();
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#factText')).not.toHaveText('Choose a game to begin.');

  // Meaningful progress is required before New Game uses the confirmation path.
  await page.evaluate(() => window.placeGuess(12, 12));
  await expect(page.locator('#lockBtn')).toBeEnabled();

  await page.locator('#menuBtn').click();
  await expect(page.locator('#gameMenu')).toHaveClass(/show/);
  await expect(page.locator('#gameApp')).toHaveAttribute('inert', '');

  await page.locator('#newGameBtn').click();
  await expect(page.locator('#confirmNewGame')).toHaveClass(/show/);
  await expect(page.locator('#cancelNewGameBtn')).toBeFocused();
  await expect(page.locator('#gameMenu')).toHaveAttribute('inert', '');
  await expect(page.locator('#gameMenu')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#gameApp')).toHaveAttribute('inert', '');

  await page.keyboard.press('Escape');

  await expect(page.locator('#confirmNewGame')).not.toHaveClass(/show/);
  await expect(page.locator('#gameMenu')).toHaveClass(/show/);
  await expect(page.locator('#gameMenu')).not.toHaveAttribute('inert', '');
  await expect(page.locator('#gameMenu')).not.toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#gameApp')).toHaveAttribute('inert', '');
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#newGameBtn')).toBeFocused();

  await page.evaluate(() => document.querySelector('#menuBtn')?.focus());
  expect(await page.evaluate(() => document.querySelector('#gameMenu')?.contains(document.activeElement))).toBe(true);

  await page.locator('#resumeBtn').click();
  await expect(page.locator('#gameApp')).not.toHaveAttribute('inert', '');
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#menuBtn')).toBeFocused();
});
