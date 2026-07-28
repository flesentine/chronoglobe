#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const securityPath = path.join(root, 'SECURITY.md');

if (!fs.existsSync(securityPath)) {
  throw new Error('SECURITY.md is missing');
}

const policy = fs.readFileSync(securityPath, 'utf8');
const requiredPatterns = [
  [/^# Security Policy$/m, 'Security Policy heading'],
  [/^## Supported version$/m, 'supported-version section'],
  [/Current production release \(`1\.9\.x`\)/, 'current supported release'],
  [/Earlier releases and historical commits \| No/, 'unsupported historical releases'],
  [/^## Reporting a vulnerability$/m, 'private-reporting section'],
  [/Security.*Report a vulnerability/s, 'GitHub private reporting guidance'],
  [/do not publish exploit details/i, 'public-disclosure warning'],
  [/Do not include technical details that would make the vulnerability easier to exploit\./, 'safe fallback guidance'],
  [/^## Response expectations$/m, 'response expectations'],
  [/^## Scope$/m, 'security scope'],
  [/Ordinary game bugs.*normal issues/s, 'non-security issue guidance']
];

for (const [pattern, label] of requiredPatterns) {
  if (!pattern.test(policy)) throw new Error(`SECURITY.md is missing ${label}`);
}

if (/mailto:|@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(policy)) {
  throw new Error('SECURITY.md must not publish an unreviewed email reporting address');
}

console.log('PASS: Security support and private vulnerability reporting guidance are documented.');
