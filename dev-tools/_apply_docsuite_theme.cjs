#!/usr/bin/env node
// Re-paste the generated docsuite theme CSS into app_styles_source.jsx (idempotent).
'use strict';
const fs = require('fs');
const path = require('path');
const gen = require('./gen_docsuite_theme.cjs');
const ROOT = path.resolve(__dirname, '..');
const STYLE_SOURCE = path.join(ROOT, 'app_styles_source.jsx');
let source = fs.readFileSync(STYLE_SOURCE, 'utf8');
const css = gen.generateCss(ROOT);
const reAll = /\n?\s*<style data-docsuite-theme="v1">\{`[\s\S]*?`\}<\/style>/g;
const blocks = source.match(reAll) || [];
if (!blocks.length) { console.error('block not found'); process.exit(1); }
// Keep exactly ONE block (a 2026-07-02 .Replace() mishap once duplicated it):
// delete every occurrence, then re-insert fresh at the first block's position.
const firstIdx = source.indexOf(blocks[0]);
source = source.replace(reAll, '');
const fresh = '\n      <style data-docsuite-theme="v1">{`\n' + css + '\n      `}</style>';
source = source.slice(0, firstIdx) + fresh + source.slice(firstIdx);
fs.writeFileSync(STYLE_SOURCE, source);
console.log('docsuite theme block applied once (' + css.length + ' chars, removed ' + (blocks.length - 1) + ' duplicate(s)).');
