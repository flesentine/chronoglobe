const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Hint resume persistence runs once on desktop Chromium');
}

async function startCleanGame(page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.locator('#startGameBtn').click();
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
}

test('a confirmed hint survives reload and resume without a duplicate charge', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await startCleanGame(page);

  await page.locator('#hintBtn').click();
  await expect(page.locator('#confirmHint')).toHaveClass(/show/);
  await page.locator('#confirmHintBtn').click();

  await expect(page.locator('#hintBox')).toHaveClass(/show/);
  await expect(page.locator('#roundCapText')).toBeVisible();
  await expect(page.locator('#hintBtn')).toBeDisabled();
  await expect(page.locator('#hintBtn')).toHaveText('Hint revealed · max 8,000');

  const savedBeforeReload = await page.evaluate(() => JSON.parse(localStorage.getItem('chronoglobeActiveGame')));
  expect(savedBeforeReload.phase).toBe('guessing');
  expect(savedBeforeReload.hintUsed).toBe(true);
  expect(savedBeforeReload.hintsUsed).toBe(1);
  expect(savedBeforeReload.roundCap).toBe(8000);
  expect(savedBeforeReload.adjustedMaximum).toBe(48000);

  await page.reload();

  await expect(page.locator('#resumeGameDialog')).toHaveClass(/show/);
  await page.locator('#resumeSavedBtn').click();

  await expect(page.locator('#resumeGameDialog')).not.toHaveClass(/show/);
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#hintBox')).toHaveClass(/show/);
  await expect(page.locator('#roundCapText')).toBeVisible();
  await expect(page.locator('#hintBtn')).toBeDisabled();
  await expect(page.locator('#hintBtn')).toHaveText('Hint revealed · max 8,000');
  await expect(page.locator('#hudScore')).toHaveText('Up to 8,000');

  const savedAfterResume = await page.evaluate(() => JSON.parse(localStorage.getItem('chronoglobeActiveGame')));
  expect(savedAfterResume.phase).toBe('guessing');
  expect(savedAfterResume.hintUsed).toBe(true);
  expect(savedAfterResume.hintsUsed).toBe(1);
  expect(savedAfterResume.roundCap).toBe(8000);
  expect(savedAfterResume.adjustedMaximum).toBe(48000);
});
