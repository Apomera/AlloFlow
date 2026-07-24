#!/usr/bin/env node
// Browser-strict syntax check for AlloFlow .js files.
//
// node --check passes files through CommonJS's implicit module-function
// wrapping, which legalizes top-level `return`, top-level `await`, etc.
// Browsers parsing the file as a <script> do NOT do that wrapping, so a
// file that "passes node --check" can still fail in the browser with:
//   SyntaxError: Illegal return statement
//   SyntaxError: await is only valid in async functions
//
// This script catches that class of bug by parsing with `new Function(src)`
// which uses script-mode parsing (no implicit wrapper).
//
// Usage:
//   node _dev/browser_strict_check.cjs                    # check defaults
//   node _dev/browser_strict_check.cjs --json             # JSON output
//   node _dev/browser_strict_check.cjs <file> <file>...   # check specific files
//   node _dev/browser_strict_check.cjs --all              # whole repo (slow-ish)
//
// Exit code: 0 if all clean, 1 if any failures (suitable as CI / pre-deploy gate).

const fs = require('fs');
const path = require('path');

// Auto-chdir to project root (this file lives in _dev/)
process.chdir(path.resolve(__dirname, '..'));

const args = process.argv.slice(2);
const JSON_OUTPUT = args.includes('--json');
const ALL = args.includes('--all');
const explicitFiles = args.filter(a => !a.startsWith('--'));

// Default scan set: production-deployed JS surfaces.
// Excludes: lang/ (data files, not executed in browser context the same way),
// desktop/web-app/ (mirror), node_modules/, _dev/, tests/.
const DEFAULT_DIRS = ['stem_lab', 'sel_hub'];
const DEFAULT_ROOT_FILES = (() => {
  if (!fs.existsSync('.')) return [];
  return fs.readdirSync('.').filter(f =>
    f.endsWith('.js') &&
    !f.startsWith('_') &&
    !['package.json', 'package-lock.json'].includes(f) &&
    fs.statSync(f).isFile()
  );
})();

function collectFiles() {
  if (explicitFiles.length > 0) return explicitFiles.filter(f => fs.existsSync(f));
  if (ALL) {
    const out = [];
    function walk(dir) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (['node_modules', '_dev', 'tests', '.git', 'desktop/web-app', '_archive', 'cloudflare-worker'].includes(entry.name)) continue;
          walk(full);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          out.push(full);
        }
      }
    }
    walk('.');
    return out;
  }
  // Default
  const out = [...DEFAULT_ROOT_FILES];
  for (const dir of DEFAULT_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir)) {
      if (entry.endsWith('.js')) out.push(path.join(dir, entry));
    }
  }
  return out;
}

// Files we expect to fail browser-strict parsing because they aren't
// loaded as <script> by browsers. The script auto-detects most cases
// (shebang, bare-object data files, ES-module configs) but a few
// patterns are worth naming explicitly.
const KNOWN_NON_BROWSER = new Set([
  'vitest.config.js',
  // Add here as more discovered.
]);

function classifyNonBrowser(src, filePath) {
  // Shebang → Node CLI tool
  if (src.startsWith('#!')) return 'shebang (Node CLI)';
  // Bare object literal at start → JSON-ish data file loaded via fetch+eval
  // (typical pattern: file begins with `{` after optional comments)
  const stripped = src.replace(/^(\s*\/\/[^\n]*\n|\s*\/\*[\s\S]*?\*\/|\s*\n)+/, '').trimStart();
  if (stripped.startsWith('{') || stripped.startsWith('[')) return 'data file (bare object/array literal)';
  // ES module syntax at top level
  if (/^\s*import\s+/m.test(src.slice(0, 500)) || /^\s*export\s+/m.test(src.slice(0, 500))) return 'ES module';
  // Explicit known
  if (KNOWN_NON_BROWSER.has(path.basename(filePath))) return 'known non-browser config';
  return null;
}

function checkFile(filePath) {
  let src;
  try {
    src = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return { file: filePath, ok: false, error: 'Read failed: ' + e.message };
  }
  const nonBrowserReason = classifyNonBrowser(src, filePath);
  if (nonBrowserReason) {
    return { file: filePath, ok: true, skipped: nonBrowserReason };
  }
  try {
    // Function constructor parses as script-mode (no CommonJS wrapper).
    // This is what the browser does for <script src="..."> files.
    new Function(src);
    return { file: filePath, ok: true };
  } catch (e) {
    // Try to derive a line number from the error if available.
    // The Function constructor's error often has a stack trace with a line offset of 2
    // (because the function header is implicit).
    let lineHint = '';
    if (e.stack) {
      const match = e.stack.match(/<anonymous>:(\d+):(\d+)/);
      if (match) {
        // Function constructor adds 2 lines (function () {  ... })
        const reportedLine = parseInt(match[1], 10);
        const sourceLine = Math.max(1, reportedLine - 2);
        lineHint = ` (approx source line ${sourceLine})`;
      }
    }
    return {
      file: filePath,
      ok: false,
      error: e.message + lineHint,
      kind: classifyError(e.message)
    };
  }
}

function classifyError(msg) {
  if (/Illegal return statement/i.test(msg)) return 'illegal-return';
  if (/await is only valid in async/i.test(msg)) return 'top-level-await';
  if (/'super' keyword is only allowed/i.test(msg)) return 'top-level-super';
  if (/Identifier .* has already been declared/i.test(msg)) return 'duplicate-decl';
  if (/Unexpected token/i.test(msg)) return 'syntax-error';
  if (/Unexpected end of input/i.test(msg)) return 'unbalanced-braces';
  return 'other';
}

const files = collectFiles();
const results = files.map(checkFile);
const failures = results.filter(r => !r.ok);
const skipped = results.filter(r => r.ok && r.skipped);
const passed = results.filter(r => r.ok && !r.skipped);

if (JSON_OUTPUT) {
  console.log(JSON.stringify({
    checked: files.length,
    passed: passed.length,
    skipped: skipped.length,
    failed: failures.length,
    failures,
    skippedFiles: skipped.map(s => ({ file: s.file, reason: s.skipped }))
  }, null, 2));
  process.exit(failures.length > 0 ? 1 : 0);
}

// Human-readable output
console.log('═══════════════════════════════════════════════════════════════════');
console.log(' Browser-strict syntax check (catches what node --check misses)');
console.log('═══════════════════════════════════════════════════════════════════');
console.log(` Scan set: ${explicitFiles.length > 0 ? 'explicit files' : ALL ? 'all .js (excl _dev/tests/node_modules/deploy)' : 'production surfaces (root + stem_lab/ + sel_hub/)'}`);
console.log(` Files checked: ${files.length}`);
console.log(` Passed:        ${passed.length}`);
console.log(` Skipped:       ${skipped.length} (non-browser: shebang CLI / data files / ES modules)`);
console.log(` Failed:        ${failures.length}`);
console.log('───────────────────────────────────────────────────────────────────');

if (failures.length === 0) {
  console.log(' ✓ All files parse cleanly under browser-strict mode.');
  process.exit(0);
}

console.log('');
// Group by error kind
const byKind = {};
for (const f of failures) {
  byKind[f.kind] = byKind[f.kind] || [];
  byKind[f.kind].push(f);
}
for (const [kind, list] of Object.entries(byKind)) {
  console.log(`\n● ${kind.toUpperCase()} (${list.length})`);
  for (const f of list) {
    console.log(`   📄 ${f.file}`);
    console.log(`      ${f.error}`);
  }
}

console.log('');
console.log('───────────────────────────────────────────────────────────────────');
console.log(' These files will fail to load in the browser.');
console.log(' node --check missed them because of CommonJS module-function wrapping.');
console.log(' Recommend: gate deploys on this script (exit 1 above blocks).');
console.log('═══════════════════════════════════════════════════════════════════');
process.exit(1);
