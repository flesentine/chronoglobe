const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Resumed hinted result advancement test runs once on desktop Chromium');
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

test('advancing from a resumed hinted result resets only the new round state', async ({ page }, testInfo) => {
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
  await expect(page.locator('#hudScore')).toHaveText('Up to 8,000');

  await canvas.click({ position: { x: 245, y: 225 } });
  await expect(page.locator('#lockBtn')).toBeEnabled();
  await page.locator('#lockBtn').click();
  await expect(page.locator('#nextBtn')).toBeVisible();

  const totalScore = (await page.locator('#scoreStat').innerText()).trim();

  await page.reload();
  await expect(page.locator('#resumeGameDialog')).toHaveClass(/show/);
  await page.locator('#resumeSavedBtn').click();

  await expect(page.locator('#roundStat')).toHaveText('2 / 5');
  await expect(page.locator('#nextBtn')).toBeVisible();
  await expect(page.locator('#scoreStat')).toHaveText(totalScore);
  await page.locator('#nextBtn').click();

  await expect(page.locator('#roundStat')).toHaveText('3 / 5');
  await expect(page.locator('#scoreStat')).toHaveText(totalScore);
  await expect(page.locator('#nextBtn')).toBeHidden();
  await expect(page.locator('#lockBtn')).toBeVisible();
  await expect(page.locator('#lockBtn')).toBeDisabled();
  await expect(page.locator('#hintBtn')).toBeEnabled();
  await expect(page.locator('#hintBtn')).toHaveText('Use hint — max 8,000');
  await expect(page.locator('#roundCapText')).toBeHidden();
  await expect(page.locator('#hintBox')).not.toHaveClass(/show/);
  await expect(page.locator('#hudScore')).toHaveText('Up to 10,000');

  await expect.poll(async () => {
    return page.evaluate(() => {
      const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
      return {
        phase: saved?.phase,
        round: saved?.round,
        score: saved?.score,
        resultCount: saved?.roundResults?.length,
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
    round: 3,
    score: Number(totalScore.replace(/[^0-9]/g, '')),
    resultCount: 2,
    guess: null,
    hintUsed: false,
    roundCap: 10000,
    hintsUsed: 1,
    originalMaximum: 50000,
    adjustedMaximum: 48000
  });
});
