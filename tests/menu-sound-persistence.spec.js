const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Menu sound persistence test runs once on desktop Chromium');
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

test('sound preference changed in the game menu survives reload and resume', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await startCleanGame(page);

  await page.locator('#menuBtn').click();
  await expect(page.locator('#gameMenu')).toHaveClass(/show/);

  await page.locator('#menuSoundBtn').click();

  await expect(page.locator('#menuSoundBtn')).toHaveText('Sound off');
  await expect(page.locator('#soundBtn')).toHaveAttribute('aria-label', 'Sound off');
  await expect(page.locator('#soundBtn')).toHaveAttribute('title', 'Sound off');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeSound'))).toBe('off');

  await page.locator('#resumeBtn').click();
  await expect(page.locator('#gameMenu')).not.toHaveClass(/show/);
  await expect(page.locator('#menuBtn')).toBeFocused();

  await page.reload();

  await expect(page.locator('#resumeGameDialog')).toHaveClass(/show/);
  await expect(page.locator('#soundBtn')).toHaveAttribute('aria-label', 'Sound off');
  await expect(page.locator('#soundBtn')).toHaveAttribute('title', 'Sound off');

  await page.locator('#resumeSavedBtn').click();
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#menuBtn')).toBeFocused();

  await page.locator('#menuBtn').click();
  await expect(page.locator('#menuSoundBtn')).toHaveText('Sound off');
  await expect(page.locator('#soundBtn')).toHaveAttribute('aria-label', 'Sound off');
});
