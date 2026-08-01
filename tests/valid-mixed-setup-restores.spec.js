const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Saved setup restoration test runs once on desktop Chromium');
}

test('valid Mixed 15-round setup restores exactly after reload', async ({ page }, testInfo) => {
  desktopOnly(testInfo);

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('chronoglobeDifficulty', 'mixed');
    localStorage.setItem('chronoglobeRounds', '15');
  });
  await page.reload();

  await expect(page.locator('input[name="difficultyChoice"][value="mixed"]')).toBeChecked();
  await expect(page.locator('input[name="roundChoice"][value="15"]')).toBeChecked();
  await expect(page.locator('#difficultyDescription')).toHaveText('A balanced mix of all four levels, including Expert, with no repeated event.');
  await expect(page.locator('#startGameBtn')).toHaveText('Start 15-round Mixed game');

  await page.locator('#startGameBtn').click();

  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#gameConfigText')).toHaveText('Mixed · 15 rounds');
  await expect(page.locator('#roundStat')).toHaveText('1 / 15');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeDifficulty'))).toBe('mixed');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeRounds'))).toBe('15');
});
