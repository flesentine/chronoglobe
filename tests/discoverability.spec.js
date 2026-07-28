const { test, expect } = require('@playwright/test');

const PRODUCTION_URL = 'https://flesentine.github.io/chronoglobe/';
const SITEMAP_URL = `${PRODUCTION_URL}sitemap.xml`;

test('robots and sitemap expose only the canonical production URL', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Discoverability verification runs once on desktop Chromium');

  const robotsResponse = await request.get('/robots.txt');
  expect(robotsResponse.ok()).toBe(true);
  expect(robotsResponse.headers()['content-type']).toContain('text/plain');
  const robots = await robotsResponse.text();
  const robotsLines = robots
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  expect(robotsLines).toEqual([
    'User-agent: *',
    'Allow: /',
    `Sitemap: ${SITEMAP_URL}`
  ]);
  expect(robots).not.toMatch(/^\s*Disallow\s*:/im);

  const sitemapResponse = await request.get('/sitemap.xml');
  expect(sitemapResponse.ok()).toBe(true);
  expect(sitemapResponse.headers()['content-type']).toMatch(/(?:application|text)\/xml/);
  const sitemap = await sitemapResponse.text();

  expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  expect(locations).toEqual([PRODUCTION_URL]);
  expect(sitemap).not.toContain('localhost');
  expect(sitemap).not.toContain('127.0.0.1');
});
