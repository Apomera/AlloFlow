const fs = require('node:fs');
const doc = 'docs/rendered-document-fidelity.md';
let d = fs.readFileSync(doc,'utf8');
d = d.replace('Artifacts without `sourceFidelity` retain their existing behavior; no rendered source comparison is implied for them.', 'Every HTML/PDF artifact is inspected from its captured bytes and rechecked for changes at completion. Optional rendered sources are also rechecked. Artifacts without `sourceFidelity` receive no rendered source comparison.');
fs.writeFileSync(doc,d);
const script = 'reports/document-remediation-rendered-refinements-2026-09-09/calibration-and-review.cjs';
fs.writeFileSync(script,fs.readFileSync(script,'utf8').replace('timeout: 120000','timeout: 240000'));
