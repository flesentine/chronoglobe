const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Placed-guess resume test runs once on desktop Chromium');
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

test('an in-progress placed guess survives reload and resume', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await startCleanGame(page);

  const canvas = page.locator('#globe canvas').first();
  await expect(canvas).toBeVisible();
  await canvas.click({ position: { x: 240, y: 220 } });
  await expect(page.locator('#lockBtn')).toBeEnabled();

  const beforeReload = await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return saved?.guess || null;
  })).not.toBeNull();

  const savedGuess = await page.evaluate(() => JSON.parse(localStorage.getItem('chronoglobeActiveGame')).guess);
  const statusBeforeReload = await page.locator('#statusText').textContent();

  await page.reload();

  const resumeDialog = page.locator('#resumeGameDialog');
  await expect(resumeDialog).toHaveClass(/show/);
  await page.locator('#resumeSavedBtn').click();

  await expect(resumeDialog).not.toHaveClass(/show/);
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#lockBtn')).toBeEnabled();
  await expect(page.locator('#statusText')).toHaveText(statusBeforeReload);

  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    return saved?.guess || null;
  })).toEqual(savedGuess);

  await expect(page.locator('#globe canvas').first()).toBeVisible();
});
