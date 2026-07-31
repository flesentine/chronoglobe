const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Hint confirmation backdrop test runs once on desktop Chromium');
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

test('clicking outside the hint confirmation keeps it open and the round isolated', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await startCleanGame(page);

  const game = page.locator('#gameApp');
  const dialog = page.locator('#confirmHint');
  const cancel = page.locator('#cancelHintBtn');
  const hint = page.locator('#hintBtn');

  await hint.click();

  await expect(dialog).toHaveClass(/show/);
  await expect(game).toHaveAttribute('aria-hidden', 'true');
  await expect(game).toHaveAttribute('inert', '');
  await expect(cancel).toBeFocused();

  await dialog.click({ position: { x: 5, y: 5 } });

  await expect(dialog).toHaveClass(/show/);
  await expect(game).toHaveAttribute('aria-hidden', 'true');
  await expect(game).toHaveAttribute('inert', '');

  await page.keyboard.press('Tab');
  await expect(dialog.locator(':focus')).toHaveCount(1);

  await cancel.click();

  await expect(dialog).not.toHaveClass(/show/);
  await expect(game).toHaveAttribute('aria-hidden', 'false');
  await expect(game).not.toHaveAttribute('inert', '');
  await expect(hint).toBeFocused();
  await expect(page.locator('#hintBox')).not.toHaveClass(/show/);
  await expect(page.locator('#roundCapText')).toBeHidden();
  await expect(hint).toBeEnabled();
  await expect(hint).toHaveText('Use hint — max 8,000');
});
