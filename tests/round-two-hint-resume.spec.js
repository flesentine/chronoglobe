const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Round two hint resume test runs once on desktop Chromium');
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

test('a hint used on round two survives reload with the prior result intact', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await startCleanGame(page);

  const canvas = page.locator('#globe canvas').first();
  await expect(canvas).toBeVisible();
  await canvas.click({ position: { x: 220, y: 210 } });
  await expect(page.locator('#lockBtn')).toBeEnabled();
  await page.locator('#lockBtn').click();

  await expect(page.locator('#nextBtn')).toBeVisible();
  const scoreAfterRoundOne = (await page.locator('#scoreStat').textContent()).trim();
  await page.locator('#nextBtn').click();

  await expect(page.locator('#roundStat')).toHaveText('2 / 5');
  await expect(page.locator('#scoreStat')).toHaveText(scoreAfterRoundOne);
  await page.locator('#hintBtn').click();

  await expect(page.locator('#hintBtn')).toBeDisabled();
  await expect(page.locator('#hintBtn')).toHaveText('Hint revealed · max 8,000');
  await expect(page.locator('#roundCapText')).toBeVisible();
  await expect(page.locator('#hintBox')).toHaveClass(/show/);
  await expect(page.locator('#hudScore')).toHaveText('Up to 8,000');

  await page.reload();
  await expect(page.locator('#resumeGameDialog')).toHaveClass(/show/);
  await page.locator('#resumeSavedBtn').click();

  await expect(page.locator('#roundStat')).toHaveText('2 / 5');
  await expect(page.locator('#scoreStat')).toHaveText(scoreAfterRoundOne);
  await expect(page.locator('#nextBtn')).toBeHidden();
  await expect(page.locator('#lockBtn')).toBeVisible();
  await expect(page.locator('#lockBtn')).toBeDisabled();
  await expect(page.locator('#hintBtn')).toBeDisabled();
  await expect(page.locator('#hintBtn')).toHaveText('Hint revealed · max 8,000');
  await expect(page.locator('#roundCapText')).toBeVisible();
  await expect(page.locator('#hintBox')).toHaveClass(/show/);
  await expect(page.locator('#hudScore')).toHaveText('Up to 8,000');

  await expect.poll(async () => {
    return page.evaluate(() => {
      const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
      return {
        phase: saved?.phase,
        round: saved?.round,
        score: saved?.score,
        results: saved?.roundResults?.length,
        guess: saved?.guess,
        hintUsed: saved?.hintUsed,
        roundCap: saved?.roundCap,
        hintsUsed: saved?.hintsUsed,
        originalMaximum: saved?.originalMaximum,
        adjustedMaximum: saved?.adjustedMaximum
      };
    });
  }).toEqual({
    phase: 'guessing',
    round: 2,
    score: Number(scoreAfterRoundOne.replace(/[^0-9]/g, '')),
    results: 1,
    guess: null,
    hintUsed: true,
    roundCap: 8000,
    hintsUsed: 1,
    originalMaximum: 50000,
    adjustedMaximum: 48000
  });
});
