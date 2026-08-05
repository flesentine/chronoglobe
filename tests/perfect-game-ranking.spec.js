const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Perfect game ranking test runs once on desktop Chromium');
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

test('a perfect five-round game earns the Master Historian ranking', async ({ page }, testInfo) => {
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

    if (round < 5) {
      await nextButton.click();
      await expect(page.locator('#roundStat')).toHaveText(`${round + 1} / 5`);
      await expect(lockButton).toBeDisabled();
    }
  }

  await expect(page.locator('#scoreStat')).toHaveText('50,000');
  await expect(nextButton).toHaveText('See final score →');
  await nextButton.click();

  await expect(page.locator('#endScreen')).toHaveClass(/show/);
  await expect(page.locator('#endTitle')).toHaveText('Master Historian');
  await expect(page.locator('#endSubtitle')).toHaveText('You navigate the past like you were there.');
  await expect(page.locator('#finalScore')).toContainText('50,000');
  await expect(page.locator('#finalScore')).toContainText('total points');
  await expect(page.locator('#finalMaximum')).toHaveText('out of 50,000');
  await expect(page.locator('#hintSummary')).toHaveText('No hints used.');
  expect(await page.evaluate(() => localStorage.getItem('chronoglobeActiveGame'))).toBeNull();
});
