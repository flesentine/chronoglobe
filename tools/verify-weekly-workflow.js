#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const workflowPath = path.join(root, '.github/workflows/browser-smoke-tests.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');
const expectedCron = '17 15 * * 1';

const scheduleBlocks = [...workflow.matchAll(/^\s*schedule:\s*$([\s\S]*?)(?=^\S|\Z)/gm)];
const cronValues = [...workflow.matchAll(/^\s*-\s*cron:\s*['"]([^'"]+)['"]\s*$/gm)].map(match => match[1]);

if (scheduleBlocks.length !== 1) {
  throw new Error(`Expected exactly one workflow schedule block; found ${scheduleBlocks.length}.`);
}

if (cronValues.length !== 1 || cronValues[0] !== expectedCron) {
  throw new Error(`Expected weekly browser verification cron ${expectedCron}; found ${cronValues.join(', ') || 'none'}.`);
}

console.log(`PASS: Browser verification is scheduled weekly with cron ${expectedCron} (Monday 15:17 UTC).`);
