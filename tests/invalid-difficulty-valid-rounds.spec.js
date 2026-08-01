const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Setup preference fallback test runs once on desktop Chromium');
}

test('invalid difficulty preserves a valid saved round count', async ({ page }, testInfo) => {
  desktopOnly(testInfo);

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('chronoglobeDifficulty', 'impossible');
    localStorage.setItem('chronoglobeRounds', '10');
  });
  await page.reload();

  await expect(page.locator('input[name="difficultyChoice"][value="easy"]')).toBeChecked();
  await expect(page.locator('input[name="roundChoice"][value="10"]')).toBeChecked();
  await expect(page.locator('#difficultyDescription')).toContainText('Recommended for your first game');
  await expect(page.locator('#startGameBtn')).toHaveText('Start 10-round Easy game');

  await page.locator('#startGameBtn').click();

  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#gameConfigText')).toHaveText('Easy · 10 rounds');
  await expect(page.locator('#roundStat')).toHaveText('1 / 10');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeDifficulty'))).toBe('easy');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeRounds'))).toBe('10');
});
