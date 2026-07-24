#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = __dirname;
const CHECK = process.argv.includes('--check');
const compromisePackage = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules', 'compromise', 'package.json'), 'utf8'));
if (compromisePackage.version !== '14.15.1' || compromisePackage.license !== 'MIT') throw new Error('Text Inquiry requires compromise 14.15.1 under the MIT license.');
const copies = [
  ['tool_integration_sdk.js', 'prismflow-deploy/public/tool_integration_sdk.js'],
  ['annotation_inquiry_bridge.js', 'prismflow-deploy/public/annotation_inquiry_bridge.js'],
  ['text_inquiry/text_inquiry.html', 'prismflow-deploy/public/text_inquiry/text_inquiry.html'],
  ['text_inquiry/text_inquiry_core.js', 'prismflow-deploy/public/text_inquiry/text_inquiry_core.js'],
  ['node_modules/compromise/builds/compromise.js', 'vendor/compromise/compromise.js'],
  ['node_modules/compromise/builds/compromise.js', 'prismflow-deploy/public/vendor/compromise/compromise.js'],
  ['node_modules/compromise/LICENSE', 'vendor/compromise/LICENSE'],
  ['node_modules/compromise/LICENSE', 'prismflow-deploy/public/vendor/compromise/LICENSE']
];
function digest(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
let drift = false;
for (const [sourceRelative, targetRelative] of copies) {
  const source = path.join(ROOT, sourceRelative);
  const target = path.join(ROOT, targetRelative);
  if (!fs.existsSync(source)) throw new Error(`Missing Text Inquiry build source: ${sourceRelative}`);
  const same = fs.existsSync(target) && digest(source) === digest(target);
  if (CHECK) {
    if (!same) { console.error(`DRIFT ${targetRelative} <- ${sourceRelative}`); drift = true; }
  } else if (!same) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    console.log(`COPIED ${targetRelative}`);
  }
}
if (CHECK && drift) process.exit(1);
console.log(CHECK ? 'Text Inquiry integration build is in sync.' : 'Text Inquiry integration build complete.');
