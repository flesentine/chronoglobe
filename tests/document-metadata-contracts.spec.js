const { test, expect } = require('@playwright/test');

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Document contracts run once on desktop Chromium');
}

async function cleanStart(page) {
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
}

const metadata = [
  ['language', 'html', 'lang', 'en'],
  ['viewport', 'meta[name="viewport"]', 'content', 'width=device-width, initial-scale=1'],
  ['theme color', 'meta[name="theme-color"]', 'content', '#06111f'],
  ['description', 'meta[name="description"]', 'content', 'Explore the globe, follow historical clues, and score points based on how close your guess is.'],
  ['canonical URL', 'link[rel="canonical"]', 'href', 'https://flesentine.github.io/chronoglobe/'],
  ['Open Graph type', 'meta[property="og:type"]', 'content', 'website'],
  ['social preview alt text', 'meta[property="og:image:alt"]', 'content', 'ChronoGlobe history guessing game preview'],
  ['Twitter card', 'meta[name="twitter:card"]', 'content', 'summary_large_image'],
];

for (const [name, selector, attribute, value] of metadata) {
  test(`document exposes ${name}`, async ({ page }, testInfo) => {
    desktopOnly(testInfo);
    await page.goto('/');
    await expect(page.locator(selector)).toHaveAttribute(attribute, value);
  });
}

test('page title describes the game', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await page.goto('/');
  await expect(page).toHaveTitle('ChronoGlobe — Guess Where History Happened');
});

test('start screen is initially active', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await cleanStart(page);
  await expect(page.locator('#startScreen')).toHaveClass(/show/);
});

test('game shell starts aria-hidden', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await cleanStart(page);
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'true');
});

test('Easy is the default difficulty', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await cleanStart(page);
  await expect(page.locator('input[name="difficultyChoice"][value="easy"]')).toBeChecked();
});

test('five rounds is the default length', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await cleanStart(page);
  await expect(page.locator('input[name="roundChoice"][value="5"]')).toBeChecked();
});

test('setup errors use an alert region', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await cleanStart(page);
  await expect(page.locator('#setupError')).toHaveAttribute('role', 'alert');
  await expect(page.locator('#setupError')).toBeEmpty();
});

test('default start action states its configuration', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await cleanStart(page);
  await expect(page.locator('#startGameBtn')).toHaveText('Start a quick Easy game');
});
