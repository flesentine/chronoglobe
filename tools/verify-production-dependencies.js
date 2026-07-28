#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const externalReferences = [
  ...index.matchAll(/<script\s+[^>]*src=["']((?:https?:)?\/\/[^"']+)["'][^>]*><\/script>/gi),
  ...index.matchAll(/<link\s+[^>]*href=["']((?:https?:)?\/\/[^"']+)["'][^>]*>/gi)
].map(match => match[1]);

const failures = [];
const fail = message => failures.push(message);

if (externalReferences.length === 0) {
  fail('No external production dependencies were discovered; update this verifier if index.html intentionally becomes fully local.');
}

for (const reference of externalReferences) {
  if (reference.startsWith('//')) fail(`Protocol-relative production URL is not allowed: ${reference}`);
  if (!reference.startsWith('https://')) fail(`External production URL must use HTTPS: ${reference}`);
  if (/(?:^|[\/@_-])(?:latest|next|beta|canary)(?:[\/@_.-]|$)/i.test(reference)) {
    fail(`Floating release label is not allowed: ${reference}`);
  }
}

const unpkgReferences = externalReferences.filter(reference => reference.startsWith('https://unpkg.com/'));
const parsedUnpkg = unpkgReferences.map(reference => {
  const match = reference.match(/^https:\/\/unpkg\.com\/((?:@[^/]+\/)?[^@/]+)@(\d+\.\d+\.\d+)\/(.+)$/);
  if (!match) {
    fail(`unpkg dependency must include an exact semantic version: ${reference}`);
    return null;
  }
  return { packageName: match[1], version: match[2], assetPath: match[3], reference };
}).filter(Boolean);

const versionsByPackage = new Map();
for (const dependency of parsedUnpkg) {
  const versions = versionsByPackage.get(dependency.packageName) || new Set();
  versions.add(dependency.version);
  versionsByPackage.set(dependency.packageName, versions);
}

for (const [packageName, versions] of versionsByPackage) {
  if (versions.size !== 1) fail(`${packageName} production assets use mismatched versions: ${[...versions].join(', ')}`);
}

const mapLibre = parsedUnpkg.filter(item => item.packageName === 'maplibre-gl');
if (mapLibre.length !== 2) {
  fail(`Expected exactly two MapLibre production assets; found ${mapLibre.length}.`);
} else {
  const paths = new Set(mapLibre.map(item => item.assetPath));
  const expected = new Set(['dist/maplibre-gl.css', 'dist/maplibre-gl.js']);
  if (paths.size !== expected.size || [...expected].some(asset => !paths.has(asset))) {
    fail(`MapLibre production assets are incomplete: ${[...paths].join(', ')}`);
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exitCode = 1;
} else {
  const summary = parsedUnpkg.map(item => `${item.packageName}@${item.version} (${item.assetPath})`).join(', ');
  console.log(`PASS: ${externalReferences.length} external production references are HTTPS and exactly versioned.`);
  console.log(`PASS: ${summary}`);
}
