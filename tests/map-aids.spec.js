const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Map-aid source checks run once on desktop Chromium');
}

test('country boundaries load from the vendored local asset', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  let remoteRequests = 0;
  page.on('request', request => {
    if (request.url().startsWith('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/')) remoteRequests++;
  });

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect.poll(async () => page.evaluate(() => window.ChronoMapAids?.getStatus().state)).toBe('ready');
  const status = await page.evaluate(() => window.ChronoMapAids.getStatus());
  expect(status.source).toBe('local');
  expect(status.error).toBeNull();
  expect(remoteRequests).toBe(0);
});

test('gameplay survives unavailable country boundary sources', async ({ page }, testInfo) => {
  desktopOnly(testInfo);

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