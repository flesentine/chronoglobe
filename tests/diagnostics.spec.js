const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Diagnostic dashboards run once on desktop Chromium');
}

async function openDiagnostic(page, path) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(path);
  return errors;
}

test('Expert review dashboard reports all 150 events reviewed', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  const errors = await openDiagnostic(page, '/tools/expert-review.html');
  await expect(page.locator('#summary')).toContainText('100%');
  expect(await page.evaluate(() => window.CHRONO_EXPERT_REVIEW)).toEqual({ total: 150, reviewed: 150, pending: 0, percent: 100 });
  expect(await page.locator('script[src$="expert-overrides.js"]').count()).toBe(0);
  expect(await page.locator('script[src$="expert-content.js"]').count()).toBe(1);
  expect(errors).toEqual([]);
});

test('canonical validation dashboard passes production release gate', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  const errors = await openDiagnostic(page, '/tools/canonical-parity.html');
  await expect(page.locator('#gate')).toContainText('PASS');
  const result = await page.evaluate(() => ({ source: window.CHRONO_RUNTIME_SOURCE, runtimeFacts: window.CHRONO_FACTS?.length, report: window.CHRONO_CANONICAL_REPORT }));
  expect(result.source).toBe('canonical');
  expect(result.runtimeFacts).toBe(600);
  expect(result.report.ok).toBe(true);
  expect(result.report.summary.events).toBe(150);
  expect(result.report.summary.variants).toBe(600);
  expect(result.report.summary.errors).toBe(0);
  expect(result.report.summary.parityMismatches).toBe(0);
  expect(errors).toEqual([]);
});

test('facts inventory reflects the canonical editorial model', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  const errors = await openDiagnostic(page, '/tools/facts-inventory.html');
  const report = await page.evaluate(() => window.CHRONO_INVENTORY_REPORT);
  expect(report.runtimeSource).toBe('canonical');
  expect(report.eventCount).toBe(150);
  expect(report.factCount).toBe(600);
  expect(report.expertContentCount).toBe(150);
  expect(report.reviewedExperts).toBe(150);
  expect(report.reusedHardClues).toBe(0);
  expect(report.blankExpertHints).toBe(0);
  expect(report.passed).toBe(report.total);
  await expect(page.locator('#checks')).not.toContainText('FAIL');
  expect(errors).toEqual([]);
});

test('persistence diagnostic uses the canonical save marker', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  const errors = await openDiagnostic(page, '/tools/persistence-test.html');
  const report = await page.evaluate(() => window.CHRONO_PERSISTENCE_REPORT);
  expect(report.runtimeSource).toBe('canonical');
  expect(report.contentVersion).toBe('canonical-150-expert-v1');
  expect(report.failed).toBe(0);
  expect(report.passed).toBe(report.total);
  expect(errors).toEqual([]);
});

test('replayability diagnostic seeds Daily from the canonical content version', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  const errors = await openDiagnostic(page, '/tools/replayability-test.html');
  const report = await page.evaluate(() => window.CHRONO_REPLAYABILITY_REPORT);
  expect(report.contentVersion).toBe('canonical-150-expert-v1');
  expect(report.seed).toContain('canonical-150-expert-v1');
  expect(report.failed).toBe(0);
  expect(report.passed).toBe(report.total);
  expect(errors).toEqual([]);
});
