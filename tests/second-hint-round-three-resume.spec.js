const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Second hint resume test runs once on desktop Chromium');
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

test('a second hint on round three survives resume without applying its penalty twice', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await startCleanGame(page);

  const canvas = page.locator('#globe canvas').first();
  await expect(canvas).toBeVisible();

  await canvas.click({ position: { x: 220, y: 210 } });
  await expect(page.locator('#lockBtn')).toBeEnabled();
  await page.locator('#lockBtn').click();
  await expect(page.locator('#nextBtn')).toBeVisible();
  await page.locator('#nextBtn').click();

  await expect(page.locator('#roundStat')).toHaveText('2 / 5');
  await page.locator('#hintBtn').click();
  await expect(page.locator('#hintBtn')).toBeDisabled();

  await canvas.click({ position: { x: 245, y: 225 } });
  await expect(page.locator('#lockBtn')).toBeEnabled();
  await page.locator('#lockBtn').click();
  await expect(page.locator('#nextBtn')).toBeVisible();
  await page.locator('#nextBtn').click();

  await expect(page.locator('#roundStat')).toHaveText('3 / 5');
  const scoreAfterRoundTwo = (await page.locator('#scoreStat').textContent()).trim();

  await page.locator('#hintBtn').click();
  await expect(page.locator('#hintBtn')).toBeDisabled();
  await expect(page.locator('#hintBtn')).toHaveText('Hint revealed · max 8,000');
  await expect(page.locator('#roundCapText')).toBeVisible();
  await expect(page.locator('#hintBox')).toHaveClass(/show/);
  await expect(page.locator('#hudScore')).toHaveText('Up to 8,000');

  const before = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return {
      phase: saved.phase,
      round: saved.round,
      score: saved.score,
      resultCount: saved.roundResults.length,
      guess: saved.guess,
      hintUsed: saved.hintUsed,
      roundCap: saved.roundCap,
      hintsUsed: saved.hintsUsed,
      originalMaximum: saved.originalMaximum,
      adjustedMaximum: saved.adjustedMaximum
    };
  });

  expect(before).toEqual({
    phase: 'guessing',
    round: 3,
    score: Number(scoreAfterRoundTwo.replace(/[^0-9]/g, '')),
    resultCount: 2,
    guess: null,
    hintUsed: true,
    roundCap: 8000,
    hintsUsed: 2,
    originalMaximum: 50000,
    adjustedMaximum: 46000
  });

  await page.reload();
  await expect(page.locator('#resumeGameDialog')).toHaveClass(/show/);
  await page.locator('#resumeSavedBtn').click();

  await expect(page.locator('#roundStat')).toHaveText('3 / 5');
  await expect(page.locator('#scoreStat')).toHaveText(scoreAfterRoundTwo);
  await expect(page.locator('#nextBtn')).toBeHidden();
  await expect(page.locator('#lockBtn')).toBeVisible();
  await expect(page.locator('#lockBtn')).toBeDisabled();
  await expect(page.locator('#hintBtn')).toBeDisabled();
  await expect(page.locator('#hintBtn')).toHaveText('Hint revealed · max 8,000');
  await expect(page.locator('#roundCapText')).toBeVisible();
  await expect(page.locator('#hintBox')).toHaveClass(/show/);
  await expect(page.locator('#hudScore')).toHaveText('Up to 8,000');

  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return {
      phase: saved.phase,
      round: saved.round,
      score: saved.score,
      resultCount: saved.roundResults.length,
      guess: saved.guess,
      hintUsed: saved.hintUsed,
      roundCap: saved.roundCap,
      hintsUsed: saved.hintsUsed,
      originalMaximum: saved.originalMaximum,
      adjustedMaximum: saved.adjustedMaximum
    };
  })).toEqual(before);
});