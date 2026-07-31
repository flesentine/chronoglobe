const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Discard-save sound test runs once on desktop Chromium');
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

test('discarding a saved game preserves the sound preference', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await startCleanGame(page);

  await page.locator('#soundBtn').click();
  await expect(page.locator('#soundBtn')).toHaveAttribute('aria-label', 'Sound off');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeSound'))).toBe('off');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeActiveGame'))).not.toBeNull();

  await page.reload();

  const resumeDialog = page.locator('#resumeGameDialog');
  await expect(resumeDialog).toHaveClass(/show/);
  await expect(page.locator('#discardSavedBtn')).toBeFocused();

  await page.locator('#discardSavedBtn').click();

  await expect(resumeDialog).not.toHaveClass(/show/);
  await expect(page.locator('#startScreen')).toHaveClass(/show/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeActiveGame'))).toBeNull();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeSound'))).toBe('off');

  await page.locator('#startGameBtn').click();

  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#soundBtn')).toHaveAttribute('aria-label', 'Sound off');
  await page.locator('#menuBtn').click();
  await expect(page.locator('#menuSoundBtn')).toHaveText('Sound off');
});
