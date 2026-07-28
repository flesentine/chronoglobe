#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dashboardPath = path.join(root, 'tools/release-readiness.html');

if (!fs.existsSync(dashboardPath)) {
  throw new Error('Release-readiness dashboard is missing');
}

const dashboard = fs.readFileSync(dashboardPath, 'utf8');

function requireMatch(name, pattern) {
  if (!pattern.test(dashboard)) throw new Error(`${name} is missing from the release-readiness dashboard`);
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
requireMatch(
  'Bundled boundary release check',
  /add\(\s*['"]Bundled country boundaries['"],\s*boundaries\?\.type\s*===\s*['"]FeatureCollection['"]\s*&&\s*boundaryFeatures\.length\s*>=\s*170,[\s\S]*?\)/
);

const boundaryCheck = dashboard.match(
  /add\(\s*['"]Bundled country boundaries['"],\s*boundaries\?\.type\s*===\s*['"]FeatureCollection['"]\s*&&\s*boundaryFeatures\.length\s*>=\s*170,[\s\S]*?\);/
)?.[0];

if (!boundaryCheck) throw new Error('Unable to inspect the bundled-boundary readiness check');
if (/['"]warning['"]/.test(boundaryCheck)) {
  throw new Error('Bundled country boundaries must be a blocker, not a warning');
}

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

console.log('PASS: Release-readiness keeps bundled country boundaries as a blocking gate.');
