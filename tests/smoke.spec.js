const { test, expect } = require('@playwright/test');

async function openClean(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#startScreen')).toHaveClass(/show/);
}

async function startStandardGame(page) {
  await page.locator('#startGameBtn').click();
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#roundStat')).toContainText('1 / 5');
  await expect(page.locator('#factText')).not.toHaveText('Choose a game to begin.');
}

async function placeGuess(page, lat = 0, lng = 0) {
  await page.evaluate(({ lat, lng }) => window.placeGuess(lat, lng), { lat, lng });
  await expect(page.locator('#lockBtn')).toBeEnabled();
}

async function finishFiveRoundGame(page) {
  for (let round = 1; round <= 5; round++) {
    await placeGuess(page, round, round);
    await page.locator('#lockBtn').click();
    await expect(page.locator('#scoreDock')).toHaveClass(/show/);
    await page.locator('#nextBtn').click();
    if (round < 5) await expect(page.locator('#roundStat')).toContainText(`${round + 1} / 5`);
  }
  await expect(page.locator('#endScreen')).toHaveClass(/show/);
}

function desktopOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Replayability regression runs once on desktop Chromium');
}

test('loads the complete canonical dataset exactly once', async ({ page }) => {
  await openClean(page);
  const runtime = await page.evaluate(() => ({
    source: window.CHRONO_RUNTIME_SOURCE,
    facts: window.CHRONO_FACTS?.length,
    events: window.CHRONO_CANONICAL_EVENTS?.length,
    reviewedExperts: window.CHRONO_CANONICAL_EVENTS?.filter(event => event.variants.expert.reviewed).length,
    expertContent: Object.keys(window.CHRONO_EXPERT_CONTENT || {}).length,
    contentVersion: window.ChronoPersistence?.CONTENT_VERSION,
    replayScripts: [...document.scripts].filter(script => script.src.endsWith('/replayability.js')).length,
    legacyExpertScripts: [...document.scripts].filter(script => script.src.endsWith('/expert-overrides.js')).length
  }));

  expect(runtime).toEqual({
    source: 'canonical',
    facts: 600,
    events: 150,
    reviewedExperts: 150,
    expertContent: 150,
    contentVersion: 'canonical-150-expert-v1',
    replayScripts: 1,
    legacyExpertScripts: 0
  });
});

test('loads the pinned MapLibre runtime and matching stylesheet', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openClean(page);
  const dependency = await page.evaluate(() => ({
    runtimeVersion: window.maplibregl?.version,
    scripts: [...document.scripts]
      .map(script => script.src)
      .filter(source => source.includes('unpkg.com/maplibre-gl@')),
    stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')]
      .map(link => link.href)
      .filter(source => source.includes('unpkg.com/maplibre-gl@'))
  }));

  expect(dependency.runtimeVersion).toBe('5.24.0');
  expect(dependency.scripts).toEqual([
    'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js'
  ]);
  expect(dependency.stylesheets).toEqual([
    'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css'
  ]);
});

test('browser exposes the canonical release metadata and valid share preview', async ({ page, request }, testInfo) => {
  desktopOnly(testInfo);
  await openClean(page);

  const metadata = await page.evaluate(() => {
    const content = selector => document.querySelector(selector)?.getAttribute('content');
    return {
      title: document.title,
      description: content('meta[name="description"]'),
      canonical: document.querySelector('link[rel="canonical"]')?.href,
      ogType: content('meta[property="og:type"]'),
      ogUrl: content('meta[property="og:url"]'),
      ogTitle: content('meta[property="og:title"]'),
      ogDescription: content('meta[property="og:description"]'),
      ogImage: content('meta[property="og:image"]'),
      ogWidth: content('meta[property="og:image:width"]'),
      ogHeight: content('meta[property="og:image:height"]'),
      ogAlt: content('meta[property="og:image:alt"]'),
      twitterCard: content('meta[name="twitter:card"]'),
      twitterTitle: content('meta[name="twitter:title"]'),
      twitterDescription: content('meta[name="twitter:description"]'),
      twitterImage: content('meta[name="twitter:image"]')
    };
  });

  const productionUrl = 'https://flesentine.github.io/chronoglobe/';
  const previewUrl = `${productionUrl}assets/chronoglobe-social-preview.svg`;
  const title = 'ChronoGlobe — Guess Where History Happened';
  const description = 'Explore the globe, follow historical clues, and score points based on how close your guess is.';

  expect(metadata).toEqual({
    title,
    description,
    canonical: productionUrl,
    ogType: 'website',
    ogUrl: productionUrl,
    ogTitle: title,
    ogDescription: description,
    ogImage: previewUrl,
    ogWidth: '1200',
    ogHeight: '630',
    ogAlt: 'ChronoGlobe history guessing game preview',
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: previewUrl
  });

  const preview = await request.get('/assets/chronoglobe-social-preview.svg');
  expect(preview.ok()).toBe(true);
  expect(preview.headers()['content-type']).toContain('image/svg+xml');
  const svg = await preview.text();
  expect(svg).toContain('width="1200"');
  expect(svg).toContain('height="630"');
  expect(svg).toContain('viewBox="0 0 1200 630"');
  expect(svg).toContain('ChronoGlobe');
});

test('production startup has no same-origin asset failures or page errors', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  const pageErrors = [];
  const failedRequests = [];
  const badResponses = [];

  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => {
    const url = new URL(request.url());
    if (url.origin === 'http://127.0.0.1:4173') {
      failedRequests.push(`${request.method()} ${url.pathname}: ${request.failure()?.errorText || 'failed'}`);
    }
  });
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin === 'http://127.0.0.1:4173' && response.status() >= 400) {
      badResponses.push(`${response.status()} ${url.pathname}`);
    }
  });

  await openClean(page);
  await page.waitForLoadState('networkidle');

  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(badResponses).toEqual([]);
});

test('starts a standard game, scores a guess, and advances', async ({ page }) => {
  await openClean(page);
  await startStandardGame(page);
  await placeGuess(page, 10, 20);
  await page.locator('#lockBtn').click();

  await expect(page.locator('#scoreDock')).toHaveClass(/show/);
  await expect(page.locator('#hudLocation')).not.toHaveText('—');
  await expect(page.locator('#hudScore')).toContainText('/');
  await expect(page.locator('#nextBtn')).toBeVisible();

  await page.locator('#nextBtn').click();
  await expect(page.locator('#roundStat')).toContainText('2 / 5');
  await expect(page.locator('#lockBtn')).toBeDisabled();
});

test('hint confirmation applies the 8,000 point cap', async ({ page }) => {
  await openClean(page);
  await startStandardGame(page);
  await page.locator('#hintBtn').click();
  await expect(page.locator('#confirmHint')).toHaveClass(/show/);
  await page.locator('#confirmHintBtn').click();
  await expect(page.locator('#roundCapText')).toBeVisible();
  await expect(page.locator('#hintBtn')).toContainText('8,000');
});

test('unfinished game can be resumed after reload', async ({ page }) => {
  await openClean(page);
  await startStandardGame(page);
  await placeGuess(page, 33, -117);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('chronoglobeActiveGame')));
  expect(saved.contentVersion).toBe('canonical-150-expert-v1');
  expect(saved.appVersion).toBe('1.9.0');

  await page.reload();
  await expect(page.locator('#resumeGameDialog')).toHaveClass(/show/);
  await expect(page.locator('#resumeGameSummary')).toContainText('round 1 of 5');
  await page.locator('#resumeSavedBtn').click();
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#lockBtn')).toBeEnabled();
});

test('legacy content saves are rejected and cleared', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openClean(page);
  await startStandardGame(page);
  await placeGuess(page, 12, 34);
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chronoglobeActiveGame'));
    saved.contentVersion = 'legacy-150-v1';
    localStorage.setItem('chronoglobeActiveGame', JSON.stringify(saved));
  });
  await page.reload();
  await expect(page.locator('#resumeGameDialog')).not.toHaveClass(/show/);
  await expect(page.locator('#startScreen')).toHaveClass(/show/);
  expect(await page.evaluate(() => localStorage.getItem('chronoglobeActiveGame'))).toBeNull();
});

test('Daily Challenge starts as a five-round mixed game', async ({ page }) => {
  await openClean(page);
  const daily = page.locator('#dailyChallengeBtn');
  await expect(daily).toBeVisible();
  await daily.click();
  await expect(page.locator('#gameConfigText')).toContainText('Daily Challenge');
  await expect(page.locator('#roundStat')).toContainText('1 / 5');
});

test('Daily Challenge deck is deterministic for the UTC date', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openClean(page);
  await page.locator('#dailyChallengeBtn').click();
  const first = await page.evaluate(() => JSON.parse(localStorage.getItem('chronoglobeReplaySessionV1')).deck);

  await page.evaluate(() => {
    localStorage.removeItem('chronoglobeActiveGame');
    localStorage.removeItem('chronoglobeReplaySessionV1');
  });
  await page.reload();
  await expect(page.locator('#startScreen')).toHaveClass(/show/);
  await page.locator('#dailyChallengeBtn').click();
  const second = await page.evaluate(() => JSON.parse(localStorage.getItem('chronoglobeReplaySessionV1')).deck);

  expect(second).toEqual(first);
  expect(new Set(first.map(item => item.eventId)).size).toBe(5);
  expect(first[0].difficulty).not.toBe('expert');
});

test('completed Daily Challenge becomes Practice on the next attempt', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openClean(page);
  await page.locator('#dailyChallengeBtn').click();
  await expect(page.locator('#gameConfigText')).toContainText('Official');
  await finishFiveRoundGame(page);
  await expect(page.locator('#endSubtitle')).toContainText('Official attempt');

  const completion = await page.evaluate(() => {
    const date = new Date().toISOString().slice(0, 10);
    return localStorage.getItem(`chronoglobeDailyCompleteV1:${date}`);
  });
  expect(completion).toBe('1');

  await page.locator('#playAgainBtn').click();
  await page.locator('#dailyChallengeBtn').click();
  await expect(page.locator('#gameConfigText')).toContainText('Practice');
});

test('standard rounds avoid the 30 most recently completed events', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openClean(page);
  const recent = Array.from({ length: 30 }, (_, index) => `chrono-event-${String(index + 1).padStart(3, '0')}`);
  await page.evaluate(ids => localStorage.setItem('chronoglobeRecentEventsV1', JSON.stringify(ids)), recent);
  await startStandardGame(page);
  const deckIds = await page.evaluate(() => JSON.parse(localStorage.getItem('chronoglobeActiveGame')).deck.map(item => item.eventId));
  expect(deckIds.some(id => recent.includes(id))).toBe(false);
});

test('menu pauses and resumes the current game', async ({ page }) => {
  await openClean(page);
  await startStandardGame(page);
  await page.locator('#menuBtn').click();
  await expect(page.locator('#gameMenu')).toHaveClass(/show/);
  await page.locator('#resumeBtn').click();
  await expect(page.locator('#gameMenu')).not.toHaveClass(/show/);
  await expect(page.locator('#gameApp')).toHaveAttribute('aria-hidden', 'false');
});

test('final results are captured before persistence is cleared', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openClean(page);
  await startStandardGame(page);
  await page.evaluate(() => {
    window.__finishedPayload = null;
    window.addEventListener('chronoglobe:finished', event => { window.__finishedPayload = event.detail; }, { once: true });
  });

  await finishFiveRoundGame(page);
  await expect(page.locator('#shareResultsBtn')).toBeVisible();
  const captured = await page.evaluate(() => ({
    payload: window.__finishedPayload,
    activeSave: localStorage.getItem('chronoglobeActiveGame')
  }));
  expect(captured.activeSave).toBeNull();
  expect(captured.payload.deck).toHaveLength(5);
  expect(captured.payload.roundResults).toHaveLength(5);
  expect(captured.payload.originalMaximum).toBe(50000);
});

test('keyboard completion captures final results before persistence is cleared', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await openClean(page);
  await startStandardGame(page);
  await page.evaluate(() => {
    window.__finishedPayload = null;
    window.addEventListener('chronoglobe:finished', event => { window.__finishedPayload = event.detail; }, { once: true });
  });

  for (let round = 1; round <= 5; round++) {
    await placeGuess(page, round, -round);
    await page.locator('#lockBtn').click();
    await expect(page.locator('#scoreDock')).toHaveClass(/show/);
    if (round < 5) {
      await page.locator('#nextBtn').click();
      await expect(page.locator('#roundStat')).toContainText(`${round + 1} / 5`);
    } else {
      await page.keyboard.press('ArrowRight');
    }
  }

  await expect(page.locator('#endScreen')).toHaveClass(/show/);
  const captured = await page.evaluate(() => ({
    payload: window.__finishedPayload,
    activeSave: localStorage.getItem('chronoglobeActiveGame')
  }));
  expect(captured.activeSave).toBeNull();
  expect(captured.payload.deck).toHaveLength(5);
  expect(captured.payload.roundResults).toHaveLength(5);
  expect(captured.payload.originalMaximum).toBe(50000);
});