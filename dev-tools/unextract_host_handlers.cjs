#!/usr/bin/env node
'use strict';

// Move handlers BACK from host_handlers_module.js into AlloFlowANTI.txt (2026-09-13).
//
// WHY: the wave-3..5 extraction excluded handlers invoked synchronously inside
// effect bodies, but a mount-time effect can also reach a handler through a
// timer, a listener or a promise chain, and at boot those still fire before any
// CDN module has landed: on reload with a remembered role, executeRoleSelect
// threw "[HostHandlers] module not loaded" from a setTimeout in the role-restore
// effect. Anything an effect can reach at any depth belongs in the host.
//
// Usage: node dev-tools/unextract_host_handlers.cjs name1 name2 ...
// For each name: restore the body (module spelling `__d.x` -> `x`, shorthand
// `x: __d.x` -> `x`) over the host shim (useCallback shims keep their deps),
// remove it from the module source and manifest, regenerate the host getter
// prelude from the module's remaining `__d.` reads, rebuild, re-pin.

const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const ROOT = path.resolve(__dirname, '..');
const HOST = path.join(ROOT, 'AlloFlowANTI.txt');
const SOURCE = path.join(ROOT, 'host_handlers_source.jsx');
const MANIFEST = path.join(__dirname, 'host_handlers_wave3_manifest.json');
const OUTPUT = 'host_handlers_module.js';

const names = process.argv.slice(2).filter(Boolean);
if (!names.length) { console.error('usage: node dev-tools/unextract_host_handlers.cjs <name...>'); process.exit(2); }

const hostSpelling = (t) => t.replace(/\b([A-Za-z_$][\w$]*): __d\.\1\b/g, '$1').replace(/__d\./g, '');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let host = fs.readFileSync(HOST, 'utf8');
let source = fs.readFileSync(SOURCE, 'utf8');
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const hooked = new Set(manifest.useCallbackHandlers || []);

for (const name of names) {
  if (!manifest.handlers.includes(name)) throw new Error(name + ' is not a moved handler');
  // module text: from the column-0 declaration to the next column-0 declaration or the return
  const startRe = new RegExp('^(const ' + esc(name) + ' = |(?:async )?function ' + esc(name) + '\\()', 'm');
  const sm = source.match(startRe);
  if (!sm) throw new Error('module body not found: ' + name);
  const start = sm.index;
  const rest = source.slice(start + 1);
  const nextRel = rest.search(/\n(const |function |async function |  return \{ )/);
  const end = nextRel < 0 ? source.length : start + 1 + nextRel + 1;
  let body = source.slice(start, end).replace(/\s+$/, '');
  source = source.slice(0, start) + source.slice(end);
  body = hostSpelling(body);
  if (hooked.has(name)) {
    // module: `const name = <inner>;` ; host: `const name = useCallback((...__a) => ..., <deps>);`
    const inner = body.replace(new RegExp('^const ' + esc(name) + ' = '), '').replace(/;$/, '');
    const shimRe = new RegExp('const ' + esc(name) + ' = ((?:React\\.)?useCallback)\\((?:async )?\\(\\.\\.\\.__a\\) => _alloHostHandlers\\(\\)\\.' + esc(name) + '\\(\\.\\.\\.__a\\)((?:, \\[[\\s\\S]*?\\])?)\\);');
    const hm = host.match(shimRe);
    if (!hm) throw new Error('useCallback shim not found: ' + name);
    host = host.replace(shimRe, 'const ' + name + ' = ' + hm[1] + '(' + inner + hm[2] + ');');
  } else {
    const shimRe = new RegExp('(?:const ' + esc(name) + ' = (?:async )?\\(\\.\\.\\.__a\\) => _alloHostHandlers\\(\\)\\.' + esc(name) + '\\(\\.\\.\\.__a\\);|(?:async )?function ' + esc(name) + '\\(\\.\\.\\.__a\\) \\{ return _alloHostHandlers\\(\\)\\.' + esc(name) + '\\(\\.\\.\\.__a\\); \\})');
    if (!shimRe.test(host)) throw new Error('shim not found: ' + name);
    host = host.replace(shimRe, body);
  }
  manifest.handlers = manifest.handlers.filter(n => n !== name);
  manifest.useCallbackHandlers = (manifest.useCallbackHandlers || []).filter(n => n !== name);
  console.log('restored ' + name + ' (' + Buffer.byteLength(body) + ' bytes)');
}
// return list
source = source.replace(/\n  return \{ [^\n]*\};\n/, '\n  return { ' + manifest.handlers.join(', ') + ' };\n');
// remaining reads -> getters
const reads = Array.from(new Set(Array.from(source.replace(/^\s*\/\/.*$/gm, '').matchAll(/__d\.([A-Za-z_$][\w$]*)/g), m => m[1]))).sort();
const preludeStart = host.indexOf('  const __alloHostDeps = {\n');
const preludeEnd = host.indexOf('\n  };\n', preludeStart) + '\n  };\n'.length;
if (preludeStart < 0) throw new Error('prelude not found');
const rows = [];
for (let i = 0; i < reads.length; i += 4) rows.push('    ' + reads.slice(i, i + 4).map(n => `get ${n}() { return ${n}; }`).join(', '));
host = host.slice(0, preludeStart) + '  const __alloHostDeps = {\n' + rows.join(',\n') + ',\n  };\n' + host.slice(preludeEnd);
manifest.deps = reads;
manifest.unextracted = (manifest.unextracted || []).concat(names.map(n => ({ name: n, on: '2026-09-13', why: 'reachable from an effect body at boot' })));
fs.writeFileSync(SOURCE, source, 'utf8');
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
const { buildFirstWaveModule } = require(path.join(ROOT, '_build_first_wave_view_modules.js'));
const out = buildFirstWaveModule('HostHandlers');
fs.writeFileSync(path.join(ROOT, OUTPUT), out, 'utf8');
fs.writeFileSync(path.join(ROOT, 'desktop', 'web-app', 'public', OUTPUT), out, 'utf8');
const pin = createHash('sha256').update(fs.readFileSync(path.join(ROOT, OUTPUT))).digest('hex').slice(0, 8);
const pm = host.match(/host_handlers_module\.js\?v=([0-9a-f]{8})/);
host = host.replace(pm[0], 'host_handlers_module.js?v=' + pin);
fs.writeFileSync(HOST, host, 'utf8');
console.log(`module ${Buffer.byteLength(out)} bytes, pin ${pm[1]} -> ${pin}, handlers ${manifest.handlers.length}, getters ${reads.length}`);
