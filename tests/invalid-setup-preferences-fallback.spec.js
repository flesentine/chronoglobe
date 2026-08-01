const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Invalid setup preference test runs once on desktop Chromium');
}

test('invalid saved setup preferences fall back to Easy and 5 rounds', async ({ page }, testInfo) => {
  desktopOnly(testInfo);

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('chronoglobeDifficulty', 'impossible');
    localStorage.setItem('chronoglobeRounds', '99');
  });
  await page.reload();

  await expect(page.locator('input[name="difficultyChoice"][value="easy"]')).toBeChecked();
  await expect(page.locator('input[name="roundChoice"][value="5"]')).toBeChecked();
  await expect(page.locator('#difficultyDescription')).toContainText('Recommended for your first game');
  await expect(page.locator('#startGameBtn')).toHaveText('Start a quick Easy game');

  await page.locator('#startGameBtn').click();

  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#gameConfigText')).toHaveText('Easy · 5 rounds');
  await expect(page.locator('#roundStat')).toHaveText('1 / 5');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeDifficulty'))).toBe('easy');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeRounds'))).toBe('5');
});
