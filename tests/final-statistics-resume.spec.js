const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Final statistics resume test runs once on desktop Chromium');
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
  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return {
      phase: saved?.phase,
      round: saved?.round,
      totalRounds: saved?.config?.totalRounds,
      resultCount: saved?.roundResults?.length,
      guess: saved?.guess
    };
  })).toEqual({
    phase: 'guessing',
    round: 1,
    totalRounds: 5,
    resultCount: 0,
    guess: null
  });
}

async function placeExactGuess(page) {
  await page.evaluate(() => {
    const clue = document.querySelector('#factText')?.textContent;
    const answer = window.CHRONO_FACTS?.find(item => item.fact === clue);
    if (!answer) throw new Error(`Could not resolve the active clue: ${clue}`);
    window.placeGuess(answer.lat, answer.lng);
  });
}

test('resuming the fifth-round result preserves the final best guess, average, and streak', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await startCleanGame(page);

  const lockButton = page.locator('#lockBtn');
  const nextButton = page.locator('#nextBtn');

  for (let round = 1; round <= 5; round += 1) {
    await placeExactGuess(page);
    await expect(lockButton).toBeEnabled();
    await lockButton.click();
    await expect(page.locator('#hudDistance')).toHaveText('0 m');
    await expect(page.locator('#hudScore')).toHaveText('10,000 / 10,000');
    await expect(nextButton).toBeVisible();

    if (round < 5) {
      await nextButton.click();
      await expect(page.locator('#roundStat')).toHaveText(`${round + 1} / 5`);
      await expect(lockButton).toBeDisabled();
    }
  }

  const beforeReload = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return {
      phase: saved?.phase,
      round: saved?.round,
      score: saved?.score,
      resultCount: saved?.roundResults?.length,
      distances: saved?.distances,
      streak: saved?.streak,
      bestStreak: saved?.bestStreak
    };
  });

  expect(beforeReload).toMatchObject({
    phase: 'result',
    round: 5,
    score: 50000,
    resultCount: 5,
    streak: 5,
    bestStreak: 5
  });
  expect(beforeReload.distances).toHaveLength(5);
  expect(beforeReload.distances.every(distance => distance === 0)).toBe(true);

  await page.reload();
  await expect(page.locator('#resumeGameDialog')).toHaveClass(/show/);
  await page.locator('#resumeSavedBtn').click();

  await expect(page.locator('#roundStat')).toHaveText('5 / 5');
  await expect(page.locator('#scoreStat')).toHaveText('50,000');
  await expect(page.locator('#streakStat')).toHaveText('5');
  await expect(nextButton).toHaveText('See final score →');

  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return {
      phase: saved?.phase,
      round: saved?.round,
      score: saved?.score,
      resultCount: saved?.roundResults?.length,
      distances: saved?.distances,
      streak: saved?.streak,
      bestStreak: saved?.bestStreak
    };
  })).toEqual(beforeReload);

  await nextButton.click();

  await expect(page.locator('#endScreen')).toHaveClass(/show/);
  await expect(page.locator('#bestGuess')).toHaveText('0 km');
  await expect(page.locator('#avgDistance')).toHaveText('0 km');
  await expect(page.locator('#bestStreak')).toHaveText('5');
  expect(await page.evaluate(() => localStorage.getItem('chronoglobeActiveGame'))).toBeNull();
});
