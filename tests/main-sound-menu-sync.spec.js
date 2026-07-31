const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Sound synchronization test runs once on desktop Chromium');
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

test('main sound button keeps the game-menu sound control synchronized', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await startCleanGame(page);

  const sound = page.locator('#soundBtn');
  const menuSound = page.locator('#menuSoundBtn');

  await expect(sound).toHaveAttribute('aria-label', 'Sound on');
  await sound.click();

  await expect(sound).toHaveAttribute('aria-label', 'Sound off');
  await expect(sound).toHaveAttribute('title', 'Sound off');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeSound'))).toBe('off');

  await page.locator('#menuBtn').click();
  await expect(page.locator('#gameMenu')).toHaveClass(/show/);
  await expect(menuSound).toHaveText('Sound off');

  await menuSound.click();
  await expect(menuSound).toHaveText('Sound on');
  await expect(sound).toHaveAttribute('aria-label', 'Sound on');
  await expect(sound).toHaveAttribute('title', 'Sound on');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeSound'))).toBe('on');

  await page.locator('#resumeBtn').click();
  await expect(page.locator('#gameMenu')).not.toHaveClass(/show/);
  await expect(sound).toBeFocused();
});
