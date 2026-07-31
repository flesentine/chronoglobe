const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Hint cancel button test runs once on desktop Chromium');
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
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeActiveGame'))).not.toBeNull();
}

test('Cancel closes hint confirmation without changing hint state or saved game', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await startCleanGame(page);

  const savedBefore = await page.evaluate(() => localStorage.getItem('chronoglobeActiveGame'));

  await page.locator('#hintBtn').click();

  const dialog = page.locator('#confirmHint');
  const game = page.locator('#gameApp');
  const hintBox = page.locator('#hintBox');
  const hintButton = page.locator('#hintBtn');

  await expect(dialog).toHaveClass(/show/);
  await expect(page.locator('#cancelHintBtn')).toBeFocused();
  await expect(game).toHaveAttribute('aria-hidden', 'true');
  await expect(game).toHaveAttribute('inert', '');

  await page.locator('#cancelHintBtn').click();

  await expect(dialog).not.toHaveClass(/show/);
  await expect(game).toHaveAttribute('aria-hidden', 'false');
  await expect(game).not.toHaveAttribute('inert', '');
  await expect(hintButton).toBeFocused();
  await expect(hintBox).not.toHaveClass(/show/);
  await expect(page.locator('#roundCapText')).toBeHidden();
  await expect(hintButton).toBeEnabled();
  await expect(hintButton).toHaveText('Use hint — max 8,000');
  await expect(page.locator('#hudScore')).toHaveText('Up to 10,000');

  const savedAfter = await page.evaluate(() => localStorage.getItem('chronoglobeActiveGame'));
  expect(savedAfter).toBe(savedBefore);

  const saved = JSON.parse(savedAfter);
  expect(saved.phase).toBe('guessing');
  expect(saved.hintUsed).toBe(false);
  expect(saved.hintsUsed).toBe(0);
  expect(saved.roundCap).toBe(10000);
  expect(saved.adjustedMaximum).toBe(saved.originalMaximum);
});
