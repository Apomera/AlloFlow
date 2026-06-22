#!/usr/bin/env node
// inject_stem_keys.cjs <tool> — merge the English key map emitted by
// stem_extract_tool.cjs (dev-tools/stem_i18n_report/ui_strings_stem_<tool>.json)
// into ui_strings.js under stem.<tool>.{...}. Idempotent + JSON-validated.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const UI = path.join(ROOT, 'ui_strings.js');
const tool = process.argv[2];
if (!tool) { console.error('Usage: inject_stem_keys.cjs <tool>'); process.exit(2); }
const mapPath = path.join(__dirname, 'stem_i18n_report', 'ui_strings_stem_' + tool + '.json');
if (!fs.existsSync(mapPath)) { console.error('No emitted map: ' + mapPath); process.exit(2); }
const keys = JSON.parse(fs.readFileSync(mapPath, 'utf8'))[tool];
if (!keys || !Object.keys(keys).length) { console.log(tool + ': no keys to inject'); process.exit(0); }

let src = fs.readFileSync(UI, 'utf8');
const parsed0 = JSON.parse(src);
if (parsed0.stem && parsed0.stem[tool]) { console.log(tool + ': stem.' + tool + ' already present — skipping'); process.exit(0); }

const marker = '\n  "stem": {\n';
const idx = src.indexOf(marker);
if (idx === -1) { console.error('stem namespace not found'); process.exit(2); }
const lines = Object.keys(keys).map(k => '      ' + JSON.stringify(k) + ': ' + JSON.stringify(keys[k]));
const block = '    ' + JSON.stringify(tool) + ': {\n' + lines.join(',\n') + '\n    },\n';
const at = idx + marker.length;
src = src.slice(0, at) + block + src.slice(at);

const parsed = JSON.parse(src); // throws if malformed
const t = (parsed.stem && parsed.stem[tool]) || {};
const bad = Object.keys(keys).filter(k => t[k] !== keys[k]);
if (bad.length) { console.error('post-parse mismatch: ' + bad.slice(0, 5).join(', ')); process.exit(3); }
fs.writeFileSync(UI, src);
console.log('Injected stem.' + tool + ' (' + Object.keys(t).length + ' keys). JSON valid.');
