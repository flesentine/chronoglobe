const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Resumed final-round hint summary test runs once on desktop Chromium');
}

async function waitForGuessingRound(page, round) {
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
    round,
    resultCount: round - 1,
    guess: null
  });
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
  await waitForGuessingRound(page, 1);
}

test('a resumed hinted fifth-round result keeps one penalty in the final summary', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await startCleanGame(page);

  const hintButton = page.locator('#hintBtn');
  const lockButton = page.locator('#lockBtn');
  const nextButton = page.locator('#nextBtn');

  for (let round = 1; round <= 5; round += 1) {
    if (round === 5) {
      await hintButton.click();
      await expect(hintButton).toBeDisabled();
      await expect(hintButton).toHaveText('Hint revealed · max 8,000');
      await expect(page.locator('#hudScore')).toHaveText('Up to 8,000');
    }

    await page.evaluate(({ lat, lng }) => window.placeGuess(lat, lng), {
      lat: 9 + round,
      lng: 27 + round
    });
    await expect(lockButton).toBeEnabled();
    await lockButton.click();
    await expect(nextButton).toBeVisible();

    if (round < 5) {
      await nextButton.click();
      await waitForGuessingRound(page, round + 1);
    }
  }

  const finalScore = (await page.locator('#scoreStat').textContent()).trim();
  const beforeReload = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    const finalResult = saved?.roundResults?.at(-1);
    return {
      phase: saved?.phase,
      round: saved?.round,
      score: saved?.score,
      resultCount: saved?.roundResults?.length,
      hintsUsed: saved?.hintsUsed,
      originalMaximum: saved?.originalMaximum,
      adjustedMaximum: saved?.adjustedMaximum,
      hintUsed: saved?.hintUsed,
      roundCap: saved?.roundCap,
      finalResultHintUsed: finalResult?.hintUsed,
      finalResultRoundCap: finalResult?.roundCap
    };
  });

  expect(beforeReload).toEqual({
    phase: 'result',
    round: 5,
    score: Number(finalScore.replace(/[^0-9]/g, '')),
    resultCount: 5,
    hintsUsed: 1,
    originalMaximum: 50000,
    adjustedMaximum: 48000,
    hintUsed: true,
    roundCap: 8000,
    finalResultHintUsed: true,
    finalResultRoundCap: 8000
  });

  await page.reload();
  await expect(page.locator('#resumeGameDialog')).toHaveClass(/show/);
  await page.locator('#resumeSavedBtn').click();

  await expect(page.locator('#roundStat')).toHaveText('5 / 5');
  await expect(page.locator('#scoreStat')).toHaveText(finalScore);
  await expect(page.locator('#scoreDock')).toHaveClass(/show/);
  await expect(nextButton).toHaveText('See final score →');
  await expect(hintButton).toBeDisabled();
  await expect(page.locator('#hudScoreDetail')).toContainText(/Hint used|hint cap applied/);

  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    const finalResult = saved?.roundResults?.at(-1);
    return {
      phase: saved?.phase,
      round: saved?.round,
      score: saved?.score,
      resultCount: saved?.roundResults?.length,
      hintsUsed: saved?.hintsUsed,
      originalMaximum: saved?.originalMaximum,
      adjustedMaximum: saved?.adjustedMaximum,
      hintUsed: saved?.hintUsed,
      roundCap: saved?.roundCap,
      finalResultHintUsed: finalResult?.hintUsed,
      finalResultRoundCap: finalResult?.roundCap
    };
  })).toEqual(beforeReload);

  await nextButton.click();

  await expect(page.locator('#endScreen')).toHaveClass(/show/);
  await expect(page.locator('#finalScore')).toContainText(finalScore);
  await expect(page.locator('#finalMaximum')).toHaveText('out of 50,000');
  await expect(page.locator('#hintSummary')).toHaveText('1 hint used · 48,000 points available after hints');
  expect(await page.evaluate(() => localStorage.getItem('chronoglobeActiveGame'))).toBeNull();
});
