const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Hint reset test runs once on desktop Chromium');
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

test('using a hint resets the per-round cap on the following round', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await startCleanGame(page);

  await page.locator('#hintBtn').click();
  await expect(page.locator('#hintBtn')).toBeDisabled();
  await expect(page.locator('#hintBtn')).toHaveText('Hint revealed · max 8,000');
  await expect(page.locator('#roundCapText')).toBeVisible();
  await expect(page.locator('#hudScore')).toHaveText('Up to 8,000');

  const canvas = page.locator('#globe canvas').first();
  await expect(canvas).toBeVisible();
  await canvas.click({ position: { x: 200, y: 200 } });
  await expect(page.locator('#lockBtn')).toBeEnabled();
  await page.locator('#lockBtn').click();

  await expect(page.locator('#nextBtn')).toBeVisible();
  await page.locator('#nextBtn').click();

  await expect(page.locator('#roundStat')).toHaveText('2 / 5');
  await expect(page.locator('#hintBtn')).toBeEnabled();
  await expect(page.locator('#hintBtn')).toHaveText('Use hint — max 8,000');
  await expect(page.locator('#roundCapText')).toBeHidden();
  await expect(page.locator('#hintBox')).not.toHaveClass(/show/);
  await expect(page.locator('#hudScore')).toHaveText('Up to 10,000');

  await expect.poll(async () => {
    return page.evaluate(() => {
      const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
      return {
        round: saved?.state?.round,
        hintUsed: saved?.state?.hintUsed,
        roundCap: saved?.state?.roundCap,
        hintsUsed: saved?.state?.hintsUsed,
        adjustedMaximum: saved?.state?.adjustedMaximum
      };
    });
  }).toEqual({
    round: 2,
    hintUsed: false,
    roundCap: 10000,
    hintsUsed: 1,
    adjustedMaximum: 48000
  });
});
