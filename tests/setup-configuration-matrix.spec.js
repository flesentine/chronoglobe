const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Setup configuration matrix runs once on desktop Chromium');
}

async function openCleanStart(page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await expect(page.locator('#startScreen')).toHaveClass(/show/);
}

const difficultyCases = [
  {
    value: 'easy',
    label: 'Easy',
    description: 'Borders, labels, and more direct clues. Recommended for your first game.',
  },
  {
    value: 'medium',
    label: 'Medium',
    description: 'Country borders remain visible, with standard clue detail.',
  },
  {
    value: 'hard',
    label: 'Hard',
    description: 'No political overlays, with more indirect location guidance.',
  },
  {
    value: 'expert',
    label: 'Expert',
    description: 'No borders or labels. Category and era are hidden, with minimal clues.',
  },
  {
    value: 'mixed',
    label: 'Mixed',
    description: 'A balanced mix of all four levels, including Expert, with no repeated event.',
  },
];

for (const difficulty of difficultyCases) {
  test(`selecting ${difficulty.label} updates its setup description`, async ({ page }, testInfo) => {
    desktopOnly(testInfo);
    await openCleanStart(page);

    const choice = page.locator(`input[name="difficultyChoice"][value="${difficulty.value}"]`);
    await choice.check();

    await expect(choice).toBeChecked();
    await expect(page.locator('#difficultyDescription')).toHaveText(difficulty.description);
  });
}

const roundCases = [
  { value: '5', label: '5' },
  { value: '10', label: '10' },
  { value: '15', label: '15' },
];

for (const difficulty of difficultyCases) {
  for (const rounds of roundCases) {
    test(`${difficulty.label} with ${rounds.label} rounds produces the correct start action`, async ({ page }, testInfo) => {
      desktopOnly(testInfo);
      await openCleanStart(page);

      const difficultyChoice = page.locator(`input[name="difficultyChoice"][value="${difficulty.value}"]`);
      const roundChoice = page.locator(`input[name="roundChoice"][value="${rounds.value}"]`);
      await difficultyChoice.check();
      await roundChoice.check();

      await expect(difficultyChoice).toBeChecked();
      await expect(roundChoice).toBeChecked();

      const expected = difficulty.value === 'easy' && rounds.value === '5'
        ? 'Start a quick Easy game'
        : `Start ${rounds.label}-round ${difficulty.label} game`;
      await expect(page.locator('#startGameBtn')).toHaveText(expected);
    });
  }
}
