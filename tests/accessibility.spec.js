const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Accessibility focus contract runs once on desktop Chromium');
}

async function openClean(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#startScreen')).toHaveClass(/show/);
  await expect(page.locator('script[src="accessibility-runtime.js"]')).toHaveCount(1);
}

async function startReadyGame(page) {
  await page.locator('#startGameBtn').click();
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#roundStat')).toContainText('1 / 5');
  await expect(page.locator('#factText')).not.toHaveText('Choose a game to begin.');
}

test('document and primary controls expose accessible names', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openClean(page);

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('main#gameApp')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Start a quick Easy game' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'How to play' }).first()).toBeVisible();

  const unnamedControls = await page.evaluate(() => [...document.querySelectorAll('button, input, select, textarea, a[href]')]
    .filter(element => {
      const hidden = element.hidden || element.closest('[hidden]');
      if (hidden) return false;
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const nativeLabel = [...(element.labels || [])]
        .map(label => label.textContent?.trim())
        .filter(Boolean)
        .join(' ');
      const label = element.getAttribute('aria-label')
        || element.getAttribute('aria-labelledby')
        || element.getAttribute('title')
        || nativeLabel
        || element.textContent?.trim()
        || element.getAttribute('value');
      return !label;
    })
    .map(element => element.id || element.outerHTML.slice(0, 120)));

  expect(unnamedControls).toEqual([]);
});

test('dialogs trap focus and return it to their opener', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openClean(page);

  await page.locator('#startHowToBtn').click();
  const tutorial = page.getByRole('dialog', { name: /How to play/ });
  await expect(tutorial).toBeVisible();
  await expect(tutorial).toHaveAttribute('aria-modal', 'true');
  expect(await page.evaluate(() => document.querySelector('#tutorial')?.contains(document.activeElement))).toBe(true);

  await page.locator('#tutorialGotIt').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#tutorialClose')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#tutorialGotIt')).toBeFocused();

  await page.locator('#tutorialGotIt').click();
  await expect(page.locator('#startHowToBtn')).toBeFocused();

  await startReadyGame(page);
  await page.locator('#menuBtn').click();
  const menu = page.getByRole('dialog', { name: 'Game menu' });
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute('aria-modal', 'true');
  expect(await page.evaluate(() => document.querySelector('#gameMenu')?.contains(document.activeElement))).toBe(true);

  await page.locator('#newGameBtn').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#menuClose')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#newGameBtn')).toBeFocused();

  await page.locator('#resumeBtn').click();
  await expect(page.locator('#menuBtn')).toBeFocused();
});

test('keyboard focus remains visible through guess and result flow', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openClean(page);
  await startReadyGame(page);

  await page.evaluate(() => window.placeGuess(12, 12));
  await expect(page.locator('#lockBtn')).toBeEnabled();
  await page.locator('#lockBtn').focus();
  await expect(page.locator('#lockBtn')).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.locator('#scoreDock')).toHaveClass(/show/);
  await expect(page.locator('#resultHeading')).toBeFocused();
  await expect(page.locator('#nextBtn')).toBeVisible();

  await page.locator('#nextBtn').focus();
  await expect(page.locator('#nextBtn')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#roundStat')).toContainText('2 / 5');
});
