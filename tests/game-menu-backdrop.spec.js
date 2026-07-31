const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Game menu backdrop test runs once on desktop Chromium');
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
  await expect(page.locator('#menuBtn')).toBeVisible();
}

test('clicking the game menu backdrop keeps the modal open and the round isolated', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await startCleanGame(page);

  await page.locator('#menuBtn').click();

  const menu = page.locator('#gameMenu');
  const game = page.locator('#gameApp');
  const resume = page.locator('#resumeBtn');

  await expect(menu).toHaveClass(/show/);
  await expect(game).toHaveAttribute('aria-hidden', 'true');
  await expect(game).toHaveAttribute('inert', '');
  await expect(resume).toBeFocused();

  await menu.click({ position: { x: 5, y: 5 } });

  await expect(menu).toHaveClass(/show/);
  await expect(game).toHaveAttribute('aria-hidden', 'true');
  await expect(game).toHaveAttribute('inert', '');

  await page.keyboard.press('Tab');
  await expect.poll(() => page.evaluate(() => {
    const dialog = document.getElementById('gameMenu');
    return Boolean(dialog && dialog.contains(document.activeElement));
  })).toBe(true);

  await page.keyboard.press('Escape');

  await expect(menu).not.toHaveClass(/show/);
  await expect(game).toHaveAttribute('aria-hidden', 'false');
  await expect(game).not.toHaveAttribute('inert', '');
  await expect(page.locator('#menuBtn')).toBeFocused();
  await expect(page.locator('#startScreen')).not.toHaveClass(/show/);
});
