'use strict';
const fs = require('node:fs');
const path = require('node:path');
const report = JSON.parse(fs.readFileSync(path.join(__dirname, 'native-report', 'check.json'), 'utf8'));
console.log(JSON.stringify({ failure: report.failure, captures: report.captures.length, errors: report.errors, resources: report.resources, stability: report.stability, proofRegions: report.proof.candidate?.populations, views: report.comparisons.map(c => ({ name: c.name, baseline: c.baseline, candidate: c.candidate, delta: c.delta })), nearObserver: report.nearObserver.filter(n => n.phase === 'candidate') }, null, 2));
