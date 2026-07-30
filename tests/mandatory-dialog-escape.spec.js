const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Mandatory dialog Escape contract runs once on desktop Chromium');
}

async function openClean(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#startScreen')).toHaveClass(/show/);
}

async function startReadyGame(page) {
  await page.locator('#startGameBtn').click();
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#roundStat')).toContainText('1 / 5');
  await expect(page.locator('#factText')).not.toHaveText('Choose a game to begin.');
  await expect(page.locator('#menuBtn')).toBeFocused();
}

async function createSavedGame(page) {
  await openClean(page);
  await startReadyGame(page);

  await page.evaluate(() => window.placeGuess(12, 12));
  await expect(page.locator('#lockBtn')).toBeEnabled();
  await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('chronoglobeActiveGame')))).toBe(true);
}

test('Escape cannot expose the background behind the mandatory resume dialog', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await createSavedGame(page);

  await page.reload();
  const resumeDialog = page.locator('#resumeGameDialog');
  await expect(resumeDialog).toHaveClass(/show/);
  await expect(page.locator('#resumeSavedBtn')).toBeFocused();
  await expect(page.locator('#startScreen')).toHaveAttribute('inert', '');
  await expect(page.locator('#gameApp')).toHaveAttribute('inert', '');

  await page.keyboard.press('Escape');

  await expect(resumeDialog).toHaveClass(/show/);
  await expect(page.locator('#resumeSavedBtn')).toBeFocused();
  await expect(page.locator('#startScreen')).toHaveAttribute('inert', '');
  await expect(page.locator('#startScreen')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#gameApp')).toHaveAttribute('inert', '');
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'true');

  await page.evaluate(() => document.querySelector('#startGameBtn')?.focus());
  expect(await page.evaluate(() => document.querySelector('#resumeGameDialog')?.contains(document.activeElement))).toBe(true);
});

test('Escape cannot expose the game behind the final score dialog', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openClean(page);
  await startReadyGame(page);

  await page.evaluate(() => document.querySelector('#endScreen')?.classList.add('show'));
  const finalDialog = page.locator('#endScreen');
  await expect(finalDialog).toHaveClass(/show/);
  await expect(finalDialog).toHaveAttribute('aria-modal', 'true');
  await expect(page.locator('#endTitle')).toBeFocused();
  await expect(page.locator('#gameApp')).toHaveAttribute('inert', '');
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'true');

  await page.keyboard.press('Escape');

  await expect(finalDialog).toHaveClass(/show/);
  await expect(page.locator('#endTitle')).toBeFocused();
  await expect(page.locator('#gameApp')).toHaveAttribute('inert', '');
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'true');

  await page.evaluate(() => document.querySelector('#menuBtn')?.focus());
  expect(await page.evaluate(() => document.querySelector('#endScreen')?.contains(document.activeElement))).toBe(true);
});
