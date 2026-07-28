#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const checks = [];

function check(name, passed, detail = '') {
  checks.push({ name, passed: Boolean(passed), detail });
}

const pkg = JSON.parse(read('package.json'));
const persistence = read('persistence.js');
const index = read('index.html');
const readiness = read('tools/release-readiness.html');
const workflow = read('.github/workflows/browser-smoke-tests.yml');
const lockWorkflow = read('.github/workflows/generate-package-lock.yml');
const boundaryWorkflow = read('.github/workflows/vendor-country-boundaries.yml');

const appVersion = persistence.match(/APP_VERSION='([^']+)'/)?.[1];
const contentVersion = persistence.match(/CONTENT_VERSION='([^']+)'/)?.[1];
const playwrightVersion = pkg.devDependencies?.['@playwright/test'];
const exactVersion = value => typeof value === 'string' && /^\d+\.\d+\.\d+$/.test(value);

check('Package and runtime app versions match', appVersion === pkg.version, `${pkg.version} / ${appVersion || 'missing'}`);
check('Canonical content version is active', contentVersion === 'canonical-150-expert-v1', contentVersion || 'missing');
check('Node release line is pinned', pkg.engines?.node === '22.x', pkg.engines?.node || 'missing');
check('Playwright is pinned to an exact version', exactVersion(playwrightVersion), playwrightVersion || 'missing');
check('Canonical Expert content exists', exists('facts/expert-content.js'));
check('Deleted Expert override loader is absent', !exists('facts/expert-overrides.js'));
check('Canonical validation exists', exists('facts/canonical-validation.js'));
check('Release-readiness dashboard exists', exists('tools/release-readiness.html'));
check('Browser smoke workflow exists', exists('.github/workflows/browser-smoke-tests.yml'));
check('Country-boundary vendor workflow exists', exists('.github/workflows/vendor-country-boundaries.yml'));
check('Package-lock generation workflow exists', exists('.github/workflows/generate-package-lock.yml'));

const expectedOrder = [
  'facts/seeds-1.js',
  'facts/seeds-2.js',
  'facts/seeds-3.js',
  'facts/seeds-4.js',
  'facts/expert-content.js',
  'facts/canonical-events.js',
  'facts/canonical-validation.js',
  'facts/facts-final.js'
];
const positions = expectedOrder.map(file => index.indexOf(`src="${file}"`));
check('Production canonical scripts are present', positions.every(position => position >= 0));
check('Production canonical scripts are ordered correctly', positions.every((position, index) => index === 0 || position > positions[index - 1]));
check('Replayability loads exactly once', (index.match(/src="replayability\.js"/g) || []).length === 1);
check('Production page does not load deleted Expert overrides', !index.includes('expert-overrides.js'));
check('Readiness dashboard checks app version', readiness.includes(`APP_VERSION==='${pkg.version}'`), pkg.version);
check('Readiness dashboard checks content version', readiness.includes(`CONTENT_VERSION==='${contentVersion}'`), contentVersion || 'missing');
check('Default test command runs preflight first', pkg.scripts?.test === 'npm run preflight && playwright test');
check('Browser workflow uses Node 22', /node-version:\s*22\b/.test(workflow));
check('Browser workflow runs the package test command', /run:\s*npm test\b/.test(workflow));
check('Browser workflow uses npm ci when locked', /run:\s*npm ci\b/.test(workflow));
check('Browser workflow has an explicit no-lock fallback', workflow.includes('package-lock.json is missing'));
check('Lock workflow checks out main explicitly', /ref:\s*main\b/.test(lockWorkflow));
check('Lock workflow generates package-lock only', /npm install --package-lock-only\b/.test(lockWorkflow));
check('Lock workflow verifies the Playwright version', lockWorkflow.includes('node_modules/@playwright/test'));
check('Lock workflow detects an untracked first lockfile', /git status --porcelain -- package-lock\.json/.test(lockWorkflow));
check('Lock workflow pushes to main explicitly', /git push origin HEAD:main/.test(lockWorkflow));
check('Lock workflow does not use git diff for first-run detection', !/git diff --quiet -- package-lock\.json/.test(lockWorkflow));
check('Boundary workflow validates a FeatureCollection', boundaryWorkflow.includes("data.get('type') == 'FeatureCollection'"));
check('Boundary workflow validates at least 170 features', boundaryWorkflow.includes('len(features) >= 170'));
check('Boundary workflow detects an untracked first asset', /git status --porcelain -- data\/country-boundaries\.geojson/.test(boundaryWorkflow));
check('Boundary workflow pushes to main explicitly', /git push origin HEAD:main/.test(boundaryWorkflow));
check('Boundary workflow does not use git diff for first-run detection', !/git diff --quiet -- data\/country-boundaries\.geojson/.test(boundaryWorkflow));

if (exists('data/country-boundaries.geojson')) {
  const boundaryPath = path.join(root, 'data/country-boundaries.geojson');
  const boundaries = JSON.parse(fs.readFileSync(boundaryPath, 'utf8'));
  const features = Array.isArray(boundaries.features) ? boundaries.features : [];
  check('Vendored country boundaries are valid', boundaries.type === 'FeatureCollection' && features.length >= 170 && fs.statSync(boundaryPath).size > 100000, `${features.length} features, ${fs.statSync(boundaryPath).size} bytes`);
} else {
  check('Vendored country boundaries are valid', false, 'data/country-boundaries.geojson is missing');
}

if (exists('package-lock.json')) {
  const lock = JSON.parse(read('package-lock.json'));
  const lockedPlaywright = lock.packages?.['node_modules/@playwright/test']?.version;
  check('Package lock matches pinned Playwright', lockedPlaywright === playwrightVersion, `${playwrightVersion} / ${lockedPlaywright || 'missing'}`);
} else {
  console.warn('WARN: package-lock.json is not committed yet. Run the Generate package lock workflow before final release verification.');
}

const failures = checks.filter(item => !item.passed);
for (const item of checks) {
  const suffix = item.detail ? ` — ${item.detail}` : '';
  console.log(`${item.passed ? 'PASS' : 'FAIL'}: ${item.name}${suffix}`);
}
console.log(`\n${checks.length - failures.length}/${checks.length} release preflight checks passed.`);

if (failures.length) process.exitCode = 1;