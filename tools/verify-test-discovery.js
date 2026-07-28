#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const logPath = path.join(root, process.argv[2] || 'test-results/discovery.log');
const minimumTests = Number.parseInt(process.env.MIN_DISCOVERED_TESTS || '10', 10);
const minimumFiles = Number.parseInt(process.env.MIN_DISCOVERED_FILES || '4', 10);

if (!fs.existsSync(logPath)) {
  console.error(`Discovery log is missing: ${path.relative(root, logPath)}`);
  process.exit(1);
}

const log = fs.readFileSync(logPath, 'utf8');
const totals = [...log.matchAll(/Total:\s+(\d+)\s+tests?\s+in\s+(\d+)\s+files?/gi)];
const match = totals.at(-1);

if (!match) {
  console.error('Could not parse Playwright discovery totals from the discovery log.');
  process.exit(1);
}

const tests = Number.parseInt(match[1], 10);
const files = Number.parseInt(match[2], 10);
const summary = `${tests} tests in ${files} files`;

fs.writeFileSync(path.join(root, 'test-results/discovery-count.txt'), `${summary}\n`);

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `tests=${tests}\nfiles=${files}\nsummary=${summary}\n`);
}

if (tests < minimumTests || files < minimumFiles) {
  console.error(`Insufficient Playwright coverage discovered: ${summary}; expected at least ${minimumTests} tests in ${minimumFiles} files.`);
  process.exit(1);
}

console.log(`Verified Playwright discovery: ${summary}.`);
