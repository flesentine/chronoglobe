const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Sound preference new-game test runs once on desktop Chromium');
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

test('sound preference survives returning to setup and starting a new game', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await startCleanGame(page);

  const sound = page.locator('#soundBtn');
  const menu = page.locator('#gameMenu');

  await sound.click();
  await expect(sound).toHaveAttribute('aria-label', 'Sound off');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeSound'))).toBe('off');

  await page.locator('#menuBtn').click();
  await expect(menu).toHaveClass(/show/);
  await expect(page.locator('#menuSoundBtn')).toHaveText('Sound off');

  await page.locator('#newGameBtn').click();
  await expect(menu).not.toHaveClass(/show/);
  await expect(page.locator('#startScreen')).toHaveClass(/show/);
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'true');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeSound'))).toBe('off');

  await page.locator('#startGameBtn').click();
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(sound).toHaveAttribute('aria-label', 'Sound off');
  await expect(sound).toHaveAttribute('title', 'Sound off');

  await page.locator('#menuBtn').click();
  await expect(page.locator('#menuSoundBtn')).toHaveText('Sound off');
});
