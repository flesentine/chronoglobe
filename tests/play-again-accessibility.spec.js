const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Play-again accessibility contract runs once on desktop Chromium');
}

async function openFinishedGame(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#startScreen')).toHaveClass(/show/);

  await page.locator('#startGameBtn').click();
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#factText')).not.toHaveText('Choose a game to begin.');

  await page.evaluate(() => {
    document.querySelector('#endScreen')?.classList.add('show');
  });

  await expect(page.locator('#endScreen')).toHaveClass(/show/);
  await expect(page.locator('#endTitle')).toBeFocused();
  await expect(page.locator('#gameApp')).toHaveAttribute('inert', '');
}

test('Play again restores a clean accessible start screen', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openFinishedGame(page);

  await page.locator('#playAgainBtn').click();

  await expect(page.locator('#endScreen')).not.toHaveClass(/show/);
  await expect(page.locator('#startScreen')).toHaveClass(/show/);
  await expect(page.locator('#startScreen')).not.toHaveAttribute('inert', '');
  await expect(page.locator('#startScreen')).not.toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#gameApp')).not.toHaveAttribute('inert', '');
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#startGameBtn')).toBeFocused();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeActiveGame'))).toBeNull();
});
