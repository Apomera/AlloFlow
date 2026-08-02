#!/usr/bin/env node
// Keep the deployed English registry aware of the same AlphaFold namespace
// without replacing unrelated changes in the deployed bundle.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sourceFile = path.join(root, 'ui_strings.js');
const deployedFile = path.join(root, 'desktop', 'web-app', 'public', 'ui_strings.js');
const alphaFold = JSON.parse(fs.readFileSync(sourceFile, 'utf8')).stem.alphaFold;
const raw = fs.readFileSync(deployedFile, 'utf8');
const stemStart = raw.indexOf('"stem"');
const open = raw.indexOf('{', stemStart);
let depth = 0; let string = false; let escaped = false; let close = -1;
for (let i = open; i < raw.length; i += 1) {
  const ch = raw[i];
  if (string) { if (escaped) escaped = false; else if (ch === '\\') escaped = true; else if (ch === '"') string = false; continue; }
  if (ch === '"') { string = true; continue; }
  if (ch === '{') depth += 1;
  else if (ch === '}' && --depth === 0) { close = i; break; }
}
if (stemStart < 0 || open < 0 || close < 0) throw new Error('deployed ui_strings.js has no valid stem object');
if (raw.slice(open + 1, close).includes('"alphaFold"')) process.exit(0);
const before = raw.slice(0, close); const trimmed = before.trimEnd(); const trailing = before.slice(trimmed.length);
const formatted = JSON.stringify(alphaFold, null, 2).replace(/^/gm, '    ');
const temp = deployedFile + '.codex-tmp';
fs.writeFileSync(temp, trimmed + ',\n    "alphaFold": ' + formatted + trailing + raw.slice(close), 'utf8');
fs.renameSync(temp, deployedFile);
console.log('Synchronized deployed AlphaFold registry.');
