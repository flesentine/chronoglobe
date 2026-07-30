#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const failures = [];

function requireCheck(condition, message) {
  if (!condition) failures.push(message);
}

const index = read('index.html');
const runtimePath = 'accessibility-runtime.js';
const runtime = exists(runtimePath) ? read(runtimePath) : '';
const runtimeReferences = index.match(/<script\s+[^>]*src=["']accessibility-runtime\.js["'][^>]*><\/script>/gi) || [];
const localScriptSources = [...index.matchAll(/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi)]
  .map(match => match[1])
  .filter(source => !/^(?:https?:)?\/\//i.test(source));
const duplicates = [...new Set(localScriptSources.filter((source, index) => localScriptSources.indexOf(source) !== index))];
const hasInitializationGuard = /if\s*\(\s*window\.__CHRONO(?:GLOBE)?_ACCESSIBILITY_RUNTIME__\s*\)\s*return\s*;[\s\S]*window\.__CHRONO(?:GLOBE)?_ACCESSIBILITY_RUNTIME__\s*=\s*true\s*;/.test(runtime);
const endScreenTag = index.match(/<div\s+[^>]*id=["']endScreen["'][^>]*>/i)?.[0] || '';
const endTitleTag = index.match(/<h2\s+[^>]*id=["']endTitle["'][^>]*>/i)?.[0] || '';
const escapeSet = runtime.match(/const\s+escapeClosableDialogIds\s*=\s*new Set\(\[([^\]]*)\]\)/)?.[1] || '';
const escapeDialogIds = [...escapeSet.matchAll(/["']([^"']+)["']/g)].map(match => match[1]);
const requiredEscapeDialogs = ['tutorial', 'gameMenu', 'confirmNewGame', 'confirmHint'];
const mandatoryDialogs = ['resumeGameDialog', 'endScreen'];

requireCheck(exists(runtimePath), `${runtimePath} must exist`);
requireCheck(runtimeReferences.length === 1, `${runtimePath} must be loaded exactly once in index.html; found ${runtimeReferences.length}`);
requireCheck(duplicates.length === 0, `production scripts must be unique; duplicates: ${duplicates.join(', ')}`);
requireCheck(!index.includes('accessibility-focus.js'), 'obsolete accessibility-focus.js must not be loaded');
requireCheck(hasInitializationGuard, 'accessibility runtime must use a global initialization guard');
requireCheck(runtime.includes('script[src="accessibility-runtime.js"]'), 'accessibility runtime must remove duplicate script nodes');
requireCheck(runtime.includes("event.key==='Tab'"), 'accessibility runtime must preserve modal focus trapping');
requireCheck(runtime.includes("element.setAttribute('inert','')"), 'accessibility runtime must make modal background content inert');
requireCheck(runtime.includes("element.setAttribute('aria-hidden','true')"), 'accessibility runtime must hide modal background content from assistive technology');
requireCheck(runtime.includes('restoreBackground'), 'accessibility runtime must restore prior background state when dialogs close');
requireCheck(runtime.includes('previous.ariaHidden'), 'accessibility runtime must preserve existing aria-hidden values');
requireCheck(requiredEscapeDialogs.every(id => escapeDialogIds.includes(id)), 'Escape isolation contract must include every dialog the app closes with Escape');
requireCheck(mandatoryDialogs.every(id => !escapeDialogIds.includes(id)), 'mandatory resume and final-score dialogs must remain isolated when Escape is pressed');
requireCheck(/event\.key===['"]Escape['"]&&dialog&&escapeClosableDialogIds\.has\(dialog\.id\)\)restoreBackground\(\)/.test(runtime), 'Escape must restore background only for explicitly closable dialogs');
requireCheck(/role=["']dialog["']/i.test(endScreenTag), 'final screen must declare role="dialog" in index.html');
requireCheck(/aria-modal=["']true["']/i.test(endScreenTag), 'final screen must declare aria-modal="true" in index.html');
requireCheck(/aria-labelledby=["']endTitle["']/i.test(endScreenTag), 'final screen must be labelled by endTitle in index.html');
requireCheck(/tabindex=["']-1["']/i.test(endTitleTag), 'final title must be programmatically focusable in index.html');
requireCheck(!runtime.includes("endScreen.setAttribute('role','dialog')"), 'final dialog semantics must not depend on runtime mutation');

if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  console.error(`\n${failures.length} runtime-loading check${failures.length === 1 ? '' : 's'} failed.`);
  process.exit(1);
}

console.log(`PASS: Runtime loading is stable — ${localScriptSources.length} unique local scripts, modal backgrounds and Escape behavior are isolated, final dialog semantics are static`);
