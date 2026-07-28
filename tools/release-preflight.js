#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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
const playwrightConfig = read('playwright.config.js');
const discoveryVerifier = read('tools/verify-test-discovery.js');
const allWorkflows = [workflow, lockWorkflow, boundaryWorkflow];

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
check('Test-discovery verifier exists', exists('tools/verify-test-discovery.js'));
check('Package lock is committed', exists('package-lock.json'));

const localScriptSources = [...index.matchAll(/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi)]
  .map(match => match[1])
  .filter(source => !/^(?:https?:)?\/\//i.test(source));
const localStyleSources = [...index.matchAll(/<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)]
  .map(match => match[1])
  .filter(source => !/^(?:https?:)?\/\//i.test(source));
const missingScripts = localScriptSources.filter(source => !exists(source));
const missingStyles = localStyleSources.filter(source => !exists(source));
check('Every production script reference resolves locally', missingScripts.length === 0, missingScripts.join(', '));
check('Every production stylesheet reference resolves locally', missingStyles.length === 0, missingStyles.join(', '));
check('Production script references are unique', new Set(localScriptSources).size === localScriptSources.length, `${localScriptSources.length} references`);

const syntaxTargets = [...new Set([
  ...localScriptSources,
  'playwright.config.js',
  'tools/release-preflight.js',
  'tools/verify-test-discovery.js',
  ...fs.readdirSync(path.join(root, 'tests')).filter(file => file.endsWith('.js')).map(file => `tests/${file}`)
])].filter(exists);
const syntaxFailures = [];
for (const file of syntaxTargets) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
  if (result.status !== 0) syntaxFailures.push(`${file}: ${(result.stderr || result.stdout || 'syntax check failed').trim().split('\n')[0]}`);
}
check('Production and test JavaScript parses cleanly', syntaxFailures.length === 0, syntaxFailures.join(' | '));

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
check('Default test command combines preflight and browser tests', pkg.scripts?.test === 'npm run preflight && npm run test:browser');
check('Browser-only test command is available', pkg.scripts?.['test:browser'] === 'playwright test');
check('Playwright forbids focused tests in CI', /forbidOnly:\s*Boolean\(process\.env\.CI\)/.test(playwrightConfig));
check('Playwright stores output in test-results', /outputDir:\s*['"]test-results['"]/.test(playwrightConfig));
check('Playwright retains trace, screenshot, and video on failure', playwrightConfig.includes("trace: 'retain-on-failure'") && playwrightConfig.includes("screenshot: 'only-on-failure'") && playwrightConfig.includes("video: 'retain-on-failure'"));
check('Playwright emits GitHub annotations', playwrightConfig.includes("['github']"));
check('Playwright emits an HTML report', playwrightConfig.includes("['html', { open: 'never' }]"));
check('Playwright emits machine-readable JSON results', playwrightConfig.includes("['json', { outputFile: 'test-results/results.json' }]"));
check('Discovery verifier parses Playwright totals', discoveryVerifier.includes('/Total:\\s+(\\d+)\\s+tests?\\s+in\\s+(\\d+)\\s+files?/gi'));
check('Discovery verifier enforces a minimum test count', discoveryVerifier.includes("MIN_DISCOVERED_TESTS || '10'"));
check('Discovery verifier enforces a minimum file count', discoveryVerifier.includes("MIN_DISCOVERED_FILES || '4'"));

const actionUses = allWorkflows.flatMap(text => [...text.matchAll(/^\s*uses:\s*([^\s#]+)(?:\s+#\s*(.+))?$/gm)].map(match => ({ reference: match[1], comment: match[2] || '' })));
const unpinnedActions = actionUses.filter(item => !/@[0-9a-f]{40}$/i.test(item.reference));
const uncommentedActions = actionUses.filter(item => !/^v\d+(?:\.\d+){0,2}$/.test(item.comment.trim()));
check('All GitHub Actions use immutable commit SHAs', unpinnedActions.length === 0, unpinnedActions.map(item => item.reference).join(', '));
check('Pinned GitHub Actions retain readable version comments', uncommentedActions.length === 0, uncommentedActions.map(item => item.reference).join(', '));
check('Checkout is pinned to reviewed v4.3.1 commit', allWorkflows.every(text => !text.includes('actions/checkout@') || text.includes('actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4.3.1')));
check('Setup Node is pinned to reviewed v4.4.0 commit', [workflow, lockWorkflow].every(text => text.includes('actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0')));
check('Artifact upload is pinned to reviewed v4.6.2 commit', workflow.includes('actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2'));

check('Browser workflow uses Node 22', /node-version:\s*22\b/.test(workflow));
check('Browser workflow always uses npm ci', /run:\s*npm ci --no-audit --no-fund\b/.test(workflow));
check('Browser workflow enables npm cache', /cache:\s*npm\b/.test(workflow));
check('Browser workflow has no unlocked install fallback', !workflow.includes('package-lock.json is missing') && !/npm install --no-audit/.test(workflow));
check('Browser workflow runs release preflight explicitly', workflow.includes('npm run preflight 2>&1 | tee test-results/preflight.log'));
check('Browser workflow discovers tests before browser installation', workflow.includes('npx playwright test --list 2>&1 | tee test-results/discovery.log'));
check('Browser workflow verifies discovered coverage', workflow.includes('node tools/verify-test-discovery.js test-results/discovery.log'));
check('Browser workflow runs browser-only tests', workflow.includes('npm run test:browser 2>&1 | tee test-results/browser.log'));
check('Browser workflow preserves piped command failures', (workflow.match(/set -o pipefail/g) || []).length >= 3);
check('Browser workflow writes a run summary', workflow.includes('$GITHUB_STEP_SUMMARY') && workflow.includes('steps.preflight.outcome') && workflow.includes('steps.discovery.outcome') && workflow.includes('steps.discovery_count.outputs.summary') && workflow.includes('steps.browser.outcome'));
check('Browser workflow uploads release evidence on every outcome', /name:\s*Upload release verification evidence[\s\S]*if:\s*always\(\)[\s\S]*test-results\/[\s\S]*playwright-report\//.test(workflow));
check('Release evidence is retained for 14 days', /retention-days:\s*14\b/.test(workflow));
const workflowPreflightPosition = workflow.indexOf('npm run preflight 2>&1 | tee test-results/preflight.log');
const workflowDiscoveryPosition = workflow.indexOf('npx playwright test --list 2>&1 | tee test-results/discovery.log');
const workflowDiscoveryVerificationPosition = workflow.indexOf('node tools/verify-test-discovery.js test-results/discovery.log');
const workflowChromiumPosition = workflow.indexOf('run: npx playwright install --with-deps chromium');
const workflowBrowserPosition = workflow.indexOf('npm run test:browser 2>&1 | tee test-results/browser.log');
check('Test discovery runs after release preflight', workflowDiscoveryPosition > workflowPreflightPosition, `${workflowPreflightPosition} / ${workflowDiscoveryPosition}`);
check('Discovery coverage is verified before Chromium installation', workflowDiscoveryVerificationPosition > workflowDiscoveryPosition && workflowChromiumPosition > workflowDiscoveryVerificationPosition, `${workflowDiscoveryPosition} / ${workflowDiscoveryVerificationPosition} / ${workflowChromiumPosition}`);
check('Browser workflow fails fast before Chromium installation', workflowPreflightPosition >= 0 && workflowDiscoveryPosition > workflowPreflightPosition && workflowDiscoveryVerificationPosition > workflowDiscoveryPosition && workflowChromiumPosition > workflowDiscoveryVerificationPosition, `${workflowPreflightPosition} / ${workflowDiscoveryPosition} / ${workflowDiscoveryVerificationPosition} / ${workflowChromiumPosition}`);
check('Browser tests run after Chromium installation', workflowBrowserPosition > workflowChromiumPosition, `${workflowChromiumPosition} / ${workflowBrowserPosition}`);
check('Lock workflow checks out main explicitly', /ref:\s*main\b/.test(lockWorkflow));
check('Lock workflow runs automatically for package changes', /push:[\s\S]*branches:\s*\[main\][\s\S]*package\.json/.test(lockWorkflow));
check('Lock workflow runs automatically when repaired', lockWorkflow.includes("'.github/workflows/generate-package-lock.yml'"));
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
  check('Package lock format is current', lock.lockfileVersion === 3, `lockfileVersion ${lock.lockfileVersion || 'missing'}`);
  check('Package lock matches app version', lock.version === pkg.version && lock.packages?.['']?.version === pkg.version, `${pkg.version} / ${lock.version || 'missing'}`);
  check('Package lock matches pinned Playwright', lockedPlaywright === playwrightVersion, `${playwrightVersion} / ${lockedPlaywright || 'missing'}`);
}

const failures = checks.filter(item => !item.passed);
for (const item of checks) {
  const suffix = item.detail ? ` — ${item.detail}` : '';
  console.log(`${item.passed ? 'PASS' : 'FAIL'}: ${item.name}${suffix}`);
}
console.log(`\n${checks.length - failures.length}/${checks.length} release preflight checks passed.`);

if (failures.length) process.exitCode = 1;
