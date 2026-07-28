#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dashboardPath = path.join(root, 'tools/release-readiness.html');
const packagePath = path.join(root, 'package.json');

if (!fs.existsSync(dashboardPath)) {
  throw new Error('Release-readiness dashboard is missing');
}
if (!fs.existsSync(packagePath)) {
  throw new Error('package.json is missing');
}

const dashboard = fs.readFileSync(dashboardPath, 'utf8');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const expectedAppVersion = pkg.version;
const expectedPlaywrightVersion = pkg.devDependencies?.['@playwright/test'];

function requireMatch(name, pattern) {
  if (!pattern.test(dashboard)) throw new Error(`${name} is missing from the release-readiness dashboard`);
}

function requireBlockingCheck(name, pattern) {
  const check = dashboard.match(pattern)?.[0];
  if (!check) throw new Error(`Unable to inspect the ${name} readiness check`);
  if (/['"]warning['"]/.test(check)) {
    throw new Error(`${name} must be a blocker, not a warning`);
  }
}

requireMatch(
  'Bundled boundary fetch',
  /fetch\(['"]\.\.\/data\/country-boundaries\.geojson['"],\s*\{\s*cache:\s*['"]no-store['"]\s*\}\)/
);
requireMatch(
  'Boundary JSON parsing',
  /if\s*\(response\.ok\)\s*boundaries\s*=\s*await\s+response\.json\(\)/
);
requireMatch(
  'FeatureCollection validation',
  /boundaries\?\.type\s*===\s*['"]FeatureCollection['"]/
);
requireMatch(
  'Minimum boundary feature count',
  /boundaryFeatures\.length\s*>=\s*170/
);
requireBlockingCheck(
  'Bundled country boundaries',
  /add\(\s*['"]Bundled country boundaries['"],\s*boundaries\?\.type\s*===\s*['"]FeatureCollection['"]\s*&&\s*boundaryFeatures\.length\s*>=\s*170,[\s\S]*?\);/
);

requireMatch(
  'Dependency lock fetch',
  /fetch\(['"]\.\.\/package-lock\.json['"],\s*\{\s*cache:\s*['"]no-store['"]\s*\}\)/
);
requireMatch(
  'Dependency lock JSON parsing',
  /if\s*\(response\.ok\)\s*lock\s*=\s*await\s+response\.json\(\)/
);
requireMatch(
  'Current lockfile format requirement',
  /lock\?\.lockfileVersion\s*===\s*3/
);
requireMatch(
  'Root package lock lookup',
  /const\s+rootLock\s*=\s*lock\?\.packages\?\.\[['"]['"]\]/
);
requireMatch(
  'Locked Playwright lookup',
  /lock\?\.packages\?\.\[['"]node_modules\/@playwright\/test['"]\]\?\.version/
);
requireMatch(
  'App version lock alignment',
  new RegExp(`lock\\?\\.version\\s*===\\s*['"]${expectedAppVersion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\s*&&\\s*rootLock\\?\\.version\\s*===\\s*['"]${expectedAppVersion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`)
);
requireMatch(
  'Playwright lock alignment',
  new RegExp(`rootLock\\?\\.devDependencies\\?\\.\\[['"]@playwright/test['"]\\]\\s*===\\s*['"]${expectedPlaywrightVersion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\s*&&\\s*lockedPlaywright\\s*===\\s*['"]${expectedPlaywrightVersion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`)
);

requireBlockingCheck(
  'Dependency lock committed',
  /add\(\s*['"]Dependency lock committed['"],[\s\S]*?\);/
);
requireBlockingCheck(
  'Dependency lock format',
  /add\(\s*['"]Dependency lock format['"],[\s\S]*?\);/
);
requireBlockingCheck(
  'Dependency lock matches app',
  /add\(\s*['"]Dependency lock matches app['"],[\s\S]*?\);/
);
requireBlockingCheck(
  'Playwright release dependency',
  /add\(\s*['"]Playwright release dependency['"],[\s\S]*?\);/
);

requireMatch(
  'Default blocker severity',
  /const\s+add\s*=\s*\([^)]*severity\s*=\s*['"]blocker['"][^)]*\)\s*=>/
);
requireMatch(
  'Blocker aggregation',
  /checks\.filter\(check\s*=>\s*check\.severity\s*===\s*['"]blocker['"]\s*&&\s*!check\.ok\)\.length/
);
requireMatch(
  'Blocked release decision',
  /const\s+ready\s*=\s*blockers\s*===\s*0/
);
requireMatch(
  'Public readiness result',
  /window\.CHRONO_RELEASE_READINESS\s*=\s*Object\.freeze\(\{ready,blockers,warnings,checks:/
);

console.log(`PASS: Release-readiness keeps boundaries and the ${expectedAppVersion} dependency lock as blocking gates.`);
