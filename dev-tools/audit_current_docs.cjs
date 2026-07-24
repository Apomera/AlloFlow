#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const root = process.cwd();
const maintained = ['README.md','AdminBrief.md','AlloFlow Complete User Manual.md','architecture.md','FEATURE_INVENTORY.md','COMPETITOR_COMPARISON.md','CONTRIBUTING.md','ORIENTATION.md','DEPLOY_YOUR_OWN.md','SECURITY.md','VPAT-2.5-WCAG-AlloFlow.md','docs/README.md','docs/accessibility-manual-test-plan.md','docs/release-evidence-template.md','desktop/README.md','desktop/web-app/README.md'];
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
for (const file of maintained) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) { errors.push(`${file}: missing maintained document`); continue; }
  for (const match of read(file).matchAll(/!?(?:\[[^\]]*\])\(([^)]+)\)/g)) {
    let target = match[1].trim().replace(/^<|>$/g, '').split(/\s+["']/)[0];
    if (!target || /^(?:https?:|mailto:|tel:|data:|#)/i.test(target)) continue;
    target = decodeURIComponent(target.split('#')[0].split('?')[0]);
    if (target && !fs.existsSync(path.resolve(path.dirname(absolute), target))) errors.push(`${file}: broken local link ${match[1]}`);
  }
}
const stemNames = fs.readdirSync(path.join(root, 'stem_lab')).filter((name) => /^stem_tool_.*\.js$/i.test(name));
const registryOutput = childProcess.execFileSync(process.execPath, ['dev-tools/check_tool_registry.cjs'], { cwd: root, encoding: 'utf8' });
const stemMatch = registryOutput.match(/StemLab tools:\s+(\d+)/);
const stemIds = stemMatch ? Number(stemMatch[1]) : NaN;
const selFiles = fs.readdirSync(path.join(root, 'sel_hub')).filter((name) => /^sel_tool_.*\.js$/i.test(name)).length;
const totals = { stemFiles: stemNames.length, stemIds, selFiles };
for (const [key, expected] of Object.entries({ stemFiles: 126, stemIds: 127, selFiles: 70 })) {
  if (totals[key] !== expected) errors.push(`registry freshness: ${key} expected ${expected}, found ${totals[key]}; update maintained docs and this audit together`);
}
for (const file of ['README.md','AdminBrief.md','AlloFlow Complete User Manual.md','CONTRIBUTING.md','ORIENTATION.md']) {
  if (/111\s+(?:STEM\s+)?tool files?\s*\/\s*116|111 STEM files \/ 116/i.test(read(file))) errors.push(`${file}: stale 111-file / 116-ID STEM count`);
}
const admin = read('AdminBrief.md');
if (/\$26,000|\$20,000-\$30,000|\$3,000\/yr|\$0 software cost/i.test(admin)) errors.push('AdminBrief.md: unqualified hard-coded savings or vendor pricing remains');
if (!admin.includes('current written quotes')) errors.push('AdminBrief.md: missing quote-based pricing caveat');
const docsMap = read('docs/README.md');
for (const phrase of ['point-in-time evidence','deployment-dependent','npm run audit:docs']) if (!docsMap.includes(phrase)) errors.push(`docs/README.md: missing policy phrase “${phrase}”`);
const vpat = read('VPAT-2.5-WCAG-AlloFlow.md');
if (!vpat.includes('May 17, 2026') || !vpat.includes('Not Evaluated')) errors.push('VPAT: evaluated snapshot date or Not Evaluated boundary is missing');
if (errors.length) { console.error(`Documentation audit failed with ${errors.length} error(s):`); for (const error of errors) console.error(`- ${error}`); process.exit(1); }
console.log(`Documentation audit passed: ${maintained.length} maintained documents, ${totals.stemFiles} STEM files / ${totals.stemIds} IDs, ${totals.selFiles} SEL files.`);
