const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Hinted result resume test runs once on desktop Chromium');
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

test('a completed hinted round two resumes without double counting its score or hint', async ({ page }, testInfo) => {
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

  await expect(page.locator('#scoreDock')).toHaveClass(/show/);
  await expect(page.locator('#nextBtn')).toBeVisible();

  const expectedUi = {
    location: await page.locator('#hudLocation').innerText(),
    distance: await page.locator('#hudDistance').innerText(),
    roundScore: await page.locator('#hudScore').innerText(),
    totalScore: await page.locator('#scoreStat').innerText()
  };

  const before = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return {
      phase: saved.phase,
      round: saved.round,
      score: saved.score,
      resultCount: saved.roundResults.length,
      hintUsed: saved.hintUsed,
      roundCap: saved.roundCap,
      hintsUsed: saved.hintsUsed,
      originalMaximum: saved.originalMaximum,
      adjustedMaximum: saved.adjustedMaximum
    };
  });

  expect(before).toMatchObject({
    phase: 'result',
    round: 2,
    resultCount: 2,
    hintUsed: true,
    roundCap: 8000,
    hintsUsed: 1,
    originalMaximum: 50000,
    adjustedMaximum: 48000
  });

  await page.reload();
  await expect(page.locator('#resumeGameDialog')).toHaveClass(/show/);
  await page.locator('#resumeSavedBtn').click();

  await expect(page.locator('#roundStat')).toHaveText('2 / 5');
  await expect(page.locator('#scoreDock')).toHaveClass(/show/);
  await expect(page.locator('#nextBtn')).toBeVisible();
  await expect(page.locator('#lockBtn')).toBeHidden();
  await expect(page.locator('#hudLocation')).toHaveText(expectedUi.location);
  await expect(page.locator('#hudDistance')).toHaveText(expectedUi.distance);
  await expect(page.locator('#hudScore')).toHaveText(expectedUi.roundScore);
  await expect(page.locator('#scoreStat')).toHaveText(expectedUi.totalScore);

  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return {
      phase: saved.phase,
      round: saved.round,
      score: saved.score,
      resultCount: saved.roundResults.length,
      hintUsed: saved.hintUsed,
      roundCap: saved.roundCap,
      hintsUsed: saved.hintsUsed,
      originalMaximum: saved.originalMaximum,
      adjustedMaximum: saved.adjustedMaximum
    };
  })).toEqual(before);
});
