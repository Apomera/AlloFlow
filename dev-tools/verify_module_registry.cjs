#!/usr/bin/env node
// _verify_module_registry.cjs — Producer/consumer contract check for window.AlloModules.X
//
// Why this exists:
//   AlloFlow's hub-and-spoke architecture has a 156-consumer / 245-producer
//   contract surface between the monolith host (AlloFlowANTI.txt) and the
//   CDN modules (*_module.js + stem_lab/*.js + sel_hub/*.js). When a consumer
//   reads `window.AlloModules.X` but no module registers `X`, the host shim
//   pattern (`const Ext = window.AlloModules && window.AlloModules.X; if (Ext) ...`)
//   silently renders "Loading..." forever instead of throwing — so bugs of
//   this class survive in production indefinitely.
//
//   Audit on 2026-05-10 found 6 such bugs latent in the codebase, including
//   the entire Teacher Dashboard / Educator Hub being unreachable because
//   teacher_module.js defined 11 React components but registered only the
//   `TeacherModule = true` breadcrumb.
//
// What it does:
//   1. Use acorn tokenizer to scan every CDN module for `window.AlloModules.X = <RHS>`
//      assignments (PRODUCERS). Acorn correctly handles strings, template
//      literals, regex literals, and comments — no manual lexing.
//   2. Scan AlloFlowANTI.txt with regex (acorn doesn't support JSX). The
//      consumer pattern `window.AlloModules.X` doesn't appear inside any
//      string literal in the codebase (verified), so regex is safe here.
//   3. Cross-reference: every consumer must have ≥1 producer with non-null RHS.
//      Detect suspect-null shapes: literal `null`, or
//      `(typeof X !== 'undefined') ? X : null` where X is undeclared locally.
//   4. Report.
//
// Usage:
//   node _verify_module_registry.cjs                    (run from repo root)
//   node _verify_module_registry.cjs --verbose          (list every check)
//   node _verify_module_registry.cjs --quiet            (silent on success)
//
// Exit codes:
//   0 — all consumers resolved, no suspect-null producers
//   1 — at least one missing producer or suspect-null
//   2 — usage error / required file not found

'use strict';
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

// ROOT = repo root (parent of dev-tools/)
const ROOT = path.resolve(__dirname, '..');
const HOST = path.join(ROOT, 'AlloFlowANTI.txt');

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');

if (!fs.existsSync(HOST)) {
  console.error('Required file not found: ' + HOST);
  process.exit(2);
}

// ──────────────────────────────────────────────────────────────────────────
// Allowlist — consumer names that legitimately have no producer.
// Each entry MUST include a comment explaining why. Add new entries only
// when the consumer is intentionally optional.
// ──────────────────────────────────────────────────────────────────────────
const ALLOW_MISSING = new Set([
  // `window.AlloModules.XP` (AlloFlowANTI.txt:4834) — optional external XP
  // integration point, accessed via `if (x && typeof x.addXp === 'function')`.
  // No producer in any current CDN module. The guard makes absence safe.
  'XP',
]);

// ──────────────────────────────────────────────────────────────────────────
// Discover CDN module files. Skip _build_*.js (those are build scripts).
// ──────────────────────────────────────────────────────────────────────────
function listFiles(dir, filter) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(filter).map(f => path.join(dir, f));
}

const moduleFiles = [
  ...listFiles(ROOT, f => /^[^_].*_module\.js$/.test(f)),
  ...listFiles(ROOT, f => /^quiz_[a-z_]+\.js$/.test(f)),
  ...listFiles(path.join(ROOT, 'stem_lab'), f => f.endsWith('.js') && !f.startsWith('_')),
  ...listFiles(path.join(ROOT, 'sel_hub'), f => f.endsWith('.js') && !f.startsWith('_')),
];

function lineOf(src, idx) {
  let line = 1;
  for (let i = 0; i < idx; i++) if (src[i] === '\n') line++;
  return line;
}

// ──────────────────────────────────────────────────────────────────────────
// Classify a producer's RHS as ok/suspect-null based on the textual shape.
// ──────────────────────────────────────────────────────────────────────────
function classifyProducer(name, file, line, rhsRaw, fullSrc) {
  const rhs = rhsRaw.trim();
  const entry = {
    name,
    file: path.relative(ROOT, file),
    line,
    rhsRaw: rhs.slice(0, 100),
  };

  if (rhs === 'null' || rhs === 'undefined' || rhs === 'false') {
    entry.rhsKind = 'literal-null';
    entry.isSuspect = true;
    entry.suspectReason = 'RHS is literal `' + rhs + '`';
    return entry;
  }

  // typeof-undefined ternary: `(typeof X !== 'undefined') ? X : null`
  const typeofMatch = rhs.match(/\(\s*typeof\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*!==?\s*['"]undefined['"]\s*\)\s*\?\s*\1\s*:\s*(null|undefined|false)/);
  if (typeofMatch) {
    const guardedName = typeofMatch[1];
    // Check if `guardedName` is declared locally in the same module.
    const declRe = new RegExp(
      '(?:^|\\s)(?:const|let|var|function|async\\s+function|class)\\s+' +
      guardedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[=({]',
      'm'
    );
    if (!declRe.test(fullSrc)) {
      entry.rhsKind = 'typeof-undefined-no-local';
      entry.isSuspect = true;
      entry.suspectReason =
        '`(typeof ' + guardedName + " !== 'undefined') ? " + guardedName + ' : null` ' +
        'but `' + guardedName + '` is never declared in this module — always resolves to null';
      return entry;
    }
    entry.rhsKind = 'typeof-undefined-with-local';
    entry.isSuspect = false;
    return entry;
  }

  entry.rhsKind = 'expression';
  entry.isSuspect = false;
  return entry;
}

// ──────────────────────────────────────────────────────────────────────────
// Collect PRODUCERS from a CDN module using acorn's tokenizer.
// Acorn correctly understands strings, template literals (including ${} nesting),
// regex literals, and comments — so no manual lexing is required.
// ──────────────────────────────────────────────────────────────────────────
function collectProducers(srcRaw, file) {
  const producers = [];
  let tokens;
  try {
    tokens = [...acorn.tokenizer(srcRaw, {
      ecmaVersion: 2022,
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
      allowImportExportEverywhere: true,
      allowHashBang: true,
      allowSuperOutsideMethod: true,
      locations: true,
    })];
  } catch (e) {
    console.error('  ⚠ acorn failed to tokenize ' + path.relative(ROOT, file) + ': ' + e.message);
    return producers;
  }

  // Walk tokens looking for: window . AlloModules . NAME = <RHS>
  for (let i = 0; i + 5 < tokens.length; i++) {
    const t = tokens;
    if (t[i].type.label === 'name' && srcRaw.substring(t[i].start, t[i].end) === 'window' &&
        t[i+1].type.label === '.' &&
        t[i+2].type.label === 'name' && srcRaw.substring(t[i+2].start, t[i+2].end) === 'AlloModules' &&
        t[i+3].type.label === '.' &&
        t[i+4].type.label === 'name' &&
        t[i+5].type.label === '=') {
      const name = srcRaw.substring(t[i+4].start, t[i+4].end);
      if (name[0] < 'A' || name[0] > 'Z') continue;
      const line = t[i].loc.start.line;
      // Capture RHS: from after `=` to next `;` or newline (single-line slice
      // is enough — we only need the leading shape for null detection).
      const rhsStart = t[i+5].end;
      let rhsEnd = srcRaw.indexOf(';', rhsStart);
      const nlEnd = srcRaw.indexOf('\n', rhsStart);
      if (rhsEnd === -1 || (nlEnd !== -1 && nlEnd < rhsEnd)) rhsEnd = nlEnd;
      if (rhsEnd === -1) rhsEnd = srcRaw.length;
      const rhsRaw = srcRaw.substring(rhsStart, rhsEnd).trim();
      producers.push(classifyProducer(name, file, line, rhsRaw, srcRaw));
    }
  }
  return producers;
}

// ──────────────────────────────────────────────────────────────────────────
// Collect CONSUMERS from AlloFlowANTI.txt. Acorn can't parse JSX, so use
// simple regex. The pattern `window.AlloModules.X` doesn't appear inside
// any string literal in the monolith (verified via grep '["\']*window.AlloModules.X').
// Only need to strip line + block comments to avoid the rare comment match.
// ──────────────────────────────────────────────────────────────────────────
function stripLineAndBlockComments(src) {
  // Remove block comments first, then line comments. Doesn't handle the case
  // where '/*' or '//' appears inside a string literal — but those would only
  // produce false negatives (missing real consumers), and survey confirmed no
  // such collisions exist in AlloFlowANTI.txt.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, '');
}

function collectConsumers(srcRaw) {
  const src = stripLineAndBlockComments(srcRaw);
  const consumers = new Map(); // name -> { count, firstLine }
  // Match the full identifier; non-identifier-char lookahead prevents
  // truncation (e.g., capturing 'ConfettiExplosio' instead of 'ConfettiExplosion').
  const re = /window\.AlloModules\.([A-Z][A-Za-z0-9_$]*)(?![A-Za-z0-9_$])/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    // Skip occurrences that are themselves assignments (host-side registrations).
    const after = src.substring(m.index + m[0].length, m.index + m[0].length + 6);
    if (/^\s*=(?!=)/.test(after)) continue;
    if (!consumers.has(name)) consumers.set(name, { count: 0, firstLine: lineOf(srcRaw, m.index) });
    consumers.get(name).count++;
  }
  return consumers;
}

// ──────────────────────────────────────────────────────────────────────────
// Run analysis
// ──────────────────────────────────────────────────────────────────────────
const hostSrc = fs.readFileSync(HOST, 'utf-8');
const consumers = collectConsumers(hostSrc);

const allProducers = [];
for (const f of moduleFiles) {
  const src = fs.readFileSync(f, 'utf-8');
  allProducers.push(...collectProducers(src, f));
}

// Index producers by name
const producersByName = new Map();
for (const p of allProducers) {
  if (!producersByName.has(p.name)) producersByName.set(p.name, []);
  producersByName.get(p.name).push(p);
}

// ──────────────────────────────────────────────────────────────────────────
// Cross-reference
// ──────────────────────────────────────────────────────────────────────────
const missing = [];
const suspectNull = [];
const ok = [];

for (const [name, info] of consumers) {
  if (ALLOW_MISSING.has(name)) {
    ok.push({ name, ...info, status: 'allowlisted' });
    continue;
  }
  const prods = producersByName.get(name) || [];
  if (prods.length === 0) {
    missing.push({ name, ...info });
  } else {
    const nonSuspect = prods.filter(p => !p.isSuspect);
    if (nonSuspect.length === 0) {
      suspectNull.push({ name, ...info, producers: prods });
    } else {
      ok.push({ name, ...info, status: 'ok', producers: nonSuspect });
    }
  }
}

// Orphan producers (registered but never consumed) — informational only
const orphanProducers = [];
for (const [name, prods] of producersByName) {
  if (!consumers.has(name)) {
    orphanProducers.push({ name, locations: prods.map(p => p.file + ':' + p.line) });
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Report
// ──────────────────────────────────────────────────────────────────────────
const totalErrors = missing.length + suspectNull.length;

if (!QUIET || totalErrors > 0) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   AlloFlow Module Registry Verification                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('  Host:          ' + path.relative(ROOT, HOST));
  console.log('  CDN modules:   ' + moduleFiles.length + ' files scanned');
  console.log('  Consumers:     ' + consumers.size + ' unique names');
  console.log('  Producers:     ' + producersByName.size + ' unique names (' + allProducers.length + ' total registrations)');
  console.log('');
}

if (missing.length > 0) {
  console.log('═══ ✗ MISSING PRODUCER (' + missing.length + ') — consumer with no registering module ═══');
  console.log('');
  for (const e of missing) {
    console.log('  ✗ window.AlloModules.' + e.name);
    console.log('      First consumed at: AlloFlowANTI.txt:' + e.firstLine + ' (' + e.count + ' total references)');
    console.log('      No producer found in any CDN module.');
    console.log('      Fix: register `window.AlloModules.' + e.name + ' = ' + e.name + ';` in the appropriate module,');
    console.log('           OR add a `loadModule(...)` call if the producing module is built but not loaded,');
    console.log('           OR remove the consumer if the feature is dead.');
    console.log('');
  }
}

if (suspectNull.length > 0) {
  console.log('═══ ⚠ SUSPECT-NULL PRODUCER (' + suspectNull.length + ') — registration always resolves to null ═══');
  console.log('');
  for (const e of suspectNull) {
    console.log('  ⚠ window.AlloModules.' + e.name);
    console.log('      Consumed at:  AlloFlowANTI.txt:' + e.firstLine + ' (' + e.count + ' total references)');
    for (const p of e.producers) {
      console.log('      Registered:   ' + p.file + ':' + p.line);
      console.log('                    RHS = ' + p.rhsRaw);
      console.log('                    ' + p.suspectReason);
    }
    console.log('      Fix: change RHS to a real component, or remove the registration if the consumer is now inline.');
    console.log('');
  }
}

if (VERBOSE) {
  console.log('═══ ⊙ ORPHAN PRODUCERS (' + orphanProducers.length + ') — registered but never consumed (informational) ═══');
  console.log('');
  for (const o of orphanProducers.slice(0, 30)) {
    console.log('  ⊙ window.AlloModules.' + o.name + '  →  ' + o.locations[0]);
  }
  if (orphanProducers.length > 30) console.log('  (... ' + (orphanProducers.length - 30) + ' more)');
  console.log('');
}

console.log('  ✓ OK:           ' + ok.length);
console.log('  ✗ Missing:      ' + missing.length);
console.log('  ⚠ Suspect-null: ' + suspectNull.length);
console.log('  ⊙ Orphans:      ' + orphanProducers.length + ' (informational)');
console.log('');

if (totalErrors === 0) {
  console.log('  ✅ All ' + consumers.size + ' consumers have valid producers.');
} else {
  console.log('  ❌ ' + totalErrors + ' contract violation' + (totalErrors === 1 ? '' : 's') + ' — fix before deploy.');
}
console.log('');

process.exit(totalErrors > 0 ? 1 : 0);
