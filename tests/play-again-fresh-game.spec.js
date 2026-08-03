const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Play Again reset test runs once on desktop Chromium');
}

async function waitForFreshRoundOne(page, difficulty, totalRounds) {
  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return {
      phase: saved?.phase,
      difficulty: saved?.config?.difficulty,
      totalRounds: saved?.totalRounds,
      round: saved?.round,
      resultCount: saved?.roundResults?.length,
      guess: saved?.guess
    };
  })).toEqual({
    phase: 'guessing',
    difficulty,
    totalRounds,
    round: 1,
    resultCount: 0,
    guess: null
  });

  await expect(page.locator('#lockBtn')).toBeVisible();
  await expect(page.locator('#lockBtn')).toBeDisabled();
  await expect(page.locator('#nextBtn')).toBeHidden();
}

async function startConfiguredGame(page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('chronoglobeHintCostSeen', '1');
  });
  await page.reload();

  const hardChoice = page.locator('label.choice').filter({
    has: page.locator('input[name="difficultyChoice"][value="hard"]')
  });
  const fiveRoundChoice = page.locator('label.choice').filter({
    has: page.locator('input[name="roundChoice"][value="5"]')
  });

  await hardChoice.click();
  await fiveRoundChoice.click();
  await expect(page.locator('input[name="difficultyChoice"][value="hard"]')).toBeChecked();
  await expect(page.locator('input[name="roundChoice"][value="5"]')).toBeChecked();
  await expect(page.locator('#startGameBtn')).toHaveText('Start 5-round Hard game');
  await page.locator('#startGameBtn').click();

  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#gameConfigText')).toHaveText('Hard · 5 rounds');
  await waitForFreshRoundOne(page, 'hard', 5);
}

test('Play Again clears finished progress and starts a fresh game with the same setup', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await startConfiguredGame(page);

  const lockButton = page.locator('#lockBtn');
  const nextButton = page.locator('#nextBtn');

  for (let round = 1; round <= 5; round += 1) {
    if (round === 2) {
      await page.locator('#hintBtn').click();
      await expect(page.locator('#hintBtn')).toBeDisabled();
      await expect(page.locator('#hudScore')).toHaveText('Up to 8,000');
    }

    await page.evaluate(({ lat, lng }) => window.placeGuess(lat, lng), {
      lat: 8 + round,
      lng: 20 + round
    });
    await expect(lockButton).toBeEnabled();
    await lockButton.click();
    await expect(nextButton).toBeVisible();

    if (round < 5) {
      await nextButton.click();
      await expect(page.locator('#roundStat')).toHaveText(`${round + 1} / 5`);
    }
  }

  await nextButton.click();
  await expect(page.locator('#endScreen')).toHaveClass(/show/);
  await expect(page.locator('#hintSummary')).toContainText('1 hint used');
  await expect(page.locator('#playAgainBtn')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('chronoglobeActiveGame'))).toBeNull();

  await page.locator('#playAgainBtn').click();

  await expect(page.locator('#endScreen')).not.toHaveClass(/show/);
  await expect(page.locator('#startScreen')).toHaveClass(/show/);
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('input[name="difficultyChoice"][value="hard"]')).toBeChecked();
  await expect(page.locator('input[name="roundChoice"][value="5"]')).toBeChecked();
  await expect(page.locator('#startGameBtn')).toHaveText('Start 5-round Hard game');

  await page.locator('#startGameBtn').click();

  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#gameConfigText')).toHaveText('Hard · 5 rounds');
  await waitForFreshRoundOne(page, 'hard', 5);
  await expect(page.locator('#roundStat')).toHaveText('1 / 5');
  await expect(page.locator('#scoreStat')).toHaveText('0');
  await expect(page.locator('#streakStat')).toHaveText('0');
  await expect(page.locator('#hintBtn')).toBeEnabled();
  await expect(page.locator('#hintBtn')).toHaveText('Use hint — max 8,000');
  await expect(page.locator('#hudScore')).toHaveText('Up to 10,000');
  await expect(lockButton).toBeDisabled();
  await expect(nextButton).toBeHidden();
  await expect(page.locator('#hintBox')).not.toHaveClass(/show/);
  await expect(page.locator('#roundCapText')).toBeHidden();

  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return {
      phase: saved?.phase,
      difficulty: saved?.config?.difficulty,
      totalRounds: saved?.totalRounds,
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
  })).toEqual({
    phase: 'guessing',
    difficulty: 'hard',
    totalRounds: 5,
    round: 1,
    score: 0,
    resultCount: 0,
    guess: null,
    hintUsed: false,
    roundCap: 10000,
    hintsUsed: 0,
    originalMaximum: 50000,
    adjustedMaximum: 50000
  });
});
