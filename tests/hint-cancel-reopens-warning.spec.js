const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Hint warning acknowledgement test runs once on desktop Chromium');
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

test('canceling the hint warning does not acknowledge it', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await startCleanGame(page);

  const hintButton = page.locator('#hintBtn');
  const dialog = page.locator('#confirmHint');
  const cancelButton = page.locator('#cancelHintBtn');

  await hintButton.click();
  await expect(dialog).toHaveClass(/show/);
  await expect(cancelButton).toBeFocused();

  await cancelButton.click();

  await expect(dialog).not.toHaveClass(/show/);
  await expect(hintButton).toBeFocused();
  await expect(page.locator('#hintBox')).not.toHaveClass(/show/);
  await expect(page.locator('#roundCapText')).toBeHidden();
  await expect(page.locator('#hudScore')).toHaveText('Up to 10,000');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chronoglobeHintCostSeen'))).toBeNull();

  await hintButton.click();

  await expect(dialog).toHaveClass(/show/);
  await expect(cancelButton).toBeFocused();
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#gameApp')).toHaveAttribute('inert', '');
});
