const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Finished-game reload test runs once on desktop Chromium');
}

async function waitForGuessingRound(page, round, difficulty = 'medium', totalRounds = 5) {
  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return {
      phase: saved?.phase,
      difficulty: saved?.config?.difficulty,
      totalRounds: saved?.config?.totalRounds,
      round: saved?.round,
      guess: saved?.guess
    };
  })).toEqual({
    phase: 'guessing',
    difficulty,
    totalRounds,
    round,
    guess: null
  });
}

test('reloading after a finished game returns to setup without offering resume', async ({ page }, testInfo) => {
  desktopOnly(testInfo);

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();

  const mediumChoice = page.locator('label.choice').filter({
    has: page.locator('input[name="difficultyChoice"][value="medium"]')
  });
  const fiveRoundChoice = page.locator('label.choice').filter({
    has: page.locator('input[name="roundChoice"][value="5"]')
  });

  await mediumChoice.click();
  await fiveRoundChoice.click();
  await expect(page.locator('#startGameBtn')).toHaveText('Start 5-round Medium game');
  await page.locator('#startGameBtn').click();

  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await waitForGuessingRound(page, 1);

  const lockButton = page.locator('#lockBtn');
  const nextButton = page.locator('#nextBtn');

  for (let round = 1; round <= 5; round += 1) {
    await page.evaluate(({ lat, lng }) => window.placeGuess(lat, lng), {
      lat: 5 + round,
      lng: 25 + round
    });
    await expect(lockButton).toBeEnabled();
    await lockButton.click();
    await expect(nextButton).toBeVisible();

    if (round < 5) {
      await nextButton.click();
      await expect(page.locator('#roundStat')).toHaveText(`${round + 1} / 5`);
      await waitForGuessingRound(page, round + 1);
    }
  }

  await nextButton.click();
  await expect(page.locator('#endScreen')).toHaveClass(/show/);
  await expect(page.locator('#playAgainBtn')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('chronoglobeActiveGame'))).toBeNull();

  await page.reload();

  await expect(page.locator('#resumeGameDialog')).not.toHaveClass(/show/);
  await expect(page.locator('#startScreen')).toHaveClass(/show/);
  await expect(page.locator('#endScreen')).not.toHaveClass(/show/);
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('input[name="difficultyChoice"][value="medium"]')).toBeChecked();
  await expect(page.locator('input[name="roundChoice"][value="5"]')).toBeChecked();
  await expect(page.locator('#startGameBtn')).toHaveText('Start 5-round Medium game');
  expect(await page.evaluate(() => localStorage.getItem('chronoglobeActiveGame'))).toBeNull();
});
