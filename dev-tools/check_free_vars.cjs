#!/usr/bin/env node
/*
 * check_free_vars.cjs (2026-06-21) — catch undeclared-identifier (free variable) bugs that parse fine
 * but throw ReferenceError at runtime. Born from the `blendedInitial is not defined` fatal crash: a
 * `const blendedInitial` was renamed to `governingInitial`, but one reference inside a setState callback
 * still read `blendedInitial`. esbuild parsed it (valid identifier), the render-ref gate didn't scan it
 * (it's a free var in a callback, not a hook dep array), and the string-anti-drift tests didn't execute
 * it — so it shipped and crashed the whole app on every baseline audit.
 *
 * Strategy: esbuild-transform the JSX source to plain JS, parse with acorn, scope-analyze with
 * eslint-scope, and report any reference at module scope that resolves to NOTHING (not a declaration,
 * not a parameter, not a known runtime global). Those are almost always typos/rename-danglers.
 *
 * These source files are EXTRACTED FRAGMENTS that receive deps (React hooks, warnLog, lucide icons,
 * shared constants) from the host wrapper, so many identifiers read as "free" in isolation — that's the
 * injection contract, not a bug. To separate signal from noise we baseline the current known-free set
 * (dev-tools/free_vars_baseline.json) and FAIL only on names that are NOT baselined and NOT a runtime
 * global — i.e. a NEWLY introduced dangler (the blendedInitial case). Regenerate the baseline with
 * `--update` after an intentional change to the injection contract.
 *
 * Usage: node dev-tools/check_free_vars.cjs [--update] [file1.jsx ...]   (defaults to the big sources)
 * Exits 1 if any NEW (non-baselined) free variable is found.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const acorn = require('acorn');
const eslintScope = require('eslint-scope');

// Transform JSX → plain JS via the esbuild CLI (it isn't reliably require()-able here, but `npx esbuild`
// is what the rest of the toolchain uses). Reads from stdin, writes JS to stdout.
const jsxToJs = (src) => execSync('npx esbuild --loader=jsx --format=cjs', { input: src, maxBuffer: 64 * 1024 * 1024 }).toString();

// Browser + JS built-in globals that legitimately appear unresolved (the runtime provides them).
const KNOWN_GLOBALS = new Set([
  'window', 'document', 'navigator', 'location', 'history', 'console', 'globalThis', 'self',
  'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Map', 'Set',
  'WeakMap', 'WeakSet', 'Promise', 'Symbol', 'Proxy', 'Reflect', 'Error', 'TypeError', 'RangeError',
  'Function', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent',
  'encodeURI', 'decodeURI', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame', 'queueMicrotask', 'structuredClone',
  'fetch', 'Request', 'Response', 'Headers', 'AbortController', 'AbortSignal', 'FormData', 'Blob', 'File',
  'FileReader', 'URL', 'URLSearchParams', 'TextEncoder', 'TextDecoder', 'atob', 'btoa',
  'Uint8Array', 'Uint8ClampedArray', 'Int8Array', 'Uint16Array', 'Int16Array', 'Uint32Array', 'Int32Array',
  'Float32Array', 'Float64Array', 'ArrayBuffer', 'DataView', 'BigInt', 'Intl', 'performance', 'crypto',
  'DOMParser', 'XMLSerializer', 'Node', 'Element', 'HTMLElement', 'Image', 'Audio', 'Event', 'CustomEvent',
  'KeyboardEvent', 'MouseEvent', 'SpeechSynthesisUtterance', 'speechSynthesis',
  'MutationObserver', 'IntersectionObserver', 'ResizeObserver', 'getComputedStyle', 'matchMedia',
  'MediaRecorder', 'MediaStream', 'MediaSource',
  'localStorage', 'sessionStorage', 'indexedDB', 'alert', 'confirm', 'prompt', 'btoa', 'AudioContext',
  'React', 'ReactDOM', 'process', 'require', 'module', 'exports', '__dirname', '__filename', 'Buffer',
  'WebSocket', 'Worker', 'Notification', 'CanvasRenderingContext2D', 'Path2D', 'OffscreenCanvas',
  'webkitAudioContext', 'speechSynthesis', 'SpeechSynthesisUtterance', 'ClipboardItem', 'arguments',
  'RTCPeerConnection', 'RTCSessionDescription', 'RTCIceCandidate',
]);

const args = process.argv.slice(2);
const UPDATE = args.includes('--update');
const files = args.filter((a) => a !== '--update');
if (!files.length) files.push('doc_pipeline_source.jsx', 'view_pdf_audit_source.jsx', 'gemini_api_source.jsx', 'immersive_reader_source.jsx');

const BASELINE_PATH = path.resolve(__dirname, 'free_vars_baseline.json');
const baseline = (!UPDATE && fs.existsSync(BASELINE_PATH)) ? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) : {};
const newBaseline = {};
let totalBad = 0;
for (const rel of files) {
  const file = path.resolve(process.cwd(), rel);
  if (!fs.existsSync(file)) { console.error('  ! missing: ' + rel); continue; }
  const src = fs.readFileSync(file, 'utf8');
  let js;
  try {
    js = jsxToJs(src);
  } catch (e) { console.error('  ! esbuild failed for ' + rel + ': ' + e.message); totalBad++; continue; }

  let ast;
  try {
    ast = acorn.parse(js, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true, ranges: true, locations: true });
  } catch (e) { console.error('  ! acorn parse failed for ' + rel + ': ' + e.message); totalBad++; continue; }

  const scopeManager = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'script', ignoreEval: true });

  // Collect every unresolved reference (the identifier resolved to no declaration in any enclosing scope).
  const bad = new Map(); // name -> count
  const visit = (scope) => {
    for (const ref of scope.references) {
      if (ref.resolved) continue;
      const name = ref.identifier.name;
      if (KNOWN_GLOBALS.has(name)) continue;
      bad.set(name, (bad.get(name) || 0) + 1);
    }
    scope.childScopes.forEach(visit);
  };
  visit(scopeManager.globalScope);

  // Record EVERY free name for the (potentially regenerated) baseline.
  newBaseline[rel] = [...bad.keys()].sort();

  // A finding is actionable only if it is NOT in the file's baseline (the known injection contract).
  const allow = new Set(baseline[rel] || []);
  const fresh = [...bad.entries()].filter(([name]) => !allow.has(name));
  if (fresh.length) {
    console.error('\n  ✗ ' + rel + ': ' + fresh.length + ' NEW undeclared identifier(s) — not in the injection-contract baseline (likely a rename-dangler / typo that throws ReferenceError at runtime):');
    for (const [name, n] of fresh.sort((a, b) => b[1] - a[1])) {
      console.error('      ' + name + '  (×' + n + ')');
      totalBad++;
    }
  } else {
    console.log('  ✓ ' + rel + ': no NEW free variables (' + bad.size + ' baselined injection-contract names)');
  }
}

if (UPDATE) {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(newBaseline, null, 2) + '\n');
  console.log('check_free_vars: baseline updated → ' + path.relative(process.cwd(), BASELINE_PATH));
  process.exit(0);
}
if (totalBad) {
  console.error('\ncheck_free_vars: ' + totalBad + ' NEW undeclared identifier(s) — these throw ReferenceError at runtime. Fix, or (if an intentional contract change) re-baseline with `node dev-tools/check_free_vars.cjs --update`.');
  process.exit(1);
}
console.log('check_free_vars: all clean (no new free variables vs baseline).');
