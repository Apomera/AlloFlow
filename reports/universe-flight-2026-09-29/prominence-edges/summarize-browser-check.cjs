const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dir = __dirname;
const reportPath = path.join(dir, 'vista-browser-check.json');
const reportBytes = fs.readFileSync(reportPath);
const data = JSON.parse(reportBytes);
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const summary = {
  completed: data.completed,
  failure: data.failure ?? null,
  checks: data.checks,
  counts: { checks: data.checks.length, accessibility: data.accessibility.length, captures: data.captures.length, poses: data.poses.length, detailMeasurements: data.detailMeasurements.length },
  accessibility: data.accessibility.map(item => ({ name: item.name, violations: item.violations.length })),
  captures: data.captures,
  detailMeasurements: data.detailMeasurements,
  pins: data.pins,
  served: data.served,
  errors: data.errors,
  servedReadErrors: data.servedReadErrors,
  startup: data.startup,
  loaderRetries: data.loaderRetries,
  harnessHash: data.harnessHash,
  reportHash: sha256(reportBytes)
};
fs.writeFileSync(path.join(dir, 'vista-browser-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
