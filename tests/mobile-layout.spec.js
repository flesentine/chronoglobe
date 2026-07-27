const { test, expect } = require('@playwright/test');

async function cleanStart(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#startScreen')).toHaveClass(/show/);
}

async function expectInsideViewport(locator, page) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box, 'element should have a layout box').not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
}

test('start controls remain reachable', async ({ page }) => {
  await cleanStart(page);
  await expect(page.locator('#startGameBtn')).toBeVisible();
  await expectInsideViewport(page.locator('#startGameBtn'), page);
  await expectInsideViewport(page.locator('#dailyChallengeBtn'), page);
});

test('guess controls remain reachable during a round', async ({ page }) => {
  await cleanStart(page);
  await page.locator('#startGameBtn').click();
  await page.evaluate(() => window.placeGuess(12, 12));
  await expect(page.locator('#lockBtn')).toBeVisible();
  await expectInsideViewport(page.locator('#lockBtn'), page);
});

test('result and Next remain reachable without page overflow', async ({ page }) => {
  await cleanStart(page);
  await page.locator('#startGameBtn').click();
  await page.evaluate(() => window.placeGuess(12, 12));
  await page.locator('#lockBtn').click();

  await expect(page.locator('#scoreDock')).toHaveClass(/show/);
  await expect(page.locator('#nextBtn')).toBeVisible();
  await expectInsideViewport(page.locator('#nextBtn'), page);

  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - window.innerWidth,
    y: document.documentElement.scrollHeight - window.innerHeight
  }));
  expect(overflow.x).toBeLessThanOrEqual(1);
  expect(overflow.y).toBeLessThanOrEqual(1);
});

test('result essentials are visible in short landscape', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'short-landscape', 'Short-landscape-specific assertion');
  await cleanStart(page);
  await page.locator('#startGameBtn').click();
  await page.evaluate(() => window.placeGuess(12, 12));
  await page.locator('#lockBtn').click();

  await expect(page.locator('#hudLocation')).toBeVisible();
  await expect(page.locator('#hudDistance')).toBeVisible();
  await expect(page.locator('#hudScore')).toBeVisible();
  await expect(page.locator('#nextBtn')).toBeVisible();
  await expectInsideViewport(page.locator('#nextBtn'), page);
});
