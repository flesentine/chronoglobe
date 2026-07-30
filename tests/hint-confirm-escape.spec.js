const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Hint confirmation Escape contract runs once on desktop Chromium');
}

test('Escape cancels the hint confirmation and restores the active round', async ({ page }, testInfo) => {
  desktopOnly(testInfo);

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#startScreen')).toHaveClass(/show/);

  await page.locator('#startGameBtn').click();
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#roundStat')).toContainText('1 / 5');
  await expect(page.locator('#factText')).not.toHaveText('Choose a game to begin.');
  await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('chronoglobeActiveGame')))).toBe(true);

  await page.locator('#hintBtn').click();
  await expect(page.locator('#confirmHint')).toHaveClass(/show/);
  await expect(page.locator('#cancelHintBtn')).toBeFocused();
  await expect(page.locator('#gameApp')).toHaveAttribute('inert', '');
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'true');

  const savedBeforeEscape = await page.evaluate(() => localStorage.getItem('chronoglobeActiveGame'));
  await page.keyboard.press('Escape');

  await expect(page.locator('#confirmHint')).not.toHaveClass(/show/);
  await expect(page.locator('#gameApp')).not.toHaveAttribute('inert', '');
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#hintBtn')).toBeFocused();
  await expect(page.locator('#hintBox')).not.toHaveClass(/show/);
  await expect(page.locator('#hintBtn')).toBeEnabled();
  await expect(page.locator('#hintBtn')).toHaveText('Use hint — max 8,000');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeActiveGame'))).toBe(savedBeforeEscape);
});
