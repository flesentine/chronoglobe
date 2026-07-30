const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Accessibility contracts run once on desktop Chromium');
}

const controlContracts = [
  ['sound control name', '#soundBtn', 'aria-label', 'Sound on'],
  ['menu dialog affordance', '#menuBtn', 'aria-haspopup', 'dialog'],
  ['globe stage label', '#globeStage', 'aria-label', 'Interactive globe'],
  ['zoom group label', '.zoom-controls', 'aria-label', 'Globe zoom controls'],
  ['zoom in name', '#zoomInBtn', 'aria-label', 'Zoom in'],
  ['zoom out name', '#zoomOutBtn', 'aria-label', 'Zoom out'],
];

for (const [name, selector, attribute, value] of controlContracts) {
  test(name, async ({ page }, testInfo) => {
    desktopOnly(testInfo);
    await page.goto('/');
    await expect(page.locator(selector)).toHaveAttribute(attribute, value);
  });
}

test('lock action starts disabled', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await page.goto('/');
  await expect(page.locator('#lockBtn')).toBeDisabled();
});

test('next action starts hidden', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await page.goto('/');
  await expect(page.locator('#nextBtn')).toHaveAttribute('hidden', '');
});

test('game announcement is an atomic polite status region', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await page.goto('/');
  const region = page.locator('#gameAnnouncement');
  await expect(region).toHaveAttribute('role', 'status');
  await expect(region).toHaveAttribute('aria-live', 'polite');
  await expect(region).toHaveAttribute('aria-atomic', 'true');
});

const dialogs = [
  ['resume dialog', '#resumeGameDialog', 'resumeGameTitle'],
  ['game menu', '#gameMenu', 'menuTitle'],
  ['new game confirmation', '#confirmNewGame', 'confirmTitle'],
  ['hint confirmation', '#confirmHint', 'confirmHintTitle'],
  ['tutorial', '#tutorial', 'tutorialTitle'],
  ['end screen', '#endScreen', 'endTitle'],
];

for (const [name, selector, labelId] of dialogs) {
  test(`${name} is modal and labelled`, async ({ page }, testInfo) => {
    desktopOnly(testInfo);
    await page.goto('/');
    const dialog = page.locator(selector);
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-labelledby', labelId);
    await expect(page.locator(`#${labelId}`)).toHaveCount(1);
  });
}
