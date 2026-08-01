const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Partial setup preference fallback runs once on desktop Chromium');
}

test('a valid difficulty survives when the stored round count is invalid', async ({ page }, testInfo) => {
  desktopOnly(testInfo);

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('chronoglobeDifficulty', 'hard');
    localStorage.setItem('chronoglobeRounds', '999');
  });
  await page.reload();

  await expect(page.locator('input[name="difficultyChoice"][value="hard"]')).toBeChecked();
  await expect(page.locator('input[name="roundChoice"][value="5"]')).toBeChecked();
  await expect(page.locator('#difficultyDescription')).toHaveText('No political overlays, with more indirect location guidance.');
  await expect(page.locator('#startGameBtn')).toHaveText('Start 5-round Hard game');

  await page.locator('#startGameBtn').click();

  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#gameConfigText')).toHaveText('Hard · 5 rounds');
  await expect(page.locator('#roundStat')).toHaveText('1 / 5');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeDifficulty'))).toBe('hard');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeRounds'))).toBe('5');
});
