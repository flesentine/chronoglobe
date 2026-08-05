const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Final-round hint summary test runs once on desktop Chromium');
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
  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return {
      phase: saved?.phase,
      difficulty: saved?.config?.difficulty,
      totalRounds: saved?.config?.totalRounds,
      round: saved?.round,
      resultCount: saved?.roundResults?.length,
      guess: saved?.guess
    };
  })).toEqual({
    phase: 'guessing',
    difficulty: 'easy',
    totalRounds: 5,
    round: 1,
    resultCount: 0,
    guess: null
  });
}

test('a hint used on the final round is included in the final score summary', async ({ page }, testInfo) => {
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
      await expect(page.locator('#roundCapText')).toBeVisible();
      await expect(page.locator('#hudScore')).toHaveText('Up to 8,000');
    }

    await page.evaluate(({ lat, lng }) => window.placeGuess(lat, lng), {
      lat: 12 + round,
      lng: 30 + round
    });
    await expect(lockButton).toBeEnabled();
    await lockButton.click();
    await expect(nextButton).toBeVisible();

    if (round < 5) {
      await nextButton.click();
      await expect(page.locator('#roundStat')).toHaveText(`${round + 1} / 5`);
      await expect(lockButton).toBeDisabled();
    }
  }

  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    const finalResult = saved?.roundResults?.at(-1);
    return {
      phase: saved?.phase,
      round: saved?.round,
      resultCount: saved?.roundResults?.length,
      hintsUsed: saved?.hintsUsed,
      originalMaximum: saved?.originalMaximum,
      adjustedMaximum: saved?.adjustedMaximum,
      finalHintUsed: finalResult?.hintUsed,
      finalRoundCap: finalResult?.roundCap
    };
  })).toEqual({
    phase: 'result',
    round: 5,
    resultCount: 5,
    hintsUsed: 1,
    originalMaximum: 50000,
    adjustedMaximum: 48000,
    finalHintUsed: true,
    finalRoundCap: 8000
  });

  await expect(nextButton).toHaveText('See final score →');
  await nextButton.click();

  await expect(page.locator('#endScreen')).toHaveClass(/show/);
  await expect(page.locator('#finalMaximum')).toHaveText('out of 50,000');
  await expect(page.locator('#hintSummary')).toHaveText('1 hint used · 48,000 points available after hints');
  expect(await page.evaluate(() => localStorage.getItem('chronoglobeActiveGame'))).toBeNull();
});
