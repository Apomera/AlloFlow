#!/usr/bin/env node
// bridgelab_record_translation_source.cjs — record which English each Bridge Lab translation was made from.
//
//   node dev-tools/bridgelab_record_translation_source.cjs
//
// Writes tests/fixtures/bridgelab_translation_source.json: { "<key>": "<first 12 hex of sha256(English)>" } for every
// stem.bridgelab string the tool uses. tests/bridgelab_language_packs.test.js fails when the English of a key changes
// without this file being re-recorded, which is the moment every finished translation of that key became wrong
// (the fact-check of 2026-10-27 corrected 47 strings and each one needed re-translating in every finished pack).
//
// RUN THIS ONLY AFTER every finished pack (see TRANSLATED in the test) has been re-translated from the new English.
// Re-recording to silence the test leaves learners reading an old claim in their language.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
const ui = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8')).stem.bridgelab;
const src = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_bridgelab.js'), 'utf8');
// Static keys, plus the two the tool builds at runtime: '<bridge type id>_desc' and '<material id>_desc'.
const runtime = [...src.matchAll(/^\s*\{?\s*id:\s*'([a-z_]+)',\s*(?:name|icon):/gm)].map(m => m[1] + '_desc');
const used = [...new Set([...src.matchAll(/['"]stem\.bridgelab\.([A-Za-z0-9_.]+)['"]/g)].map(m => m[1]).concat(runtime))].filter(k => k in ui).sort();
const out = {};
for (const k of used) out[k] = crypto.createHash('sha256').update(ui[k]).digest('hex').slice(0, 12);
const file = path.join(ROOT, 'tests/fixtures/bridgelab_translation_source.json');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n', 'utf8');
console.log('recorded ' + used.length + ' keys -> ' + path.relative(ROOT, file));
