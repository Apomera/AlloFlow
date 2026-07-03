#!/usr/bin/env node
// Re-paste the generated docsuite theme CSS into AlloFlowANTI.txt (idempotent).
'use strict';
const fs = require('fs');
const path = require('path');
const gen = require('./gen_docsuite_theme.cjs');
const ROOT = path.resolve(__dirname, '..');
const ANTI = path.join(ROOT, 'AlloFlowANTI.txt');
let anti = fs.readFileSync(ANTI, 'utf8');
const css = gen.generateCss(ROOT);
const reAll = /\n?\s*<style data-docsuite-theme="v1">\{`[\s\S]*?`\}<\/style>/g;
const blocks = anti.match(reAll) || [];
if (!blocks.length) { console.error('block not found'); process.exit(1); }
// Keep exactly ONE block (a 2026-07-02 .Replace() mishap once duplicated it):
// delete every occurrence, then re-insert fresh at the first block's position.
const firstIdx = anti.indexOf(blocks[0]);
anti = anti.replace(reAll, '');
const fresh = '\n      <style data-docsuite-theme="v1">{`\n' + css + '\n      `}</style>';
anti = anti.slice(0, firstIdx) + fresh + anti.slice(firstIdx);
fs.writeFileSync(ANTI, anti);
console.log('docsuite theme block applied once (' + css.length + ' chars, removed ' + (blocks.length - 1) + ' duplicate(s)).');
