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

test('loads the complete canonical dataset exactly once', async ({ page }) => {
  await openClean(page);
  const runtime = await page.evaluate(() => ({
    source: window.CHRONO_RUNTIME_SOURCE,
    facts: window.CHRONO_FACTS?.length,
    events: window.CHRONO_CANONICAL_EVENTS?.length,
    reviewedExperts: window.CHRONO_CANONICAL_EVENTS?.filter(event => event.variants.expert.reviewed).length,
    expertContent: Object.keys(window.CHRONO_EXPERT_CONTENT || {}).length,
    replayScripts: [...document.scripts].filter(script => script.src.endsWith('/replayability.js')).length,
    legacyExpertScripts: [...document.scripts].filter(script => script.src.endsWith('/expert-overrides.js')).length
  }));

  expect(runtime).toEqual({
    source: 'canonical',
    facts: 600,
    events: 150,
    reviewedExperts: 150,
    expertContent: 150,
    replayScripts: 1,
    legacyExpertScripts: 0
  });
});

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

test('final results are captured before persistence is cleared', async ({ page }) => {
  await openClean(page);
  await startStandardGame(page);
  await page.evaluate(() => {
    window.__finishedPayload = null;
    window.addEventListener('chronoglobe:finished', event => { window.__finishedPayload = event.detail; }, { once: true });
  });

  for (let round = 1; round <= 5; round++) {
    await placeGuess(page, round, round);
    await page.locator('#lockBtn').click();
    await expect(page.locator('#scoreDock')).toHaveClass(/show/);
    await page.locator('#nextBtn').click();
    if (round < 5) await expect(page.locator('#roundStat')).toContainText(`${round + 1} / 5`);
  }

  await expect(page.locator('#endScreen')).toHaveClass(/show/);
  await expect(page.locator('#shareResultsBtn')).toBeVisible();
  const captured = await page.evaluate(() => ({
    payload: window.__finishedPayload,
    activeSave: localStorage.getItem('chronoglobeActiveGame')
  }));
  expect(captured.activeSave).toBeNull();
  expect(captured.payload.deck).toHaveLength(5);
  expect(captured.payload.roundResults).toHaveLength(5);
  expect(captured.payload.originalMaximum).toBe(50000);
});