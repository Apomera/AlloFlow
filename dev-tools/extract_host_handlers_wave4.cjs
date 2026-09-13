#!/usr/bin/env node
'use strict';

// Wave 4 (2026-09-13): append to host_handlers_module.js (created by wave 3) the
// useCallback-wrapped handlers of AlloFlowContent plus the plain handlers between
// the wave-3 threshold and 900 bytes. Same analysis and the same exclusion rules
// as dev-tools/extract_host_handlers_wave3.cjs (read that header first).
//
// useCallback handlers keep their exact semantics: the host shim is
//   const name = useCallback((...__a) => _alloHostHandlers().name(...__a), <deps verbatim>);
// The shim is re-created only when its deps change (as before) and captures the
// dispatcher of THAT render, whose getter object reads THAT render's bindings —
// which is exactly what the original callback captured, staleness included.
// Inside the module, every reference to a useCallback handler (its own name
// included) goes through `__d.name`, i.e. the host's useCallback value, so
// identity and staleness are preserved for callers too. Plain handlers moved in
// this wave call each other directly (per-render either way); references to
// handlers moved in wave 3 already resolve through `__d.name` (the host shim).
//
// Usage: node dev-tools/extract_host_handlers_wave4.cjs [--dry-run] [--min=BYTES]
// Idempotent: the manifest records the wave.

const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const ROOT = path.resolve(__dirname, '..');
const HOST = path.join(ROOT, 'AlloFlowANTI.txt');
const BUILDER = path.join(ROOT, '_build_first_wave_view_modules.js');
const MANIFEST = path.join(__dirname, 'host_handlers_wave3_manifest.json');
const MODULE_KEY = 'HostHandlers';
const SOURCE_FILE = 'host_handlers_source.jsx';
const OUTPUT_FILE = 'host_handlers_module.js';
// --wave=N stamps the manifest so a wave never re-applies; wave 5 (2026-09-13) reran this
// same extractor at --min=400 for the remaining small handlers.
const WAVE = Number((process.argv.find(a => a.startsWith('--wave=')) || '--wave=4').slice(7));

const DRY = process.argv.includes('--dry-run');
const MIN = Number((process.argv.find(a => a.startsWith('--min=')) || '--min=900').slice(6));
// --exclude-tested: skip any handler whose name appears in a test file. 415 test files read the
// host as text and some slice a handler out and execute it; moving those bodies would turn
// each such test into a `_alloHostHandlers is not defined` failure (wave 5 lesson, 2026-09-13).
const EXCLUDE_TESTED = process.argv.includes('--exclude-tested');
const TESTED_NAMES = (() => {
  if (!EXCLUDE_TESTED) return null;
  const dir = path.join(ROOT, 'tests');
  const files = fs.readdirSync(dir).filter(f => /\.test\.(js|mjs|ts)$/.test(f));
  return files.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
})();
const mentionedInTests = (name) => TESTED_NAMES !== null && new RegExp('(^|[^\\w$])' + name.replace(/\$/g, '\\$') + '(?![\\w$])').test(TESTED_NAMES);

const GLOBALS = new Set([
  'Array', 'Blob', 'Boolean', 'CustomEvent', 'Date', 'Error', 'JSON', 'Map', 'Math', 'NaN', 'Number',
  'Object', 'Promise', 'React', 'Set', 'String', 'URL', 'Infinity', 'RegExp', 'Symbol', 'clearInterval',
  'clearTimeout', 'console', 'document', 'navigator', 'parseFloat', 'parseInt', 'requestAnimationFrame',
  'cancelAnimationFrame', 'setInterval', 'setTimeout', 'undefined', 'window', 'localStorage',
  'sessionStorage', 'encodeURIComponent', 'decodeURIComponent', 'isNaN', 'isFinite', 'Intl', 'fetch',
  'alert', 'confirm', 'prompt', 'location', 'history', 'performance', 'atob', 'btoa', 'Event',
  'KeyboardEvent', 'MouseEvent', 'HTMLElement', 'Element', 'Node', 'AbortController', 'FileReader',
  'File', 'Image', 'Audio', 'URLSearchParams', 'TextEncoder', 'TextDecoder', 'structuredClone',
  'queueMicrotask', 'getComputedStyle', 'indexedDB', 'crypto', 'TypeError', 'RangeError', 'globalThis',
  'FormData', 'Headers', 'Request', 'Response', 'MutationObserver', 'ResizeObserver',
  'IntersectionObserver', 'DOMParser', 'XMLSerializer', 'Uint8Array', 'ArrayBuffer',
  'SpeechSynthesisUtterance', 'speechSynthesis', 'AudioContext', 'webkitAudioContext', 'MediaRecorder',
  'devicePixelRatio', 'innerWidth', 'innerHeight', 'screen', 'scrollTo', 'open', 'requestIdleCallback',
  'cancelIdleCallback', 'Float32Array', 'Int16Array', 'Uint16Array', 'Uint32Array', 'DataView',
  'ImageData', 'OffscreenCanvas', 'HTMLCanvasElement', 'HTMLInputElement', 'WebSocket', 'Worker',
  'RTCPeerConnection', 'MediaStream', 'Notification', 'escape', 'unescape', 'Reflect', 'Proxy',
  'WeakMap', 'WeakSet', 'BigInt', 'SyntaxError', 'ReferenceError', 'EvalError', 'URIError',
  'AggregateError', 'matchMedia', 'top', 'parent', 'self', 'frames', 'arguments',
  'eval', 'Function', 'ClipboardItem', 'Path2D', 'DOMRect', 'Range', 'Selection', 'NodeFilter',
  'CSS', 'AbortSignal', 'BroadcastChannel', 'MessageChannel', 'PerformanceObserver', 'XMLHttpRequest',
  'HTMLVideoElement', 'HTMLAudioElement', 'HTMLImageElement', 'HTMLTextAreaElement', 'HTMLSelectElement',
  'SVGElement', 'Text', 'Comment', 'DocumentFragment', 'ShadowRoot', 'EventTarget', 'Touch', 'TouchEvent',
  'PointerEvent', 'FocusEvent', 'InputEvent', 'DragEvent', 'WheelEvent', 'ErrorEvent', 'PromiseRejectionEvent',
  'MessageEvent', 'StorageEvent', 'PopStateEvent', 'HashChangeEvent', 'CustomElementRegistry',
  'customElements', 'speechSynthesisUtterance', 'webkitSpeechRecognition', 'SpeechRecognition', 'process',
]);

const ASYNC_CALLEES = new Set([
  'useEffect', 'useLayoutEffect', 'useCallback', 'useImperativeHandle', 'useInsertionEffect',
  'setTimeout', 'setInterval', 'requestAnimationFrame', 'requestIdleCallback', 'addEventListener',
  'removeEventListener', 'queueMicrotask', 'then', 'catch', 'finally', 'on', 'once', 'off', 'subscribe',
  'unsubscribe', 'listen', 'addListener', 'removeListener', 'observe', 'register', 'defineProperty',
  'defineProperties', 'push', 'unshift', 'set', 'add',
]);
const isAsyncCallee = (callee) => {
  if (!callee) return false;
  const name = callee.type === 'Identifier' ? callee.name
    : (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier') ? callee.property.name
      : null;
  if (!name) return false;
  if (ASYNC_CALLEES.has(name)) return true;
  return /^set[A-Z]/.test(name);
};
const sha8 = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
const isFnNode = (n) => n && /^(ArrowFunctionExpression|FunctionExpression|FunctionDeclaration|ObjectMethod|ClassMethod|ClassPrivateMethod)$/.test(n.type);

function syncExecuted(fnPath) {
  const parent = fnPath.parentPath;
  if (!parent) return false;
  const p = parent.node;
  if ((p.type === 'CallExpression' || p.type === 'NewExpression') && p.callee === fnPath.node) return true;
  if ((p.type === 'CallExpression' || p.type === 'NewExpression') && p.arguments.includes(fnPath.node)) return !isAsyncCallee(p.callee);
  if (p.type === 'JSXExpressionContainer' && parent.parentPath && parent.parentPath.node.type === 'JSXAttribute'
      && parent.parentPath.node.name && parent.parentPath.node.name.name === 'ref') return true;
  // An effect's cleanup runs synchronously in a later commit (and at mount under StrictMode):
  // both `useEffect(() => { return () => {...}; })` and the concise `useEffect(() => () => {...})`.
  const isEffectCall = (node) => {
    if (!node || node.type !== 'CallExpression') return false;
    const c = node.callee; const n = c.type === 'Identifier' ? c.name : (c.property && c.property.name);
    return /^use(Layout|Insertion)?Effect$/.test(n || '');
  };
  if (p.type === 'ReturnStatement') {
    const enclosing = fnPath.findParent(x => isFnNode(x.node));
    if (enclosing && enclosing.parentPath && isEffectCall(enclosing.parentPath.node)) return true;
  }
  if (p.type === 'ArrowFunctionExpression' && p.body === fnPath.node && parent.parentPath && isEffectCall(parent.parentPath.node)) return true;
  return false;
}

function syncInvokedNames(rootPath) {
  const names = new Set();
  const rootNode = rootPath.node;
  const enclosingAllSync = (p) => {
    let cur = p.parentPath;
    while (cur && cur.node !== rootNode) {
      if (isFnNode(cur.node)) { if (!syncExecuted(cur)) return false; }
      cur = cur.parentPath;
    }
    return true;
  };
  rootPath.traverse({
    CallExpression(cp) {
      if (!enclosingAllSync(cp)) return;
      const c = cp.node.callee;
      if (c.type === 'Identifier') names.add(c.name);
      else if (c.type === 'MemberExpression' && !c.computed && c.property.type === 'Identifier') names.add(c.property.name);
      if (!isAsyncCallee(c)) for (const a of cp.node.arguments) if (a.type === 'Identifier') names.add(a.name);
    },
    NewExpression(np) {
      if (!enclosingAllSync(np)) return;
      const c = np.node.callee; if (c.type === 'Identifier') names.add(c.name);
      for (const a of np.node.arguments) if (a.type === 'Identifier') names.add(a.name);
    },
    TaggedTemplateExpression(tp) { if (enclosingAllSync(tp) && tp.node.tag.type === 'Identifier') names.add(tp.node.tag.name); },
    JSXOpeningElement(jp) {
      if (!enclosingAllSync(jp)) return;
      const n = jp.node.name; if (n.type === 'JSXIdentifier') names.add(n.name);
      else if (n.type === 'JSXMemberExpression') { let o = n; while (o.type === 'JSXMemberExpression') o = o.object; if (o.type === 'JSXIdentifier') names.add(o.name); }
    },
  });
  return names;
}

function renderNamesFromFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  let ast;
  try { ast = parser.parse(src, { sourceType: 'unambiguous', plugins: ['jsx'], errorRecovery: true, allowReturnOutsideFunction: true }); }
  catch (e) { console.warn('  (skip ' + path.basename(file) + ': ' + e.message.split('\n')[0] + ')'); return new Set(); }
  const names = new Set();
  const isRenderRoot = (fp) => {
    let jsx = false;
    fp.traverse({ JSXElement() { jsx = true; }, CallExpression(cp) { const c = cp.node.callee; if (c.type === 'MemberExpression' && c.property.name === 'createElement') jsx = true; } });
    if (jsx) return true;
    const p = fp.parentPath && fp.parentPath.node;
    if (p && p.type === 'CallExpression' && p.arguments.includes(fp.node)) {
      const c = p.callee; const n = c.type === 'Identifier' ? c.name : (c.property && c.property.name);
      if (n === 'useMemo' || n === 'useState' || n === 'useReducer') return true;
    }
    return false;
  };
  traverse(ast, { Function(fp) { if (isRenderRoot(fp)) for (const n of syncInvokedNames(fp)) names.add(n); } });
  return names;
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  if ((manifest.waves || []).includes(WAVE)) { console.log(`Wave ${WAVE} is already applied.`); return; }
  const source = fs.readFileSync(HOST, 'utf8');
  const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
  let compPath = null;
  traverse(ast, { VariableDeclarator(p) { if (p.node.id.name === 'AlloFlowContent') compPath = p.get('init'); } });
  if (!compPath) throw new Error('AlloFlowContent not found');
  const bodyPaths = compPath.get('body.body');
  const alreadyMoved = new Set(manifest.handlers);

  // ---- 1. Function-valued declarations.
  const fnByName = new Map();
  for (const sp of bodyPaths) {
    const n = sp.node;
    if (n.type === 'FunctionDeclaration' && n.id) fnByName.set(n.id.name, { fnPath: sp, stmtPath: sp, kind: 'function' });
    else if (n.type === 'VariableDeclaration' && n.declarations.length === 1 && n.declarations[0].id.type === 'Identifier') {
      const d = sp.get('declarations.0'); const init = d.node.init; if (!init) continue;
      if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') fnByName.set(d.node.id.name, { fnPath: d.get('init'), stmtPath: sp, kind: n.kind });
      else if (init.type === 'CallExpression' && init.arguments.length && isFnNode(init.arguments[0])) {
        const c = init.callee; const cn = c.type === 'Identifier' ? c.name : (c.property && c.property.name);
        if (/^use(Callback|Memo)$/.test(cn || '') || cn === 'memo' || cn === 'forwardRef') {
          fnByName.set(d.node.id.name, { fnPath: d.get('init.arguments.0'), stmtPath: sp, kind: 'hook:' + cn, hookCall: init, hookCalleeText: source.slice(c.start, c.end), constKind: n.kind });
        }
      }
    }
  }

  // ---- 2. Render-time / effect-time / window-exposed names (transitive).
  const R = new Set(syncInvokedNames(compPath));
  const ctxSource = path.join(ROOT, 'allo_command_context_source.js');
  if (fs.existsSync(ctxSource)) {
    const cast = parser.parse(fs.readFileSync(ctxSource, 'utf8'), { sourceType: 'script' });
    traverse(cast, { FunctionDeclaration(fp) { if (fp.node.id.name === 'buildAlloCommandContext') for (const n of syncInvokedNames(fp)) R.add(n); } });
  }
  const rootFiles = fs.readdirSync(ROOT);
  const sourceFiles = rootFiles.filter(f => /_source\.jsx$/.test(f));
  const compiledOnly = rootFiles.filter(f => /_module\.js$/.test(f) && !rootFiles.includes(f.replace(/_module\.js$/, '_source.jsx')));
  const t0 = Date.now();
  let RM = 0;
  for (const f of [...sourceFiles, ...compiledOnly]) for (const n of renderNamesFromFile(path.join(ROOT, f))) { if (!R.has(n)) RM += 1; R.add(n); }
  console.log(`scanned ${sourceFiles.length} sources + ${compiledOnly.length} compiled-only modules in ${Date.now() - t0} ms (+${RM} names)`);
  let effectRoots = 0, effectNames = 0, windowNames = 0;
  compPath.traverse({
    CallExpression(cp) {
      const c = cp.node.callee; const n = c.type === 'Identifier' ? c.name : (c.type === 'MemberExpression' && c.property.name);
      if (!/^use(Layout|Insertion)?Effect$/.test(n || '')) return;
      const arg = cp.get('arguments.0'); if (!arg || !isFnNode(arg.node)) return;
      effectRoots += 1;
      for (const name of syncInvokedNames(arg)) if (!R.has(name)) { R.add(name); effectNames += 1; }
      // ANY reference inside an effect body, at any depth, disqualifies a handler: a mount-time
      // effect reaches timers, listeners, promise chains and locally declared helpers before any
      // CDN module has landed (2026-09-13: executeRoleSelect threw from a setTimeout in the
      // role-restore effect; clearCanvasWorkspaceState from a helper declared in the Canvas boot
      // recovery effect). Pinned by tests/host_handlers_wave3_extraction.test.js.
      arg.traverse({ Identifier(ip) { const n = ip.node.name; if (fnByName.has(n) && !R.has(n)) { R.add(n); effectNames += 1; } } });
    },
    AssignmentExpression(ap) {
      let obj = ap.node.left; while (obj && obj.type === 'MemberExpression') obj = obj.object;
      if (!obj || obj.type !== 'Identifier' || !/^(window|globalThis|self)$/.test(obj.name)) return;
      ap.get('right').traverse({ Identifier(ip) { if (fnByName.has(ip.node.name) && !R.has(ip.node.name)) { R.add(ip.node.name); windowNames += 1; } } });
      if (ap.node.right.type === 'Identifier' && fnByName.has(ap.node.right.name) && !R.has(ap.node.right.name)) { R.add(ap.node.right.name); windowNames += 1; }
    },
  });
  console.log(`effect roots: ${effectRoots} (+${effectNames} names); window-exposed: +${windowNames} names`);
  let grew = true;
  while (grew) {
    grew = false;
    for (const name of Array.from(R)) {
      const entry = fnByName.get(name); if (!entry || entry._done) continue;
      entry._done = true;
      for (const n of syncInvokedNames(entry.fnPath)) if (!R.has(n)) { R.add(n); grew = true; }
    }
  }

  // ---- 3. Candidates: plain (>= MIN) and useCallback-wrapped (>= MIN).
  const candidates = [];
  const excluded = [];
  for (const [name, entry] of fnByName) {
    const stmt = entry.stmtPath.node;
    const text = source.slice(stmt.start, stmt.end);
    const bytes = Buffer.byteLength(text);
    const reject = (reason) => excluded.push({ name, bytes, reason });
    if (alreadyMoved.has(name) || text.includes('_alloHostHandlers().')) continue; // wave-3 shim
    const isHook = entry.kind.startsWith('hook:');
    if (isHook && entry.kind !== 'hook:useCallback') { reject(entry.kind); continue; }
    if (entry.kind === 'let' || entry.kind === 'var' || entry.constKind === 'let' || entry.constKind === 'var') { reject('let/var binding'); continue; }
    if (bytes < MIN) continue;
    if (/^_allo[A-Za-z]*Deps$/.test(name) || name === '_alloCmdCtx' || /^_alloHost/.test(name) || name === '__alloHostDeps') { reject('deps bag / dispatcher'); continue; }
    if (/AlloModules[\s\S]{0,400}module not loaded/.test(text) || (/\bnot loaded\b/.test(text) && /AlloModules/.test(text))) { reject('already a shim'); continue; }
    if (entry.fnPath.node.generator) { reject('generator'); continue; }
    if (/\b(use[A-Z][A-Za-z]*)\s*\(/.test(source.slice(entry.fnPath.node.start, entry.fnPath.node.end))) { reject('calls a hook'); continue; }
    if (R.has(name)) { reject('invoked at render/effect'); continue; }
    if (mentionedInTests(name)) { reject('mentioned in a test file'); continue; }
    if (text.includes('__d') || text.includes('__alloHostDeps')) { reject('name collision'); continue; }
    let ownThis = false;
    entry.fnPath.traverse({
      ThisExpression(tp) {
        let cur = tp.parentPath;
        while (cur && cur.node !== entry.fnPath.node) {
          if (/^(FunctionExpression|FunctionDeclaration|ObjectMethod|ClassMethod|ClassPrivateMethod)$/.test(cur.node.type)) return;
          cur = cur.parentPath;
        }
        if (entry.fnPath.node.type !== 'ArrowFunctionExpression') ownThis = true;
      },
    });
    if (ownThis) { reject('uses its own this'); continue; }
    const esc = name.replace(/\$/g, '\\$');
    const hostOutside = source.slice(0, stmt.start) + source.slice(stmt.end);
    if (new RegExp('\\b' + esc + '\\.[A-Za-z_$][\\w$]*\\s*=[^=]').test(hostOutside)) { reject('host assigns a property on it'); continue; }
    if (new RegExp('\\b' + esc + '\\.length\\b').test(hostOutside)) { reject('host reads its arity'); continue; }
    if (isHook) {
      const args = entry.hookCall.arguments;
      if (args.length > 2) { reject('useCallback with >2 args'); continue; }
      if (args.length === 2 && args[1].type !== 'ArrayExpression') { reject('useCallback deps not a literal array'); continue; }
      entry.depsText = args.length === 2 ? source.slice(args[1].start, args[1].end) : null;
    }
    candidates.push({ name, entry, stmt, text, bytes, isHook });
  }
  candidates.sort((a, b) => a.stmt.start - b.stmt.start);
  const plainNames = new Set(candidates.filter(c => !c.isHook).map(c => c.name));

  // ---- 4. Free vars + rewrites.
  const depNames = new Set();
  const unboundNames = new Set();
  const kept = [];
  for (const c of candidates) {
    const stmtNode = c.stmt;
    const fnNode = c.entry.fnPath.node;
    const rangeStart = c.isHook ? fnNode.start : stmtNode.start;
    const rangeEnd = c.isHook ? fnNode.end : stmtNode.end;
    const edits = []; let bad = null;
    const outside = (b) => !(b.path.node.start >= stmtNode.start && b.path.node.end <= stmtNode.end);
    const viaGetter = (name) => !(plainNames.has(name) && !c.isHook) && !(name === c.name && !c.isHook);
    // A plain candidate: own name + sibling plain candidates stay bare; everything else via __d.
    // A useCallback candidate: everything (own name included) via __d, except sibling plain candidates.
    const target = c.isHook ? c.entry.fnPath : c.entry.stmtPath;
    target.traverse({
      ReferencedIdentifier(ip) {
        const node = ip.node; if (node.type !== 'Identifier') return;
        const name = node.name;
        const b = ip.scope.getBinding(name);
        if (b && !outside(b)) return; // local to the statement
        if (name === c.name && !c.isHook) return;
        if (plainNames.has(name) && name !== c.name) return; // sibling plain handler → module-local
        if (!b && GLOBALS.has(name)) return;
        if (!b) unboundNames.add(name);
        if (!viaGetter(name)) return;
        const parent = ip.parentPath.node;
        if (parent.type === 'ObjectProperty' && parent.shorthand && parent.value === node) edits.push({ start: parent.start, end: parent.end, text: `${name}: __d.${name}` });
        else edits.push({ start: node.start, end: node.end, text: `__d.${name}` });
        depNames.add(name);
      },
      JSXIdentifier(jp) {
        const node = jp.node; const p = jp.parentPath.node;
        const isName = (p.type === 'JSXOpeningElement' || p.type === 'JSXClosingElement') && p.name === node;
        const isMemberRoot = p.type === 'JSXMemberExpression' && p.object === node;
        if (!isName && !isMemberRoot) return;
        if (!/^[A-Z_$]/.test(node.name)) return;
        const name = node.name;
        if (plainNames.has(name) || (name === c.name && !c.isHook)) return;
        const b = jp.scope.getBinding(name);
        if (b && !outside(b)) return;
        if (!b && GLOBALS.has(name)) return;
        if (!b) unboundNames.add(name);
        edits.push({ start: node.start, end: node.end, text: `__d.${name}` });
        depNames.add(name);
      },
      AssignmentExpression(ap) {
        const l = ap.node.left; if (l.type !== 'Identifier') return;
        const b = ap.scope.getBinding(l.name); if (!b || outside(b)) bad = 'assigns outer binding ' + l.name;
      },
      UpdateExpression(up) {
        const a = up.node.argument; if (a.type !== 'Identifier') return;
        const b = up.scope.getBinding(a.name); if (!b || outside(b)) bad = 'updates outer binding ' + a.name;
      },
    });
    if (bad) { excluded.push({ name: c.name, bytes: c.bytes, reason: bad }); continue; }
    const uniq = new Map(); for (const e of edits) uniq.set(e.start + ':' + e.end, e);
    const sorted = Array.from(uniq.values()).sort((a, b) => b.start - a.start);
    let body = source.slice(rangeStart, rangeEnd);
    for (const e of sorted) body = body.slice(0, e.start - rangeStart) + e.text + body.slice(e.end - rangeStart);
    // Web API functions must keep the window receiver: `__d.requestIdleCallback(...)` would be an
    // "Illegal invocation", and the free-vars gate does not know this global — spell it out.
    body = body.replace(/([^.A-Za-z0-9_$])requestIdleCallback\b/g, '$1window.requestIdleCallback');
    const moduleText = c.isHook ? `const ${c.name} = ${body};` : body;
    kept.push({ ...c, moduleText, isAsync: !!fnNode.async, isFunctionDecl: stmtNode.type === 'FunctionDeclaration' });
  }
  // Plain candidates excluded in step 4 are not module-local siblings after all.
  const keptPlain = new Set(kept.filter(k => !k.isHook).map(k => k.name));
  for (const k of kept) {
    for (const pn of plainNames) {
      if (keptPlain.has(pn) || pn === k.name) continue;
      const re = new RegExp('(^|[^\\w$.])(' + pn.replace(/\$/g, '\\$') + ')(?![\\w$])', 'g');
      if (re.test(k.moduleText)) { k.moduleText = k.moduleText.replace(re, (m, pre) => pre + '__d.' + pn); depNames.add(pn); }
    }
  }
  for (const n of keptPlain) depNames.delete(n);
  const hookKept = kept.filter(k => k.isHook).length;
  const totalBytes = kept.reduce((a, k) => a + k.bytes, 0);
  console.log(`candidates kept: ${kept.length} (${hookKept} useCallback, ${kept.length - hookKept} plain; ${totalBytes} bytes); excluded: ${excluded.length}; new getters: ${Array.from(depNames).filter(n => !manifest.deps.includes(n)).length}`);
  if (unboundNames.size) console.log('unbound (routed through __d): ' + Array.from(unboundNames).sort().join(', '));
  const byReason = {}; for (const e of excluded) { if (e.bytes < MIN) continue; const k = e.reason.split(' ').slice(0, 2).join(' '); byReason[k] = (byReason[k] || 0) + 1; }
  console.log('excluded (>= MIN) by reason: ' + JSON.stringify(byReason));
  if (DRY) {
    console.log('\n--- kept ---');
    for (const k of kept) console.log(String(k.bytes).padStart(7), String(k.stmt.loc.start.line).padStart(6), (k.isHook ? 'useCallback ' : k.isFunctionDecl ? 'function ' : 'const ') + k.name + (k.isAsync ? ' (async)' : '') + (k.isHook ? '  deps=' + (k.entry.depsText || '(none)').replace(/\s+/g, ' ').slice(0, 60) : ''));
    console.log('\n--- excluded >= MIN (non-trivial reasons) ---');
    for (const e of excluded.filter(e => e.bytes >= MIN && !/^hook:|deps bag|already a shim/.test(e.reason)).sort((a, b) => b.bytes - a.bytes).slice(0, 60)) console.log(String(e.bytes).padStart(7), e.name.padEnd(48), e.reason);
    return;
  }
  if (!kept.length) throw new Error('nothing to extract');

  // ---- 5. Append to the module source.
  let moduleSource = fs.readFileSync(path.join(ROOT, SOURCE_FILE), 'utf8');
  const retIdx = moduleSource.lastIndexOf('\n  return { ');
  if (retIdx < 0) throw new Error('module return statement not found');
  const retEnd = moduleSource.indexOf(' };\n', retIdx);
  const existingList = moduleSource.slice(retIdx + '\n  return { '.length, retEnd).split(',').map(s => s.trim()).filter(Boolean);
  const newList = existingList.concat(kept.map(k => k.name));
  moduleSource = moduleSource.slice(0, retIdx) + '\n' + kept.map(k => k.moduleText).join('\n') + '\n  return { ' + newList.join(', ') + ' };\n' + moduleSource.slice(retEnd + ' };\n'.length);
  fs.writeFileSync(path.join(ROOT, SOURCE_FILE), moduleSource, 'utf8');

  // ---- 6. Host: shims + regenerated getter prelude.
  let rewritten = source;
  for (const k of kept.slice().sort((a, b) => b.stmt.start - a.stmt.start)) {
    let shim;
    if (k.isHook) {
      const inner = `${k.isAsync ? 'async ' : ''}(...__a) => _alloHostHandlers().${k.name}(...__a)`;
      shim = `const ${k.name} = ${k.entry.hookCalleeText}(${inner}${k.entry.depsText ? ', ' + k.entry.depsText : ''});`;
    } else if (k.isFunctionDecl) {
      shim = `${k.isAsync ? 'async ' : ''}function ${k.name}(...__a) { return _alloHostHandlers().${k.name}(...__a); }`;
    } else {
      shim = `const ${k.name} = ${k.isAsync ? 'async ' : ''}(...__a) => _alloHostHandlers().${k.name}(...__a);`;
    }
    rewritten = rewritten.slice(0, k.stmt.start) + shim + rewritten.slice(k.stmt.end);
  }
  const preludeStart = rewritten.indexOf('  const __alloHostDeps = {\n');
  const preludeEnd = rewritten.indexOf('\n  };\n', preludeStart) + '\n  };\n'.length;
  if (preludeStart < 0) throw new Error('getter prelude not found');
  const existingGetters = Array.from(rewritten.slice(preludeStart, preludeEnd).matchAll(/get ([A-Za-z_$][\w$]*)\(\) \{ return \1; \}/g), m => m[1]);
  const allDeps = Array.from(new Set([...existingGetters, ...depNames])).sort();
  const rows = [];
  for (let i = 0; i < allDeps.length; i += 4) rows.push('    ' + allDeps.slice(i, i + 4).map(n => `get ${n}() { return ${n}; }`).join(', '));
  rewritten = rewritten.slice(0, preludeStart) + '  const __alloHostDeps = {\n' + rows.join(',\n') + ',\n  };\n' + rewritten.slice(preludeEnd);

  // ---- 7. Rebuild + pin + manifest.
  const { buildFirstWaveModule } = require(BUILDER);
  const output = buildFirstWaveModule(MODULE_KEY);
  fs.writeFileSync(path.join(ROOT, OUTPUT_FILE), output, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'desktop', 'web-app', 'public', OUTPUT_FILE), output, 'utf8');
  const pin = sha8(path.join(ROOT, OUTPUT_FILE));
  const pinRe = new RegExp(OUTPUT_FILE.replace('.', '\\.') + '\\?v=[0-9a-f]{8}');
  if (!pinRe.test(rewritten)) throw new Error('module pin not found in host');
  rewritten = rewritten.replace(pinRe, `${OUTPUT_FILE}?v=${pin}`);
  fs.writeFileSync(HOST, rewritten, 'utf8');
  manifest.handlers = manifest.handlers.concat(kept.map(k => k.name));
  manifest.useCallbackHandlers = (manifest.useCallbackHandlers || []).concat(kept.filter(k => k.isHook).map(k => k.name));
  manifest.deps = allDeps;
  manifest.bytesMoved = (manifest.bytesMoved || 0) + totalBytes;
  manifest.waves = (manifest.waves || [3]).concat([WAVE]);
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`Built ${OUTPUT_FILE} (${Buffer.byteLength(output)} bytes) pin ${pin}; wave ${WAVE} moved ${kept.length} handlers / ${totalBytes} bytes; getters now ${allDeps.length}.`);
}

main();
