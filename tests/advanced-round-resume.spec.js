const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Advanced-round resume test runs once on desktop Chromium');
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

test('round two remains in guessing mode after reload and resume', async ({ page }, testInfo) => {
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
  await expect(page.locator('#lockBtn')).toBeVisible();
  await expect(page.locator('#lockBtn')).toBeDisabled();
  const scoreAfterRoundOne = (await page.locator('#scoreStat').textContent()).trim();

  await page.reload();
  await expect(page.locator('#resumeGameDialog')).toHaveClass(/show/);
  await page.locator('#resumeSavedBtn').click();

  await expect(page.locator('#roundStat')).toHaveText('2 / 5');
  await expect(page.locator('#scoreStat')).toHaveText(scoreAfterRoundOne);
  await expect(page.locator('#statusText')).toHaveText('Choose a location');
  await expect(page.locator('#nextBtn')).toBeHidden();
  await expect(page.locator('#lockBtn')).toBeVisible();
  await expect(page.locator('#lockBtn')).toBeDisabled();
  await expect(page.locator('#hintBtn')).toBeEnabled();
  await expect(page.locator('#hudScore')).toHaveText('Up to 10,000');

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
        roundCap: saved?.roundCap
      };
    });
  }).toEqual({
    phase: 'guessing',
    round: 2,
    score: Number(scoreAfterRoundOne.replace(/[^0-9]/g, '')),
    results: 1,
    guess: null,
    hintUsed: false,
    roundCap: 10000
  });
});
