const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Runtime contract checks run once on desktop Chromium');
}

async function openClean(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#startScreen')).toHaveClass(/show/);
}

test('pinned MapLibre assets load and expose the map constructor', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openClean(page);

  const dependency = await page.evaluate(() => ({
    hasMapConstructor: typeof window.maplibregl?.Map === 'function',
    scripts: [...document.scripts]
      .map(script => script.src)
      .filter(source => source.includes('unpkg.com/maplibre-gl@')),
    stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')]
      .map(link => link.href)
      .filter(source => source.includes('unpkg.com/maplibre-gl@'))
  }));

  expect(dependency.hasMapConstructor).toBe(true);
  expect(dependency.scripts).toEqual([
    'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js'
  ]);
  expect(dependency.stylesheets).toEqual([
    'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css'
  ]);
});

test('legacy content saves are rejected before application startup', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openClean(page);
  await page.locator('#startGameBtn').click();
  await expect(page.locator('#roundStat')).toContainText('1 / 5');
  await page.evaluate(() => window.placeGuess(12, 34));
  await expect(page.locator('#lockBtn')).toBeEnabled();

  await page.addInitScript(() => {
    const key = 'chronoglobeActiveGame';
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const saved = JSON.parse(raw);
    saved.contentVersion = 'legacy-150-v1';
    localStorage.setItem(key, JSON.stringify(saved));
  });

  await page.reload();
  await expect(page.locator('#resumeGameDialog')).not.toHaveClass(/show/);
  await expect(page.locator('#startScreen')).toHaveClass(/show/);
  expect(await page.evaluate(() => localStorage.getItem('chronoglobeActiveGame'))).toBeNull();
});

test('Daily Challenge deck remains deterministic after a clean reload', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openClean(page);
  await page.locator('#dailyChallengeBtn').click();
  const first = await page.evaluate(() => JSON.parse(localStorage.getItem('chronoglobeReplaySessionV1')).deck);

  await page.addInitScript(() => {
    localStorage.removeItem('chronoglobeActiveGame');
    localStorage.removeItem('chronoglobeReplaySessionV1');
  });

  await page.reload();
  await expect(page.locator('#startScreen')).toHaveClass(/show/);
  await page.locator('#dailyChallengeBtn').click();
  const second = await page.evaluate(() => JSON.parse(localStorage.getItem('chronoglobeReplaySessionV1')).deck);

  expect(second).toEqual(first);
  expect(new Set(first.map(item => item.eventId)).size).toBe(5);
  expect(first[0].difficulty).not.toBe('expert');
});
