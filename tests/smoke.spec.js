const { test, expect } = require('@playwright/test');

async function openClean(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#startScreen')).toHaveClass(/show/);
}

async function startStandardGame(page) {
  await page.locator('#startGameBtn').click();
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#roundStat')).toContainText('1 / 5');
  await expect(page.locator('#factText')).not.toHaveText('Choose a game to begin.');
}

async function placeGuess(page, lat = 0, lng = 0) {
  await page.evaluate(({ lat, lng }) => window.placeGuess(lat, lng), { lat, lng });
  await expect(page.locator('#lockBtn')).toBeEnabled();
}

test('starts a standard game, scores a guess, and advances', async ({ page }) => {
  await openClean(page);
  await startStandardGame(page);
  await placeGuess(page, 10, 20);
  await page.locator('#lockBtn').click();

  await expect(page.locator('#scoreDock')).toHaveClass(/show/);
  await expect(page.locator('#hudLocation')).not.toHaveText('—');
  await expect(page.locator('#hudScore')).toContainText('/');
  await expect(page.locator('#nextBtn')).toBeVisible();

  await page.locator('#nextBtn').click();
  await expect(page.locator('#roundStat')).toContainText('2 / 5');
  await expect(page.locator('#lockBtn')).toBeDisabled();
});

test('hint confirmation applies the 8,000 point cap', async ({ page }) => {
  await openClean(page);
  await startStandardGame(page);
  await page.locator('#hintBtn').click();
  await expect(page.locator('#confirmHint')).toHaveClass(/show/);
  await page.locator('#confirmHintBtn').click();
  await expect(page.locator('#roundCapText')).toBeVisible();
  await expect(page.locator('#hintBtn')).toContainText('8,000');
});

test('unfinished game can be resumed after reload', async ({ page }) => {
  await openClean(page);
  await startStandardGame(page);
  await placeGuess(page, 33, -117);
  await page.reload();

  await expect(page.locator('#resumeGameDialog')).toHaveClass(/show/);
  await expect(page.locator('#resumeGameSummary')).toContainText('round 1 of 5');
  await page.locator('#resumeSavedBtn').click();
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#lockBtn')).toBeEnabled();
});

test('Daily Challenge starts as a five-round mixed game', async ({ page }) => {
  await openClean(page);
  const daily = page.locator('#dailyChallengeBtn');
  await expect(daily).toBeVisible();
  await daily.click();
  await expect(page.locator('#gameConfigText')).toContainText('Daily Challenge');
  await expect(page.locator('#roundStat')).toContainText('1 / 5');
});

test('menu pauses and resumes the current game', async ({ page }) => {
  await openClean(page);
  await startStandardGame(page);
  await page.locator('#menuBtn').click();
  await expect(page.locator('#gameMenu')).toHaveClass(/show/);
  await page.locator('#resumeBtn').click();
  await expect(page.locator('#gameMenu')).not.toHaveClass(/show/);
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
});
