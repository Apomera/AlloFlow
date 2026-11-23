#!/usr/bin/env node
// check_eval.cjs — AST scan for eval(), Function(), new Function(), and string timers.
//
// Detects:
//   - eval(x), (0, eval)(x), window.eval(x), globalThis.eval(x), self.eval(x), window['eval'](x)
//   - new Function(...), bare Function(...), window.Function(...), globalThis.Function(...)
//   - setTimeout(stringOrTemplate, ...), setInterval(stringOrTemplate, ...)
//
// Fail-closed guarantees:
//   - Parse errors are NEVER silently ignored (exit 2).
//   - Missing mandatory files / inaccessible dirs / symlinks are omissions (exit 2).
//   - Known intentional sites are tightly ratcheted in dev-tools/eval_baseline.json
//     by (file, kind, normalizedSignature, maxCount). Any new or changed site fails
//     --strict with exit 1.
//
// Usage:
//   node dev-tools/check_eval.cjs
//   node dev-tools/check_eval.cjs --strict
//   node dev-tools/check_eval.cjs --strict --no-baseline
//   node dev-tools/check_eval.cjs --verbose
//   node dev-tools/check_eval.cjs --quiet
//   node dev-tools/check_eval.cjs --baseline=<path>
//
// Exit codes:
//   0 — complete scan, no unaccepted findings (or informational mode without --strict)
//   1 — one or more unaccepted eval/Function/timer-string findings in --strict mode
//   2 — incomplete scan (parse error, missing required source, symlink, read error, bad CLI flag)

'use strict';
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const babelParser = require('@babel/parser');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_BASELINE_PATH = path.join(__dirname, 'eval_baseline.json');

const SOURCE_DIRS = Object.freeze([
  'stem_lab',
  'sel_hub',
  'desktop/web-app/functions',
  'desktop/electron',
  'desktop/runtime',
  'desktop/mcp',
  'catalog',
  'services',
  'apps_script',
]);

const EXCLUDED_DIRS = new Set([
  'node_modules', 'vendor', 'vendors', 'assets', 'media', 'public', 'build', 'dist',
  'coverage', 'reports', 'artifacts', 'tmp', 'temp', 'scratch', '__pycache__',
  'test', 'tests', 'fixtures',
]);

const CODE_EXT_RE = /\.(?:js|jsx|cjs|mjs|ts|tsx|gs)$/i;
const GLOBAL_OBJECTS = new Set(['window', 'globalThis', 'self', 'global']);

const BABEL_BASE_PLUGINS = [
  'jsx',
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'topLevelAwait',
  'dynamicImport',
  'optionalChaining',
  'nullishCoalescingOperator',
  'numericSeparator',
  'objectRestSpread',
  'decorators-legacy',
];

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function normalizeSignature(snippet) {
  return String(snippet || '')
    .replace(/\s+/g, ' ')
    .replace(/"/g, "'")
    .replace(/\s*([(),+])\s*/g, '$1')
    .trim()
    .slice(0, 120);
}

function parseAst(src, relPath) {
  const ext = path.extname(relPath).toLowerCase();
  const isHost = path.basename(relPath) === 'AlloFlowANTI.txt';
  const isTs = ext === '.ts' || ext === '.tsx';
  const needsBabel = isHost || ext === '.jsx' || isTs;

  if (!needsBabel) {
    try {
      return acorn.parse(src, {
        ecmaVersion: 'latest',
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true,
        allowImportExportEverywhere: true,
        allowHashBang: true,
        allowSuperOutsideMethod: true,
        locations: true,
      });
    } catch (acornErr) {
      // Fall through to Babel once in case a .js file contains JSX or stage syntax;
      // if Babel also rejects it, propagate the parse failure (fail closed).
      try {
        return babelParser.parse(src, {
          sourceType: 'unambiguous',
          allowReturnOutsideFunction: true,
          allowAwaitOutsideFunction: true,
          allowImportExportEverywhere: true,
          allowSuperOutsideMethod: true,
          errorRecovery: false,
          plugins: BABEL_BASE_PLUGINS,
        }).program;
      } catch (_) {
        throw acornErr;
      }
    }
  }

  const plugins = isTs ? [...BABEL_BASE_PLUGINS, 'typescript'] : BABEL_BASE_PLUGINS;
  return babelParser.parse(src, {
    sourceType: 'unambiguous',
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    allowImportExportEverywhere: true,
    allowSuperOutsideMethod: true,
    errorRecovery: false,
    plugins,
  }).program;
}

function resolveTargetCallee(callee) {
  if (!callee) return null;
  if (callee.type === 'Identifier') {
    return { target: callee.name, indirect: false };
  }
  if ((callee.type === 'MemberExpression' || callee.type === 'OptionalMemberExpression')
      && callee.object && callee.object.type === 'Identifier'
      && GLOBAL_OBJECTS.has(callee.object.name)) {
    if (!callee.computed && callee.property && callee.property.type === 'Identifier') {
      return { target: callee.property.name, indirect: true, via: callee.object.name + '.' + callee.property.name };
    }
    if (callee.computed && callee.property) {
      const propVal = callee.property.type === 'StringLiteral'
        ? callee.property.value
        : (callee.property.type === 'Literal' && typeof callee.property.value === 'string' ? callee.property.value : null);
      if (propVal) {
        return { target: propVal, indirect: true, via: callee.object.name + "['" + propVal + "']" };
      }
    }
  }
  if (callee.type === 'SequenceExpression' && Array.isArray(callee.expressions) && callee.expressions.length > 0) {
    const last = callee.expressions[callee.expressions.length - 1];
    const resolved = resolveTargetCallee(last);
    if (resolved) return { ...resolved, indirect: true };
  }
  if (callee.type === 'ParenthesizedExpression') {
    return resolveTargetCallee(callee.expression);
  }
  return null;
}

function isStringLikeNode(node) {
  if (!node) return false;
  if (node.type === 'ParenthesizedExpression') return isStringLikeNode(node.expression);
  if (node.type === 'StringLiteral') return true;
  if (node.type === 'Literal' && typeof node.value === 'string') return true;
  if (node.type === 'TemplateLiteral') return true;
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return isStringLikeNode(node.left) || isStringLikeNode(node.right);
  }
  if (node.type === 'ConditionalExpression') {
    return isStringLikeNode(node.consequent) || isStringLikeNode(node.alternate);
  }
  if (node.type === 'LogicalExpression') {
    return isStringLikeNode(node.left) || isStringLikeNode(node.right);
  }
  return false;
}

function scanSource(src, relPath) {
  const ast = parseAst(src, relPath);
  const findings = [];

  // Iterative traversal avoids call-stack limits on deeply nested generated bundles.
  const stack = [ast];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;

    if (node.type === 'CallExpression' || node.type === 'OptionalCallExpression') {
      const resolved = resolveTargetCallee(node.callee);
      if (resolved) {
        const snippet = src.slice(node.start, Math.min(node.start + 120, node.end)).replace(/\s+/g, ' ').trim();
        if (resolved.target === 'eval') {
          findings.push({
            file: relPath,
            line: node.loc ? node.loc.start.line : 0,
            kind: resolved.indirect ? 'indirect-eval' : 'eval',
            snippet,
            signature: normalizeSignature(snippet),
          });
        } else if (resolved.target === 'Function') {
          findings.push({
            file: relPath,
            line: node.loc ? node.loc.start.line : 0,
            kind: 'Function()',
            snippet,
            signature: normalizeSignature(snippet),
          });
        } else if ((resolved.target === 'setTimeout' || resolved.target === 'setInterval')
            && Array.isArray(node.arguments) && isStringLikeNode(node.arguments[0])) {
          findings.push({
            file: relPath,
            line: node.loc ? node.loc.start.line : 0,
            kind: resolved.target + '(string)',
            snippet,
            signature: normalizeSignature(snippet),
          });
        }
      }
    } else if (node.type === 'NewExpression') {
      const resolved = resolveTargetCallee(node.callee);
      if (resolved && resolved.target === 'Function') {
        const snippet = src.slice(node.start, Math.min(node.start + 120, node.end)).replace(/\s+/g, ' ').trim();
        findings.push({
          file: relPath,
          line: node.loc ? node.loc.start.line : 0,
          kind: 'new Function',
          snippet,
          signature: normalizeSignature(snippet),
        });
      }
    }

    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'range'
          || key === 'tokens' || key === 'comments' || key === 'extra') continue;
      const val = node[key];
      if (Array.isArray(val)) {
        for (let i = val.length - 1; i >= 0; i--) {
          if (val[i] && typeof val[i] === 'object') stack.push(val[i]);
        }
      } else if (val && typeof val === 'object') {
        stack.push(val);
      }
    }
  }

  findings.sort((a, b) => a.line - b.line);
  return findings;
}

function collectFiles({ root = ROOT, io = fs, dirs = SOURCE_DIRS, requireHost = true } = {}) {
  const files = new Set();
  const omissions = [];
  const rel = p => toPosix(path.relative(root, p));

  // Root-level modules, sources, and quizzes
  let rootEntries;
  try {
    rootEntries = io.readdirSync(root, { withFileTypes: true });
  } catch (_) {
    omissions.push({ file: '.', reason: 'root directory enumeration failed' });
    return { files: [], omissions };
  }

  for (const entry of rootEntries) {
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
    const isRootTarget = entry.name === 'AlloFlowANTI.txt'
      || /^[^_].*_module\.js$/.test(entry.name)
      || /^[^_].*_source\.jsx$/.test(entry.name)
      || /^quiz_[a-z_]+\.js$/.test(entry.name);
    if (!isRootTarget) continue;
    const full = path.join(root, entry.name);
    if (entry.isSymbolicLink()) {
      omissions.push({ file: rel(full), reason: 'symbolic link is not scanned' });
      continue;
    }
    if (entry.isFile()) files.add(full);
    else omissions.push({ file: rel(full), reason: 'source is not a regular file' });
  }

  if (requireHost) {
    const hostPath = path.join(root, 'AlloFlowANTI.txt');
    if (!files.has(hostPath)) {
      omissions.push({ file: 'AlloFlowANTI.txt', reason: 'mandatory host file AlloFlowANTI.txt is missing' });
    }
  }

  function walkDir(dir) {
    let entries;
    try {
      const st = io.lstatSync(dir);
      if (!st.isDirectory() || st.isSymbolicLink()) {
        omissions.push({ file: rel(dir), reason: 'source directory is not a regular directory' });
        return;
      }
      entries = io.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
      omissions.push({ file: rel(dir), reason: 'directory enumeration failed' });
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || EXCLUDED_DIRS.has(entry.name.toLowerCase())) continue;
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        omissions.push({ file: rel(full), reason: 'symbolic link is not scanned' });
        continue;
      }
      if (entry.isDirectory()) {
        walkDir(full);
      } else if (entry.isFile() && CODE_EXT_RE.test(entry.name)
          && !entry.name.startsWith('_')
          && !/\.(?:test|spec)\.[^.]+$/i.test(entry.name)
          && entry.name !== 'smoke_test.mjs') {
        files.add(full);
      }
    }
  }

  for (const dir of dirs) {
    const abs = path.join(root, dir);
    let exists = false;
    try { io.lstatSync(abs); exists = true; } catch (_) { exists = false; }
    if (!exists) {
      omissions.push({ file: dir, reason: 'required source directory is missing' });
      continue;
    }
    walkDir(abs);
  }

  return { files: [...files].sort(), omissions };
}

function loadBaseline(baselinePath, io = fs) {
  if (!baselinePath) return { accepted: {} };
  const raw = io.readFileSync(baselinePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || !parsed.accepted || typeof parsed.accepted !== 'object') {
    throw new Error('Invalid eval baseline format (missing accepted map)');
  }
  return parsed;
}

function evaluateFindings(findings, baseline) {
  const acceptedMap = (baseline && baseline.accepted) || {};
  const usage = new Map(); // key: `${file}|${kind}|${signature}` -> used count
  const baselined = [];
  const unaccepted = [];

  for (const finding of findings) {
    const entries = Array.isArray(acceptedMap[finding.file]) ? acceptedMap[finding.file] : [];
    const matchEntry = entries.find(e => e.kind === finding.kind && e.signature === finding.signature);
    if (matchEntry) {
      const key = `${finding.file}|${finding.kind}|${finding.signature}`;
      const used = usage.get(key) || 0;
      const maxCount = Number.isInteger(matchEntry.count) ? matchEntry.count : 1;
      if (used < maxCount) {
        usage.set(key, used + 1);
        baselined.push({ ...finding, rationale: matchEntry.rationale || '' });
        continue;
      }
    }
    unaccepted.push(finding);
  }

  // Track baseline entries that are now strictly looser than live code (can be tightened).
  const staleBaseline = [];
  for (const [file, entries] of Object.entries(acceptedMap)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      const key = `${file}|${entry.kind}|${entry.signature}`;
      const used = usage.get(key) || 0;
      const maxCount = Number.isInteger(entry.count) ? entry.count : 1;
      if (used < maxCount) {
        staleBaseline.push({ file, kind: entry.kind, signature: entry.signature, baselined: maxCount, observed: used });
      }
    }
  }

  return { baselined, unaccepted, staleBaseline };
}

function scanRepo({
  root = ROOT,
  io = fs,
  dirs = SOURCE_DIRS,
  requireHost = true,
  baseline = null,
  strict = false,
} = {}) {
  const { files, omissions } = collectFiles({ root, io, dirs, requireHost });
  const findings = [];
  const parseErrors = [];
  let scannedFiles = 0;

  for (const file of files) {
    const rel = toPosix(path.relative(root, file));
    let src;
    try {
      const st = io.lstatSync(file);
      if (!st.isFile() || st.isSymbolicLink()) {
        omissions.push({ file: rel, reason: 'source is not a regular file' });
        continue;
      }
      src = io.readFileSync(file, 'utf8');
    } catch (_) {
      omissions.push({ file: rel, reason: 'source read failed' });
      continue;
    }

    try {
      const fileFindings = scanSource(src, rel);
      findings.push(...fileFindings);
      scannedFiles++;
    } catch (err) {
      parseErrors.push({
        file: rel,
        message: err && err.message ? err.message.split('\n')[0] : 'parse error',
      });
    }
  }

  const { baselined, unaccepted, staleBaseline } = evaluateFindings(findings, baseline);
  const exitCode = (omissions.length > 0 || parseErrors.length > 0)
    ? 2
    : (strict && unaccepted.length > 0 ? 1 : 0);

  return {
    scannedFiles,
    findings,
    baselined,
    unaccepted,
    staleBaseline,
    parseErrors,
    omissions,
    exitCode,
  };
}

function formatReport(result, { quiet = false, verbose = false, strict = false, write = console.log } = {}) {
  const showHeader = !quiet || result.parseErrors.length > 0 || result.omissions.length > 0
    || (strict && result.unaccepted.length > 0);

  if (showHeader) {
    write('');
    write('╔══════════════════════════════════════════════════════════════════════╗');
    write('║   eval() / Function() / String-Timer AST Security Scan               ║');
    write('╚══════════════════════════════════════════════════════════════════════╝');
    write('  Files scanned:          ' + result.scannedFiles);
    write('  Total sites:            ' + result.findings.length);
    write('  Baselined (known):      ' + result.baselined.length);
    write('  Unaccepted (new/drift): ' + result.unaccepted.length);
    if (result.parseErrors.length > 0) write('  Parse errors:           ' + result.parseErrors.length);
    if (result.omissions.length > 0) write('  Incomplete/omissions:   ' + result.omissions.length);
    write('');
  }

  if (result.omissions.length > 0) {
    write('═══ ✗ INCOMPLETE SCAN (' + result.omissions.length + ') ═══');
    for (const o of result.omissions) write('  ✗ ' + o.file + ': ' + o.reason);
    write('');
  }

  if (result.parseErrors.length > 0) {
    write('═══ ✗ PARSE ERRORS — FAIL CLOSED (' + result.parseErrors.length + ') ═══');
    for (const p of result.parseErrors) write('  ✗ ' + p.file + ': ' + p.message);
    write('');
  }

  if (result.unaccepted.length > 0) {
    write('═══ ' + (strict ? '❌ UNACCEPTED' : '⚠ UNACCEPTED') + ' EVAL / FUNCTION SITES (' + result.unaccepted.length + ') ═══');
    for (const f of result.unaccepted.slice(0, verbose ? undefined : 30)) {
      write('  ' + (strict ? '✗' : '⚠') + ' ' + f.file + ':' + f.line + '  [' + f.kind + ']');
      write('      ' + f.snippet);
    }
    if (!verbose && result.unaccepted.length > 30) {
      write('  (... ' + (result.unaccepted.length - 30) + ' more; re-run with --verbose)');
    }
    write('');
  }

  if (verbose && result.baselined.length > 0) {
    write('═══ ✓ BASELINED SITES (' + result.baselined.length + ') ═══');
    for (const f of result.baselined) {
      write('  ✓ ' + f.file + ':' + f.line + '  [' + f.kind + '] ' + f.signature);
      if (f.rationale) write('      rationale: ' + f.rationale);
    }
    write('');
  }

  if (result.exitCode === 2) {
    write('  ❌ eval scan incomplete (parse errors or omissions) — failing closed.');
    write('');
  } else if (result.exitCode === 1) {
    write('  ❌ ' + result.unaccepted.length + ' unaccepted eval/Function/timer-string site(s) in --strict mode.');
    write('');
  } else if (!quiet) {
    write('  ✅ eval scan passed (' + result.scannedFiles + ' files, ' + result.baselined.length + ' baselined, ' + result.unaccepted.length + ' unaccepted).');
    if (result.staleBaseline.length > 0) {
      write('  ℹ ' + result.staleBaseline.length + ' baseline entry/entries can be tightened.');
    }
    write('');
  }
}

function main(args = process.argv.slice(2), deps = {}) {
  const io = deps.io || fs;
  const root = deps.root || ROOT;
  const write = deps.write || console.log;
  const errorWrite = deps.error || console.error;

  let strict = false;
  let verbose = false;
  let quiet = false;
  let noBaseline = false;
  let baselinePath = deps.baselinePath || DEFAULT_BASELINE_PATH;

  for (const arg of args) {
    if (arg === '--strict') strict = true;
    else if (arg === '--verbose') verbose = true;
    else if (arg === '--quiet') quiet = true;
    else if (arg === '--no-baseline') noBaseline = true;
    else if (arg.startsWith('--baseline=')) baselinePath = path.resolve(root, arg.slice('--baseline='.length));
    else {
      errorWrite('Unknown option: ' + arg + '\nUsage: node dev-tools/check_eval.cjs [--strict] [--no-baseline] [--baseline=<path>] [--verbose] [--quiet]');
      return 2;
    }
  }

  let baseline = null;
  if (!noBaseline) {
    try {
      baseline = loadBaseline(baselinePath, io);
    } catch (err) {
      errorWrite('Failed to load eval baseline at ' + baselinePath + ': ' + err.message);
      return 2;
    }
  }

  const result = scanRepo({ root, io, baseline, strict });
  formatReport(result, { quiet, verbose, strict, write });
  return result.exitCode;
}

module.exports = {
  SOURCE_DIRS,
  DEFAULT_BASELINE_PATH,
  normalizeSignature,
  parseAst,
  scanSource,
  collectFiles,
  loadBaseline,
  evaluateFindings,
  scanRepo,
  formatReport,
  main,
};

if (require.main === module) {
  process.exitCode = main();
}
