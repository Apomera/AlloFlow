#!/usr/bin/env node
// check_forge_contract_sync.cjs — guarantee the Tool Forge's in-browser contract
// validator never drifts from the canonical one.
//
// stem_lab/stem_tool_forge.js VENDORS dev-tools/forge_contract_core.js verbatim
// (between ==FORGE_CONTRACT_CORE_BEGIN/END== markers) so the in-browser Tier-1
// loop and the Node Tier-2 gate (check_tool_contract.cjs) validate against the
// SAME manifest + logic. If the vendored copy and the source diverge, the browser
// would silently approve tools the deploy gate would reject (or vice-versa). This
// gate fails on any divergence.
//
// It checks two things:
//   1. the vendored text block == forge_contract_core.js (whitespace-normalized)
//   2. the runtime CONTRACT manifests deep-equal (the data that actually matters)
//
// Usage: node dev-tools/check_forge_contract_sync.cjs [--quiet]
// Exit: 0 in sync · 1 on drift / missing markers.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const QUIET = process.argv.includes('--quiet');

const CORE = path.join(ROOT, 'dev-tools', 'forge_contract_core.js');
const FORGE = path.join(ROOT, 'stem_lab', 'stem_tool_forge.js');
const BEGIN = '==FORGE_CONTRACT_CORE_BEGIN==';
const END = '==FORGE_CONTRACT_CORE_END==';

function fail(msg) { console.error('✖ forge-contract-sync: ' + msg); process.exit(1); }

if (!fs.existsSync(CORE)) fail('missing ' + path.relative(ROOT, CORE));
if (!fs.existsSync(FORGE)) { if (!QUIET) console.log('forge-contract-sync: stem_tool_forge.js not present — skipped.'); process.exit(0); }

const coreSrc = fs.readFileSync(CORE, 'utf8');
const forgeSrc = fs.readFileSync(FORGE, 'utf8');

const bi = forgeSrc.indexOf(BEGIN);
const ei = forgeSrc.indexOf(END);
if (bi < 0 || ei < 0 || ei < bi) fail('vendored-core markers not found in stem_tool_forge.js');
// the vendored block = from the line after the BEGIN marker line to the line before END
const afterBegin = forgeSrc.indexOf('\n', bi) + 1;
const beforeEnd = forgeSrc.lastIndexOf('\n', ei);
const vendored = forgeSrc.slice(afterBegin, beforeEnd);

// 1) text parity of the MODULE CODE (the canonical file has a leading file-header
//    doc comment that the forge documents separately; we compare from the UMD IIFE
//    onward so only the contract logic must match byte-for-byte).
function stripLeadingBlockComment(s) {
  return s.replace(/^﻿?\s*\/\*[\s\S]*?\*\/\s*/, '');
}
function norm(s) {
  return s.replace(/\r\n/g, '\n').split('\n').map(function (l) { return l.replace(/\s+$/, ''); }).join('\n').replace(/^\n+/, '').replace(/\n+$/, '');
}
const nv = norm(stripLeadingBlockComment(vendored)), nc = norm(stripLeadingBlockComment(coreSrc));
if (nv !== nc) {
  // find first differing line for a helpful pointer
  const a = nv.split('\n'), b = nc.split('\n');
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  console.error('✖ forge-contract-sync: vendored core in stem_tool_forge.js DRIFTED from dev-tools/forge_contract_core.js');
  console.error('  first difference around line ' + (i + 1) + ':');
  console.error('    core   : ' + JSON.stringify((b[i] || '').slice(0, 100)));
  console.error('    forge  : ' + JSON.stringify((a[i] || '').slice(0, 100)));
  console.error('  Fix: re-copy dev-tools/forge_contract_core.js between the ==FORGE_CONTRACT_CORE_BEGIN/END== markers.');
  process.exit(1);
}

// 2) runtime manifest deep-equal (defense in depth — proves the DATA matches even
//    if normalization ever hid a meaningful difference)
function loadCoreContract() { return require(CORE).CONTRACT; }
function loadVendoredContract() {
  const sandbox = { self: {}, window: null, module: undefined };
  sandbox.self.window = sandbox.self;
  sandbox.window = sandbox.self;
  vm.createContext(sandbox);
  vm.runInContext(vendored, sandbox);
  return sandbox.self.ForgeContract && sandbox.self.ForgeContract.CONTRACT;
}
let same = true, why = '';
try {
  const c1 = JSON.stringify(loadCoreContract());
  const c2 = JSON.stringify(loadVendoredContract());
  same = c1 === c2;
  if (!same) why = 'runtime CONTRACT manifests differ';
} catch (e) { same = false; why = 'could not evaluate vendored core: ' + (e && e.message || e); }
if (!same) fail(why);

if (!QUIET) console.log('✓ forge-contract-sync: stem_tool_forge.js vendored core matches dev-tools/forge_contract_core.js (text + manifest).');
process.exit(0);
