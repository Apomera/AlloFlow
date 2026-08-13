#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const {
  buildMailboxScriptSourceModule,
  buildMailboxScriptInlineFallback,
} = require('../_build_mailbox_script_source_module.js');

const ROOT = path.resolve(__dirname, '..');
const ANTI = path.join(ROOT, 'AlloFlowANTI.txt');
const GS = path.join(ROOT, 'apps_script', 'session_mailbox', 'Code.gs');
const GS_PUB = path.join(ROOT, 'desktop', 'web-app', 'public', 'apps_script', 'session_mailbox', 'Code.gs');
const MODULE = path.join(ROOT, 'mailbox_script_source_module.js');
const MODULE_PUB = path.join(ROOT, 'desktop', 'web-app', 'public', 'mailbox_script_source_module.js');

const source = fs.readFileSync(GS, 'utf8');
const versionMatch = source.match(/var VERSION = (\d+);/);
if (!versionMatch) throw new Error('Code.gs is missing var VERSION');
const version = Number(versionMatch[1]);
const bytes = Buffer.byteLength(source, 'utf8');
const sha256 = createHash('sha256').update(source, 'utf8').digest('hex');
const fallback = buildMailboxScriptInlineFallback(source);
const moduleSource = buildMailboxScriptSourceModule(source);

function writeIfChanged(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return false;
  fs.writeFileSync(file, content, 'utf8');
  return true;
}

let anti = fs.readFileSync(ANTI, 'utf8');
const replacements = [
  [/const ALLO_MB_SCRIPT_VERSION = \d+;/, `const ALLO_MB_SCRIPT_VERSION = ${version};`],
  [/const ALLO_MB_SCRIPT_SHA256 = '[a-f0-9]{64}';/, `const ALLO_MB_SCRIPT_SHA256 = '${sha256}';`],
  [/const ALLO_MB_SCRIPT_BYTES = \d+;/, `const ALLO_MB_SCRIPT_BYTES = ${bytes};`],
  [/const ALLO_MB_SCRIPT_FALLBACK_GZIP = '[A-Za-z0-9+/=]+';/, `const ALLO_MB_SCRIPT_FALLBACK_GZIP = '${fallback}';`],
];
for (const [pattern, replacement] of replacements) {
  if (!pattern.test(anti)) throw new Error(`AlloFlowANTI.txt is missing ${pattern}`);
  anti = anti.replace(pattern, replacement);
}

const changed = [];
if (writeIfChanged(ANTI, anti)) changed.push('AlloFlowANTI.txt metadata/fallback');
if (writeIfChanged(MODULE, moduleSource)) changed.push('mailbox_script_source_module.js');
if (writeIfChanged(MODULE_PUB, moduleSource)) changed.push('desktop public module mirror');
if (writeIfChanged(GS_PUB, source)) changed.push('desktop public Code.gs mirror');

console.log(changed.length ? `Updated: ${changed.join(', ')}` : 'Mailbox source artifacts are already in sync.');
console.log('Run node build.js --mode=dev to regenerate the app shell mirrors.');
