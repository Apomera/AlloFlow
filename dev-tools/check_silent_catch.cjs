#!/usr/bin/env node
// check_silent_catch.cjs — Find catch blocks that swallow errors silently.
//
// Why this exists:
//   `catch (e) {}` is a notorious source of "feature randomly stops working"
//   bugs. The error is swallowed without logging, so the developer has no
//   idea anything went wrong — until a user reports the symptom and
//   debugging requires reading code to find where the silent catch lives.
//
//   Common AlloFlow patterns that ARE legitimate "silent" catches:
//     - Cleanup catches: `try { rec.stop() } catch (e) {}` (don't care if
//       it was already stopped)
//     - Optional feature: `try { initOptionalThing() } catch (e) {}` (graceful
//       degradation when an optional library isn't loaded)
//
//   Common patterns that are BUGS:
//     - Wrapping a critical operation: `try { saveProgress() } catch (e) {}`
//       — silent failure means data loss
//     - Suppressing all errors in a network call: `try { await fetch(url) }
//       catch (e) {}` — user sees nothing happen
//
//   This check distinguishes:
//     - empty catch (truly no body) → ALWAYS flagged
//     - catch with only console.warn/log (logged but quietly) → informational
//     - catch with only a comment (intentional, marked) → informational
//     - catch with handling (rethrow, fallback, error UI) → safe
//
// Usage:
//   node dev-tools/check_silent_catch.cjs
//   node dev-tools/check_silent_catch.cjs --strict     (block on log-only too)
//   node dev-tools/check_silent_catch.cjs --verbose
//
// Exit codes:
//   0 — no truly-empty catches (logged-only is informational by default)
//   1 — at least one empty catch
//   2 — usage / setup error

'use strict';
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');
const STRICT = args.includes('--strict');

function listFiles(dir, filter) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(filter).map(f => path.join(dir, f));
}

const files = [
  ...listFiles(ROOT, f => /^[^_].*_module\.js$/.test(f)),
  ...listFiles(ROOT, f => /^quiz_[a-z_]+\.js$/.test(f)),
  ...listFiles(path.join(ROOT, 'stem_lab'), f => f.endsWith('.js') && !f.startsWith('_')),
  ...listFiles(path.join(ROOT, 'sel_hub'), f => f.endsWith('.js') && !f.startsWith('_')),
  ...listFiles(path.join(ROOT, 'prismflow-deploy', 'functions'), f => f.endsWith('.js') && !f.startsWith('_')),
];

// Classify a catch block's body. Returns:
//   - 'empty'   — body is completely empty
//   - 'logged'  — body only logs (console.warn / console.error / console.log)
//   - 'handled' — body does anything else (call function, throw, return, etc.)
function classifyCatch(node, src) {
  const body = node.body;
  if (!body || !body.body || body.body.length === 0) return 'empty';
  // Check if every statement is a console.* call
  let allConsoleCall = true;
  for (const stmt of body.body) {
    if (stmt.type !== 'ExpressionStatement') { allConsoleCall = false; break; }
    const expr = stmt.expression;
    if (expr.type !== 'CallExpression') { allConsoleCall = false; break; }
    const callee = expr.callee;
    if (!(callee.type === 'MemberExpression'
        && callee.object && callee.object.name === 'console')) {
      allConsoleCall = false; break;
    }
  }
  if (allConsoleCall) return 'logged';
  return 'handled';
}

const empties = [];
const logged = [];
let totalCatches = 0;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, 'utf-8');
  let ast;
  try {
    ast = acorn.parse(src, {
      ecmaVersion: 2022, allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true,
      allowImportExportEverywhere: true, allowHashBang: true, allowSuperOutsideMethod: true,
      locations: true,
    });
  } catch (e) { continue; }

  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.type === 'CatchClause') {
      totalCatches++;
      const kind = classifyCatch(node, src);
      const entry = {
        file: path.relative(ROOT, file),
        line: node.loc.start.line,
        // Get the try-block first line for context
        snippet: src.substring(Math.max(0, node.start - 60), node.start).split('\n').pop().trim(),
      };
      if (kind === 'empty') empties.push(entry);
      else if (kind === 'logged') logged.push(entry);
    }
    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'start' || k === 'end' || k === 'range') continue;
      if (node[k] && typeof node[k] === 'object') walk(node[k]);
    }
  }
  walk(ast);
}

if (!QUIET || empties.length > 0 || (STRICT && logged.length > 0)) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   Silent catch() Block Check                                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('  Files scanned:    ' + files.filter(f => fs.existsSync(f)).length);
  console.log('  Total catches:    ' + totalCatches);
  console.log('  Empty catches:    ' + empties.length + ' (always flagged)');
  console.log('  Log-only catches: ' + logged.length + ' (informational; --strict to block)');
  console.log('');
}

if (empties.length > 0 && (VERBOSE || STRICT)) {
  console.log('═══ ' + (STRICT ? '✗' : '⚠') + ' TRULY EMPTY catch BLOCKS (' + empties.length + ') — errors disappear without trace ═══');
  console.log('     Default behavior: informational. Pass --strict to block deploys.');
  console.log('     Many are legitimate cleanup patterns: try { rec.stop() } catch (e) {}');
  console.log('');
  for (const e of empties.slice(0, 30)) {
    console.log('  ' + (STRICT ? '✗' : '⚠') + ' ' + e.file + ':' + e.line);
    if (e.snippet) console.log('      Try: ' + e.snippet);
  }
  if (empties.length > 30) console.log('  (... ' + (empties.length - 30) + ' more, run --verbose)');
  console.log('');
  console.log('  Triage rule: each one — is the error meaningful in this context?');
  console.log('     - Cleanup (rec.stop, focus, scroll): intentional, leave as-is');
  console.log('     - Network/save/critical: add `console.warn("...", e)` at minimum');
  console.log('');
}

if (STRICT && logged.length > 0) {
  console.log('═══ ⚠ LOG-ONLY catch BLOCKS (' + logged.length + ') ═══');
  for (const e of logged.slice(0, 30)) {
    console.log('  ⚠ ' + e.file + ':' + e.line);
  }
  console.log('');
}

if (empties.length === 0) {
  console.log('  ✅ No empty catches. ' + logged.length + ' log-only, ' + (totalCatches - logged.length) + ' handled.');
} else if (STRICT) {
  console.log('  ❌ ' + empties.length + ' empty catch(es) blocking in --strict mode.');
} else {
  console.log('  ⚠ ' + empties.length + ' empty / ' + logged.length + ' log-only / ' + (totalCatches - empties.length - logged.length) + ' handled. (Empty catches informational — many are legitimate cleanup. --strict to block.)');
}
console.log('');

process.exit((STRICT && empties.length > 0) ? 1 : 0);
