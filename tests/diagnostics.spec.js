const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Diagnostic dashboards run once on desktop Chromium');
}

test('Expert review dashboard reports all 150 events reviewed', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/tools/expert-review.html');
  await expect(page.locator('#summary')).toContainText('150');
  await expect(page.locator('#summary')).toContainText('0');
  await expect(page.locator('#summary')).toContainText('100%');

  const review = await page.evaluate(() => window.CHRONO_EXPERT_REVIEW);
  expect(review).toEqual({ total: 150, reviewed: 150, pending: 0, percent: 100 });
  expect(pageErrors).toEqual([]);
  expect(await page.locator('script[src$="expert-overrides.js"]').count()).toBe(0);
  expect(await page.locator('script[src$="expert-content.js"]').count()).toBe(1);
});

test('canonical validation dashboard passes production release gate', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/tools/canonical-parity.html');
  await expect(page.locator('#gate')).toContainText('PASS');

  const result = await page.evaluate(() => ({
    source: window.CHRONO_RUNTIME_SOURCE,
    runtimeFacts: window.CHRONO_FACTS?.length,
    report: window.CHRONO_CANONICAL_REPORT
  }));

  expect(result.source).toBe('canonical');
  expect(result.runtimeFacts).toBe(600);
  expect(result.report.ok).toBe(true);
  expect(result.report.summary.events).toBe(150);
  expect(result.report.summary.variants).toBe(600);
  expect(result.report.summary.errors).toBe(0);
  expect(result.report.summary.parityMismatches).toBe(0);
  expect(pageErrors).toEqual([]);
});
