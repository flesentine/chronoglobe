const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Final round resume test runs once on desktop Chromium');
}

async function waitForRoundOneReady(page) {
  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return {
      phase: saved?.phase,
      round: saved?.round,
      resultCount: saved?.roundResults?.length,
      guess: saved?.guess
    };
  })).toEqual({
    phase: 'guessing',
    round: 1,
    resultCount: 0,
    guess: null
  });

  await expect(page.locator('#lockBtn')).toBeVisible();
  await expect(page.locator('#lockBtn')).toBeDisabled();
  await expect(page.locator('#nextBtn')).toBeHidden();
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
  await waitForRoundOneReady(page);
}

test('a resumed fifth-round result opens the final score without changing its totals', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await startCleanGame(page);

  const lockButton = page.locator('#lockBtn');
  const nextButton = page.locator('#nextBtn');

  for (let round = 1; round <= 5; round += 1) {
    await page.evaluate(({ lat, lng }) => window.placeGuess(lat, lng), {
      lat: 10 + round,
      lng: 15 + round
    });
    await expect(lockButton).toBeEnabled();
    await lockButton.click();

    await expect(page.locator('#scoreDock')).toHaveClass(/show/);
    await expect(nextButton).toBeVisible();

    if (round < 5) {
      await nextButton.click();
      await expect(page.locator('#roundStat')).toHaveText(`${round + 1} / 5`);
      await expect(lockButton).toBeDisabled();
    }
  }

  const finalScore = (await page.locator('#scoreStat').textContent()).trim();
  const beforeReload = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return {
      phase: saved?.phase,
      round: saved?.round,
      score: saved?.score,
      resultCount: saved?.roundResults?.length
    };
  });

  expect(beforeReload).toEqual({
    phase: 'result',
    round: 5,
    score: Number(finalScore.replace(/[^0-9]/g, '')),
    resultCount: 5
  });

  await page.reload();
  await expect(page.locator('#resumeGameDialog')).toHaveClass(/show/);
  await page.locator('#resumeSavedBtn').click();

  await expect(page.locator('#roundStat')).toHaveText('5 / 5');
  await expect(page.locator('#scoreDock')).toHaveClass(/show/);
  await expect(page.locator('#scoreStat')).toHaveText(finalScore);
  await expect(nextButton).toBeVisible();
  await expect(lockButton).toBeHidden();

  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return {
      phase: saved?.phase,
      round: saved?.round,
      score: saved?.score,
      resultCount: saved?.roundResults?.length
    };
  })).toEqual(beforeReload);

  await nextButton.click();

  const endScreen = page.locator('#endScreen');
  await expect(endScreen).toHaveClass(/show/);
  await expect(page.locator('#playAgainBtn')).toBeVisible();
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#endTitle')).toHaveText(/Curious Traveler|History Hunter|Time Traveler|Master Historian/);
  await expect(endScreen).toContainText(finalScore);
});
