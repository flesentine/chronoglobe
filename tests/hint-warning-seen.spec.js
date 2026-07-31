const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Hint warning preference test runs once on desktop Chromium');
}

async function startCleanGame(page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('chronoglobeHintCostSeen', '1');
  });
  await page.reload();
  await page.locator('#startGameBtn').click();
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
}

test('acknowledged hint warning reveals immediately and persists the score cap', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await startCleanGame(page);

  const hintButton = page.locator('#hintBtn');
  const hintDialog = page.locator('#confirmHint');
  const game = page.locator('#gameApp');

  await hintButton.click();

  await expect(hintDialog).not.toHaveClass(/show/);
  await expect(game).toHaveAttribute('aria-hidden', 'false');
  await expect(game).not.toHaveAttribute('inert', '');
  await expect(page.locator('#hintBox')).toHaveClass(/show/);
  await expect(page.locator('#roundCapText')).toBeVisible();
  await expect(page.locator('#roundCapText')).toHaveText('Round max: 8,000');
  await expect(hintButton).toBeDisabled();
  await expect(hintButton).toHaveText('Hint revealed · max 8,000');
  await expect(page.locator('#hudScore')).toHaveText('Up to 8,000');

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('chronoglobeActiveGame')));
  expect(saved.phase).toBe('guessing');
  expect(saved.hintUsed).toBe(true);
  expect(saved.hintsUsed).toBe(1);
  expect(saved.roundCap).toBe(8000);
  expect(saved.adjustedMaximum).toBe(saved.originalMaximum - 2000);
});
