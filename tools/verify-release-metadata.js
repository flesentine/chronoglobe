#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const previewPath = path.join(root, 'assets/chronoglobe-social-preview.svg');
const robotsPath = path.join(root, 'robots.txt');
const sitemapPath = path.join(root, 'sitemap.xml');
const expectedUrl = 'https://flesentine.github.io/chronoglobe/';
const expectedImage = `${expectedUrl}assets/chronoglobe-social-preview.svg`;
const expectedSitemap = `${expectedUrl}sitemap.xml`;
const expectedTitle = 'ChronoGlobe — Guess Where History Happened';
const expectedDescription = 'Explore the globe, follow historical clues, and score points based on how close your guess is.';

function count(pattern) {
  return (index.match(pattern) || []).length;
}

function requireExact(name, pattern, expectedCount = 1) {
  const actual = count(pattern);
  if (actual !== expectedCount) throw new Error(`${name}: expected ${expectedCount}, found ${actual}`);
}

requireExact('canonical URL', new RegExp(`<link\\s+rel=["']canonical["']\\s+href=["']${expectedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']\\s*\\/?\\s*>`, 'i'));
requireExact('Open Graph URL', new RegExp(`<meta\\s+property=["']og:url["']\\s+content=["']${expectedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']\\s*\\/?\\s*>`, 'i'));
requireExact('Open Graph image', new RegExp(`<meta\\s+property=["']og:image["']\\s+content=["']${expectedImage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']\\s*\\/?\\s*>`, 'i'));
requireExact('Twitter image', new RegExp(`<meta\\s+name=["']twitter:image["']\\s+content=["']${expectedImage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']\\s*\\/?\\s*>`, 'i'));
requireExact('Twitter card', /<meta\s+name=["']twitter:card["']\s+content=["']summary_large_image["']\s*\/?\s*>/i);
requireExact('Open Graph image width', /<meta\s+property=["']og:image:width["']\s+content=["']1200["']\s*\/?\s*>/i);
requireExact('Open Graph image height', /<meta\s+property=["']og:image:height["']\s+content=["']630["']\s*\/?\s*>/i);
requireExact('document title', new RegExp(`<title>${expectedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</title>`, 'i'));
requireExact('description', new RegExp(`<meta\\s+name=["']description["']\\s+content=["']${expectedDescription.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']\\s*\\/?\\s*>`, 'i'));
requireExact('Open Graph title', new RegExp(`<meta\\s+property=["']og:title["']\\s+content=["']${expectedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']\\s*\\/?\\s*>`, 'i'));
requireExact('Twitter title', new RegExp(`<meta\\s+name=["']twitter:title["']\\s+content=["']${expectedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']\\s*\\/?\\s*>`, 'i'));
requireExact('Open Graph description', new RegExp(`<meta\\s+property=["']og:description["']\\s+content=["']${expectedDescription.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']\\s*\\/?\\s*>`, 'i'));
requireExact('Twitter description', new RegExp(`<meta\\s+name=["']twitter:description["']\\s+content=["']${expectedDescription.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']\\s*\\/?\\s*>`, 'i'));
requireExact('Open Graph image alt text', /<meta\s+property=["']og:image:alt["']\s+content=["'][^"']+["']\s*\/?\s*>/i);

if (!fs.existsSync(previewPath)) throw new Error('Social preview asset is missing');
const preview = fs.readFileSync(previewPath, 'utf8');
if (!/<svg\b[^>]*\bwidth=["']1200["'][^>]*\bheight=["']630["'][^>]*\bviewBox=["']0 0 1200 630["']/i.test(preview)) {
  throw new Error('Social preview must be a 1200×630 SVG with a matching viewBox');
}
if (!preview.includes('ChronoGlobe')) throw new Error('Social preview must contain the ChronoGlobe brand name');

if (!fs.existsSync(robotsPath)) throw new Error('robots.txt is missing');
const robots = fs.readFileSync(robotsPath, 'utf8').trim();
if (!/^User-agent:\s*\*$/m.test(robots)) throw new Error('robots.txt must define the wildcard user agent');
if (!/^Allow:\s*\/$/m.test(robots)) throw new Error('robots.txt must allow the production site');
if (!new RegExp(`^Sitemap:\\s*${expectedSitemap.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm').test(robots)) {
  throw new Error('robots.txt must reference the canonical sitemap URL');
}
if (/^Disallow:\s*\/$/m.test(robots)) throw new Error('robots.txt must not block the production site');

if (!fs.existsSync(sitemapPath)) throw new Error('sitemap.xml is missing');
const sitemap = fs.readFileSync(sitemapPath, 'utf8').trim();
if (!/^<\?xml version="1\.0" encoding="UTF-8"\?>/.test(sitemap)) throw new Error('sitemap.xml must declare UTF-8 XML');
if (!/<urlset\s+xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/.test(sitemap)) throw new Error('sitemap.xml must use the sitemap protocol namespace');
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
if (locations.length !== 1 || locations[0] !== expectedUrl) throw new Error('sitemap.xml must contain exactly the canonical production URL');

console.log('PASS: Release metadata, social preview, robots.txt, and sitemap.xml are aligned.');
