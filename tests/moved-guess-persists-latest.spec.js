const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Moved-guess persistence test runs once on desktop Chromium');
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

test('moving a guess persists only the latest location across reload and resume', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await startCleanGame(page);

  const canvas = page.locator('#globe canvas').first();
  await expect(canvas).toBeVisible();

  await canvas.click({ position: { x: 180, y: 180 } });
  await expect(page.locator('#lockBtn')).toBeEnabled();

  const firstGuess = await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return saved?.guess || null;
  })).not.toBeNull();

  const firstSavedGuess = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return saved.guess;
  });

  await canvas.click({ position: { x: 420, y: 260 } });
  await expect(page.locator('#guessToast')).toContainText('Guess moved');

  const secondSavedGuess = await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return saved?.guess || null;
  })).not.toEqual(firstSavedGuess);

  const latestGuess = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return saved.guess;
  });
  const latestStatus = await page.locator('#statusText').textContent();

  expect(latestGuess).not.toEqual(firstSavedGuess);

  await page.reload();
  await expect(page.locator('#resumeGameDialog')).toHaveClass(/show/);
  await page.locator('#resumeSavedBtn').click();

  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#lockBtn')).toBeEnabled();
  await expect(page.locator('#statusText')).toHaveText(latestStatus);

  const restoredGuess = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return saved.guess;
  });

  expect(restoredGuess).toEqual(latestGuess);
  expect(restoredGuess).not.toEqual(firstSavedGuess);
});
