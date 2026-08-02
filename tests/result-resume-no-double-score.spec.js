const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Result resume test runs once on desktop Chromium');
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

test('completed round result survives resume without scoring twice', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await startCleanGame(page);

  const canvas = page.locator('#globe canvas').first();
  await expect(canvas).toBeVisible();
  await canvas.click({ position: { x: 220, y: 210 } });
  await expect(page.locator('#lockBtn')).toBeEnabled();
  await page.locator('#lockBtn').click();

  await expect(page.locator('#scoreDock')).toHaveClass(/show/);
  await expect(page.locator('#nextBtn')).toBeVisible();

  const before = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return {
      phase: saved.phase,
      round: saved.round,
      score: saved.score,
      resultCount: saved.roundResults.length
    };
  });

  expect(before.phase).toBe('result');
  expect(before.round).toBe(1);
  expect(before.resultCount).toBe(1);

  const expectedUi = {
    location: await page.locator('#hudLocation').innerText(),
    distance: await page.locator('#hudDistance').innerText(),
    score: await page.locator('#hudScore').innerText(),
    scoreStat: await page.locator('#scoreStat').innerText()
  };

  await page.reload();
  await expect(page.locator('#resumeGameDialog')).toHaveClass(/show/);
  await page.locator('#resumeSavedBtn').click();

  await expect(page.locator('#scoreDock')).toHaveClass(/show/);
  await expect(page.locator('#nextBtn')).toBeVisible();
  await expect(page.locator('#lockBtn')).toBeHidden();
  await expect(page.locator('#hudLocation')).toHaveText(expectedUi.location);
  await expect(page.locator('#hudDistance')).toHaveText(expectedUi.distance);
  await expect(page.locator('#hudScore')).toHaveText(expectedUi.score);
  await expect(page.locator('#scoreStat')).toHaveText(expectedUi.scoreStat);

  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return {
      phase: saved.phase,
      round: saved.round,
      score: saved.score,
      resultCount: saved.roundResults.length
    };
  })).toEqual(before);
});
