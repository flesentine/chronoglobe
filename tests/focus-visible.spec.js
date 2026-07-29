const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Focus indicator contract runs once on desktop Chromium');
}

async function openClean(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#startScreen')).toHaveClass(/show/);
}

async function focusStyle(locator) {
  return locator.evaluate(element => {
    element.focus();
    const style = getComputedStyle(element);
    return {
      focusVisible: element.matches(':focus-visible'),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      boxShadow: style.boxShadow
    };
  });
}

test('buttons expose a strong visible keyboard focus indicator', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openClean(page);

  const style = await focusStyle(page.locator('#startGameBtn'));
  expect(style.focusVisible).toBe(true);
  expect(style.outlineStyle).not.toBe('none');
  expect(Number.parseFloat(style.outlineWidth)).toBeGreaterThanOrEqual(3);
  expect(style.outlineColor).toBe('rgb(255, 209, 102)');
  expect(style.boxShadow).not.toBe('none');
});

test('custom radio choices expose focus on their visible label surface', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openClean(page);

  const easyChoice = page.locator('input[name="difficultyChoice"][value="easy"]');
  await page.keyboard.press('Tab');
  await expect(easyChoice).toBeFocused();

  const result = await easyChoice.evaluate(input => {
    const visibleSurface = input.nextElementSibling;
    const style = getComputedStyle(visibleSurface);
    return {
      inputFocusVisible: input.matches(':focus-visible'),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      boxShadow: style.boxShadow
    };
  });

  expect(result.inputFocusVisible).toBe(true);
  expect(result.outlineStyle).not.toBe('none');
  expect(Number.parseFloat(result.outlineWidth)).toBeGreaterThanOrEqual(3);
  expect(result.outlineColor).toBe('rgb(255, 209, 102)');
  expect(result.boxShadow).not.toBe('none');
});