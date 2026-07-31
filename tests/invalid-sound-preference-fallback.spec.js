const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Invalid sound preference test runs once on desktop Chromium');
}

test('invalid stored sound preference falls back safely to sound on', async ({ page }, testInfo) => {
  desktopOnly(testInfo);

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('chronoglobeSound', 'corrupt-value');
  });
  await page.reload();

  await page.locator('#startGameBtn').click();

  const sound = page.locator('#soundBtn');
  const menuSound = page.locator('#menuSoundBtn');

  await expect(sound).toHaveAttribute('aria-label', 'Sound on');
  await expect(sound).toHaveAttribute('title', 'Sound on');

  await page.locator('#menuBtn').click();
  await expect(page.locator('#gameMenu')).toHaveClass(/show/);
  await expect(menuSound).toHaveText('Sound on');

  await menuSound.click();

  await expect(menuSound).toHaveText('Sound off');
  await expect(sound).toHaveAttribute('aria-label', 'Sound off');
  await expect(sound).toHaveAttribute('title', 'Sound off');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeSound'))).toBe('off');
});
