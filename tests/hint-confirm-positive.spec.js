const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Confirmed hint test runs once on desktop Chromium');
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
  await expect(page.locator('#hintBtn')).toBeEnabled();
}

test('confirming a hint restores the round, applies the score cap, and persists usage', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await startCleanGame(page);

  const game = page.locator('#gameApp');
  const dialog = page.locator('#confirmHint');
  const hintButton = page.locator('#hintBtn');
  const hintBox = page.locator('#hintBox');
  const roundCap = page.locator('#roundCapText');

  await hintButton.click();

  await expect(dialog).toHaveClass(/show/);
  await expect(game).toHaveAttribute('aria-hidden', 'true');
  await expect(game).toHaveAttribute('inert', '');
  await expect(page.locator('#cancelHintBtn')).toBeFocused();

  await page.locator('#confirmHintBtn').click();

  await expect(dialog).not.toHaveClass(/show/);
  await expect(game).toHaveAttribute('aria-hidden', 'false');
  await expect(game).not.toHaveAttribute('inert', '');
  await expect(hintBox).toHaveClass(/show/);
  await expect(roundCap).toBeVisible();
  await expect(roundCap).toHaveText('Round max: 8,000');
  await expect(hintButton).toBeDisabled();
  await expect(hintButton).toHaveText('Hint revealed · max 8,000');
  await expect(page.locator('#hudScore')).toHaveText('Up to 8,000');

  await expect.poll(async () => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame') || 'null');
    return saved && {
      phase: saved.phase,
      hintUsed: saved.hintUsed,
      hintsUsed: saved.hintsUsed,
      roundCap: saved.roundCap,
      adjustedMaximum: saved.adjustedMaximum,
    };
  })).toEqual({
    phase: 'guessing',
    hintUsed: true,
    hintsUsed: 1,
    roundCap: 8000,
    adjustedMaximum: 48000,
  });
});
