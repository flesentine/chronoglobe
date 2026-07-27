const { test, expect } = require('@playwright/test');

test('gameplay survives unavailable country boundary sources', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Map-aid network fallback runs once on desktop Chromium');

  await page.route('**/data/country-boundaries.geojson', route => route.abort());
  await page.route('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/**', route => route.abort());

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#startScreen')).toHaveClass(/show/);

  await expect.poll(async () => page.evaluate(() => window.ChronoMapAids?.getStatus().state)).toBe('unavailable');
  const status = await page.evaluate(() => window.ChronoMapAids.getStatus());
  expect(status.source).toBeNull();
  expect(status.error).toBeTruthy();

  await expect(page.locator('.imagery-badge')).toContainText('gameplay still works');
  await page.locator('#startGameBtn').click();
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await page.evaluate(() => window.placeGuess(10, 20));
  await expect(page.locator('#lockBtn')).toBeEnabled();
  await page.locator('#lockBtn').click();
  await expect(page.locator('#scoreDock')).toHaveClass(/show/);
});
