#!/usr/bin/env node
'use strict';

// Wave 3 (2026-09-13): move the long tail of plain handler closures out of
// AlloFlowContent into host_handlers_module.js (boot-critical).
//
// What qualifies: a component-scope `const name = (...) => {...}` /
// `const name = async function ...` / `function name(...) {...}` that is not a
// hook call, not an existing shim, does not assign to outer bindings, does not
// call hooks, and is NEVER INVOKED DURING RENDER — directly in the component
// body or JSX, inside useMemo/useState initializers, transitively through
// helpers that run at render, inside the AlloBot command-context builder's
// build-time statements, or at render inside an already-extracted view module.
// A shim that runs during render could execute before its module lands.
//
// How semantics are preserved: the host builds ONE per-render object of getters
// (`__alloHostDeps`) over every binding the moved bodies reference, and every
// such reference in the module is rewritten to `__d.name`. A getter reads the
// live binding at access time, which is exactly what the original closure did
// (including `let`s the boot sequence upgrades in place and consts declared
// later in the body). Sibling handlers moved together keep calling each other
// directly inside the module.
//
// Usage: node dev-tools/extract_host_handlers_wave3.cjs [--dry-run] [--min=BYTES]
// Idempotent: re-running after extraction is a no-op.

const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const ROOT = path.resolve(__dirname, '..');
const HOST = path.join(ROOT, 'AlloFlowANTI.txt');
const BUILDER = path.join(ROOT, '_build_first_wave_view_modules.js');
const BUILD_JS = path.join(ROOT, 'build.js');
const MANIFEST = path.join(__dirname, 'host_handlers_wave3_manifest.json');

const MODULE_KEY = 'HostHandlers';
const EXPORT_NAME = 'createHostHandlers';
const SOURCE_FILE = 'host_handlers_source.jsx';
const OUTPUT_FILE = 'host_handlers_module.js';

const DRY = process.argv.includes('--dry-run');
const MIN = Number((process.argv.find(a => a.startsWith('--min=')) || '--min=1500').slice(6));

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

// Callees whose function arguments do NOT run synchronously when the call runs.
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
  return /^set[A-Z]/.test(name); // React state setters: updater runs lazily
};

const sha8 = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
const isFnNode = (n) => n && /^(ArrowFunctionExpression|FunctionExpression|FunctionDeclaration|ObjectMethod|ClassMethod|ClassPrivateMethod)$/.test(n.type);

// Does nested function F run synchronously when its enclosing code runs?
function syncExecuted(fnPath) {
  const parent = fnPath.parentPath;
  if (!parent) return false;
  const p = parent.node;
  if ((p.type === 'CallExpression' || p.type === 'NewExpression') && p.callee === fnPath.node) return true; // IIFE
  if ((p.type === 'CallExpression' || p.type === 'NewExpression') && p.arguments.includes(fnPath.node)) {
    return !isAsyncCallee(p.callee);
  }
  // JSX ref callbacks run synchronously in React's commit phase.
  if (p.type === 'JSXExpressionContainer' && parent.parentPath && parent.parentPath.node.type === 'JSXAttribute'
      && parent.parentPath.node.name && parent.parentPath.node.name.name === 'ref') return true;
  // An effect's returned cleanup runs synchronously in a later commit.
  if (p.type === 'ReturnStatement' && fnPath.parentPath.parentPath && fnPath.parentPath.parentPath.parentPath) {
    const enclosing = fnPath.findParent(x => isFnNode(x.node));
    if (enclosing && enclosing.parentPath && enclosing.parentPath.node.type === 'CallExpression') {
      const c = enclosing.parentPath.node.callee; const n = c.type === 'Identifier' ? c.name : (c.property && c.property.name);
      if (/^use(Layout|Insertion)?Effect$/.test(n || '')) return true;
    }
  }
  return false; // JSX attribute, assigned, returned, property value, array element...
}

// Names invoked synchronously when `rootPath`'s body runs (its render/build time).
// Collects bare callee identifiers, sync-callback arguments, JSX element names, and
// `obj.name(...)` callee property names (conservative for props.handler()).
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
    Function(fp) { if (fp.node === rootNode) return; /* nested fns are handled via enclosingAllSync */ },
    CallExpression(cp) {
      if (!enclosingAllSync(cp)) return;
      const c = cp.node.callee;
      if (c.type === 'Identifier') names.add(c.name);
      else if (c.type === 'MemberExpression' && !c.computed && c.property.type === 'Identifier') names.add(c.property.name);
      if (!isAsyncCallee(c)) {
        for (const a of cp.node.arguments) if (a.type === 'Identifier') names.add(a.name);
      }
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

// Render-time names from other files: every function whose body contains JSX or
// React.createElement is treated as a render root; so are useMemo/useState initializers.
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
  const source = fs.readFileSync(HOST, 'utf8');
  if (source.includes(`window.AlloModules.${MODULE_KEY}`)) { console.log('Wave-3 host handlers are already extracted.'); return; }
  const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });

  let compPath = null;
  traverse(ast, { VariableDeclarator(p) { if (p.node.id.name === 'AlloFlowContent') compPath = p.get('init'); } });
  if (!compPath) throw new Error('AlloFlowContent not found');
  const compFn = compPath.node;
  const bodyPaths = compPath.get('body.body');

  // ---- 1. Every component-scope function-valued declaration (for transitive render analysis).
  const fnByName = new Map(); // name -> { path (function path), stmtPath, kind }
  for (const sp of bodyPaths) {
    const n = sp.node;
    if (n.type === 'FunctionDeclaration' && n.id) fnByName.set(n.id.name, { fnPath: sp, stmtPath: sp, kind: 'function' });
    else if (n.type === 'VariableDeclaration' && n.declarations.length === 1 && n.declarations[0].id.type === 'Identifier') {
      const d = sp.get('declarations.0'); const init = d.node.init; if (!init) continue;
      if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') fnByName.set(d.node.id.name, { fnPath: d.get('init'), stmtPath: sp, kind: n.kind });
      else if (init.type === 'CallExpression' && init.arguments.length && isFnNode(init.arguments[0])) {
        const c = init.callee; const cn = c.type === 'Identifier' ? c.name : (c.property && c.property.name);
        if (/^use(Callback|Memo)$/.test(cn || '') || cn === 'memo' || cn === 'forwardRef') fnByName.set(d.node.id.name, { fnPath: d.get('init.arguments.0'), stmtPath: sp, kind: 'hook:' + cn });
      }
    }
  }

  // ---- 2. Render-time invoked names (transitive).
  const R = new Set(syncInvokedNames(compPath));
  const ctxSource = path.join(ROOT, 'allo_command_context_source.js');
  if (fs.existsSync(ctxSource)) {
    const cast = parser.parse(fs.readFileSync(ctxSource, 'utf8'), { sourceType: 'script' });
    traverse(cast, { FunctionDeclaration(fp) { if (fp.node.id.name === 'buildAlloCommandContext') for (const n of syncInvokedNames(fp)) R.add(n); } });
  }
  // Every extracted view/module can call a host handler at ITS render time: scan the readable
  // sources, plus every compiled module that has no source (props.handler() at render).
  const rootFiles = fs.readdirSync(ROOT);
  const sourceFiles = rootFiles.filter(f => /_source\.jsx$/.test(f));
  const compiledOnly = rootFiles.filter(f => /_module\.js$/.test(f) && !rootFiles.includes(f.replace(/_module\.js$/, '_source.jsx')));
  const moduleFiles = [...sourceFiles, ...compiledOnly].map(f => path.join(ROOT, f));
  let RM = new Set();
  const t0 = Date.now();
  for (const f of moduleFiles) for (const n of renderNamesFromFile(f)) RM.add(n);
  console.log(`scanned ${sourceFiles.length} sources + ${compiledOnly.length} compiled-only modules for render-time calls in ${Date.now() - t0} ms`);
  for (const n of RM) R.add(n);
  // Effect bodies run at mount, before any CDN module can land: a shim invoked
  // synchronously there would throw inside React's commit. Same for anything a
  // module might call at its own load time through a window property.
  let effectRoots = 0, effectNames = 0, windowNames = 0;
  compPath.traverse({
    CallExpression(cp) {
      const c = cp.node.callee; const n = c.type === 'Identifier' ? c.name : (c.type === 'MemberExpression' && c.property.name);
      if (!/^use(Layout|Insertion)?Effect$/.test(n || '')) return;
      const arg = cp.get('arguments.0'); if (!arg || !isFnNode(arg.node)) return;
      effectRoots += 1;
      for (const name of syncInvokedNames(arg)) if (!R.has(name)) { R.add(name); effectNames += 1; }
    },
    AssignmentExpression(ap) {
      let obj = ap.node.left; while (obj && obj.type === 'MemberExpression') obj = obj.object;
      if (!obj || obj.type !== 'Identifier' || !/^(window|globalThis|self)$/.test(obj.name)) return;
      ap.get('right').traverse({ Identifier(ip) { if (fnByName.has(ip.node.name) && !R.has(ip.node.name)) { R.add(ip.node.name); windowNames += 1; } } });
      if (ap.node.right.type === 'Identifier' && fnByName.has(ap.node.right.name) && !R.has(ap.node.right.name)) { R.add(ap.node.right.name); windowNames += 1; }
    },
  });
  console.log(`effect roots: ${effectRoots} (+${effectNames} names); window-exposed: +${windowNames} names`);
  // transitive through host closures
  let grew = true;
  while (grew) {
    grew = false;
    for (const name of Array.from(R)) {
      const entry = fnByName.get(name); if (!entry || entry._done) continue;
      entry._done = true;
      for (const n of syncInvokedNames(entry.fnPath)) if (!R.has(n)) { R.add(n); grew = true; }
    }
  }

  // ---- 3. Candidates.
  const candidates = [];
  const excluded = [];
  for (const [name, entry] of fnByName) {
    const stmt = entry.stmtPath.node;
    const text = source.slice(stmt.start, stmt.end);
    const bytes = Buffer.byteLength(text);
    const reject = (reason) => excluded.push({ name, bytes, reason });
    if (entry.kind.startsWith('hook:')) { reject('hook-wrapped'); continue; }
    if (entry.kind === 'let' || entry.kind === 'var') { reject('let/var binding'); continue; }
    if (bytes < MIN) continue;
    if (/^_allo[A-Za-z]*Deps$/.test(name) || name === '_alloCmdCtx' || /^_alloHost/.test(name)) { reject('deps bag / dispatcher'); continue; }
    if (/AlloModules[\s\S]{0,400}module not loaded/.test(text) || /\bnot loaded\b/.test(text) && /AlloModules/.test(text)) { reject('already a shim'); continue; }
    if (entry.fnPath.node.generator) { reject('generator'); continue; }
    if (/\b(use[A-Z][A-Za-z]*)\s*\(/.test(text) && !/\b(useDefault|useFallback)\b/.test(text)) { reject('calls a hook'); continue; }
    if (R.has(name)) { reject('invoked at render'); continue; }
    if (text.includes('__d') || text.includes('__alloHostDeps')) { reject('name collision'); continue; }
    // `this` only changes meaning through a shim when it belongs to the handler's own
    // (non-arrow) function; arrows keep the component's lexical `this` (undefined) in both.
    let ownThis = false;
    entry.fnPath.traverse({
      ThisExpression(tp) {
        let cur = tp.parentPath;
        while (cur && cur.node !== entry.fnPath.node) {
          if (/^(FunctionExpression|FunctionDeclaration|ObjectMethod|ClassMethod|ClassPrivateMethod)$/.test(cur.node.type)) return; // belongs to a nested function
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
    candidates.push({ name, entry, stmt, text, bytes });
  }
  candidates.sort((a, b) => a.stmt.start - b.stmt.start);
  const candidateNames = new Set(candidates.map(c => c.name));

  // ---- 4. Free vars + rewrites per candidate.
  const depNames = new Set();
  const unboundNames = new Set();
  const kept = [];
  for (const c of candidates) {
    const fnNode = c.entry.fnPath.node;
    const stmtNode = c.stmt;
    const edits = []; // { start, end, text }
    let bad = null;
    const seen = new Set();
    const outside = (b) => !(b.path.node.start >= stmtNode.start && b.path.node.end <= stmtNode.end);
    c.entry.stmtPath.traverse({
      ReferencedIdentifier(ip) {
        const node = ip.node; if (node.type !== 'Identifier') return;
        const name = node.name;
        if (name === c.name) return; // recursion → module-local
        if (candidateNames.has(name)) { const b = ip.scope.getBinding(name); if (!b || outside(b)) return; }
        const b = ip.scope.getBinding(name);
        if (b && !outside(b)) return; // local
        if (!b) { if (GLOBALS.has(name)) return; unboundNames.add(name); } // unbound in host too → same lookup via getter
        // outer binding → __d.name
        const parent = ip.parentPath.node;
        if (parent.type === 'ObjectProperty' && parent.shorthand && parent.value === node) {
          edits.push({ start: parent.start, end: parent.end, text: `${name}: __d.${name}` });
        } else {
          edits.push({ start: node.start, end: node.end, text: `__d.${name}` });
        }
        depNames.add(name);
      },
      JSXIdentifier(jp) {
        const node = jp.node; const p = jp.parentPath.node;
        const isName = (p.type === 'JSXOpeningElement' || p.type === 'JSXClosingElement') && p.name === node;
        const isMemberRoot = p.type === 'JSXMemberExpression' && p.object === node;
        if (!isName && !isMemberRoot) return;
        if (!/^[A-Z_$]/.test(node.name)) return; // html tag
        const name = node.name;
        if (candidateNames.has(name) || name === c.name) return;
        const b = jp.scope.getBinding(name);
        if (b && !outside(b)) return;
        if (!b) { if (GLOBALS.has(name)) return; unboundNames.add(name); }
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
    // apply edits (descending, dedupe identical ranges)
    const uniq = new Map(); for (const e of edits) uniq.set(e.start + ':' + e.end, e);
    const sorted = Array.from(uniq.values()).sort((a, b) => b.start - a.start);
    let body = c.text; const base = stmtNode.start;
    for (const e of sorted) body = body.slice(0, e.start - base) + e.text + body.slice(e.end - base);
    kept.push({ ...c, moduleText: body, isAsync: !!fnNode.async, isFunctionDecl: stmtNode.type === 'FunctionDeclaration' });
  }
  // Candidates that were excluded in step 4 must not be treated as module-local siblings.
  const keptNames = new Set(kept.map(k => k.name));
  for (const k of kept) {
    for (const cn of candidateNames) {
      if (!keptNames.has(cn) && cn !== k.name && new RegExp('(^|[^\\w$.])' + cn.replace(/\$/g, '\\$') + '(?![\\w$])').test(k.moduleText)) {
        // rewrite bare references to the excluded sibling into __d.<name>
        k.moduleText = k.moduleText.replace(new RegExp('(^|[^\\w$.])(' + cn.replace(/\$/g, '\\$') + ')(?![\\w$])', 'g'), (m, pre) => pre + '__d.' + cn);
        depNames.add(cn);
      }
    }
  }
  for (const n of keptNames) depNames.delete(n);
  const deps = Array.from(depNames).sort();
  const totalBytes = kept.reduce((a, k) => a + k.bytes, 0);

  console.log(`candidates kept: ${kept.length} (${totalBytes} bytes); excluded: ${excluded.length}; deps: ${deps.length}; render-time names: ${R.size} (from modules: ${RM.size})`);
  if (unboundNames.size) console.log('unbound (treated as globals): ' + Array.from(unboundNames).sort().join(', '));
  const byReason = {}; for (const e of excluded) { if (e.bytes < MIN) continue; byReason[e.reason.split(' ')[0]] = (byReason[e.reason.split(' ')[0]] || 0) + 1; }
  console.log('excluded (>= MIN) by reason: ' + JSON.stringify(byReason));
  if (DRY) {
    console.log('\n--- kept (bytes, line, name) ---');
    for (const k of kept) console.log(String(k.bytes).padStart(7), String(k.stmt.loc.start.line).padStart(6), (k.isFunctionDecl ? 'function ' : 'const ') + k.name + (k.isAsync ? ' (async)' : ''));
    console.log('\n--- excluded >= MIN ---');
    for (const e of excluded.filter(e => e.bytes >= MIN).sort((a, b) => b.bytes - a.bytes)) console.log(String(e.bytes).padStart(7), e.name.padEnd(48), e.reason);
    return;
  }
  if (!kept.length) throw new Error('nothing to extract');

  // ---- 5. Module source.
  const moduleSource = [
    '// Auto-extracted from AlloFlowANTI.txt (wave 3: plain handler closures of AlloFlowContent).',
    '// Edit this file, then rebuild its CDN module. `__d` is the host\'s per-render getter',
    '// object: every `__d.<binding>` reads the live component/module binding, exactly as the',
    '// original closure did. Handlers moved together call each other directly.',
    '',
    `function ${EXPORT_NAME}(__d) {`,
    ...kept.map(k => k.moduleText),
    `  return { ${kept.map(k => k.name).join(', ')} };`,
    '}',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, SOURCE_FILE), moduleSource, 'utf8');

  // ---- 6. Host rewrite.
  let rewritten = source;
  const replacements = kept.slice().sort((a, b) => b.stmt.start - a.stmt.start);
  for (const k of replacements) {
    const shim = k.isFunctionDecl
      ? `${k.isAsync ? 'async ' : ''}function ${k.name}(...__a) { return _alloHostHandlers().${k.name}(...__a); }`
      : `const ${k.name} = ${k.isAsync ? 'async ' : ''}(...__a) => _alloHostHandlers().${k.name}(...__a);`;
    rewritten = rewritten.slice(0, k.stmt.start) + shim + rewritten.slice(k.stmt.end);
  }
  const getterRows = [];
  for (let i = 0; i < deps.length; i += 4) getterRows.push('    ' + deps.slice(i, i + 4).map(n => `get ${n}() { return ${n}; }`).join(', '));
  const prelude = [
    '',
    '  // Wave-3 host handlers live in host_handlers_module.js (boot-critical). `__alloHostDeps`',
    '  // is a per-render object of GETTERS over every binding those handlers read, so the',
    '  // module sees live values (later-declared consts included) exactly like the original',
    '  // closures. Built once per render; the handler set is created lazily per render.',
    '  const __alloHostDeps = {',
    getterRows.join(',\n') + ',',
    '  };',
    '  let __alloHostHandlersCache = null;',
    '  const _alloHostHandlers = () => {',
    '    if (__alloHostHandlersCache) return __alloHostHandlersCache;',
    `    const create = window.AlloModules && window.AlloModules.${MODULE_KEY};`,
    "    if (typeof create !== 'function') {",
    `      try { if (window.__alloModuleRegistry && window.__alloModuleRegistry.${MODULE_KEY} && window.__alloModuleRegistry.${MODULE_KEY}.status === 'failed' && typeof window.__alloRetryModule === 'function') window.__alloRetryModule('${MODULE_KEY}'); } catch (_) {}`,
    `      throw new Error('[${MODULE_KEY}] module not loaded - reload the page');`,
    '    }',
    '    __alloHostHandlersCache = create(__alloHostDeps);',
    '    return __alloHostHandlersCache;',
    '  };',
  ].join('\n');
  // insert right after the component's opening brace
  const braceIdx = rewritten.indexOf('{', rewritten.indexOf('const AlloFlowContent = () => '));
  rewritten = rewritten.slice(0, braceIdx + 1) + prelude + rewritten.slice(braceIdx + 1);
  // boot-critical + eager load beside AlloCommandContext
  const bootAnchor = "'ConfirmDialog', 'PromptDialog', 'AlloCommands', 'AlloCommandContext', 'OnboardingCoach', 'OnboardingHelpers'";
  if (!rewritten.includes(bootAnchor)) throw new Error('boot-critical anchor missing');
  rewritten = rewritten.replace(bootAnchor, `'ConfirmDialog', 'PromptDialog', 'AlloCommands', 'AlloCommandContext', '${MODULE_KEY}', 'OnboardingCoach', 'OnboardingHelpers'`);
  const lines = rewritten.split('\n');
  const li = lines.findIndex(l => /^\s+loadModule\('AlloCommandContext', /.test(l));
  if (li < 0) throw new Error('AlloCommandContext loadModule anchor missing');
  lines.splice(li + 1, 0, `    loadModule('${MODULE_KEY}', 'https://alloflow-cdn.pages.dev/${OUTPUT_FILE}?v=PENDING00');`);
  rewritten = lines.join('\n');
  fs.writeFileSync(HOST, rewritten, 'utf8');

  // ---- 7. Builder + build.js registration.
  let builder = fs.readFileSync(BUILDER, 'utf8');
  builder = builder.replace(/(  VideoStudioHostBridgeView: \{[\s\S]*?\n  \},\n)/, `$1  ${MODULE_KEY}: {\n    source: '${SOURCE_FILE}',\n    output: '${OUTPUT_FILE}',\n    exports: ['${EXPORT_NAME}'],\n  },\n`);
  fs.writeFileSync(BUILDER, builder, 'utf8');
  let build = fs.readFileSync(BUILD_JS, 'utf8');
  const modulesAnchor = /(    \{\n        name: 'VideoStudioHostBridgeView',\n        filename: 'video_studio_host_bridge_module\.js',\n        cdnBase: '[^']+'\n    \},\n)/;
  if (!modulesAnchor.test(build)) throw new Error('build.js MODULES anchor missing');
  build = build.replace(modulesAnchor, `$1    {\n        name: '${MODULE_KEY}',\n        filename: '${OUTPUT_FILE}',\n        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'\n    },\n`);
  const pairAnchor = /(    \{\n        name: 'VideoStudioHostBridgeView',\n        srcPath: [^\n]+\n        modPath: [^\n]+\n        publicPath: [^\n]+\n        wrap\(src\) [^\n]+\n    \},\n)/;
  if (!pairAnchor.test(build)) throw new Error('build.js COMPILE_PAIRS anchor missing');
  build = build.replace(pairAnchor, `$1    {\n        name: '${MODULE_KEY}',\n        srcPath: path.join(ROOT, '${SOURCE_FILE}'),\n        modPath: path.join(ROOT, '${OUTPUT_FILE}'),\n        publicPath: path.join(ROOT, 'desktop/web-app/public/${OUTPUT_FILE}'),\n        wrap(src) { return require('./_build_first_wave_view_modules.js').buildFirstWaveModule('${MODULE_KEY}', src); },\n    },\n`);
  const pinAnchor = "const CONTENT_HASH_PINNED = new Set([\n";
  build = build.replace(pinAnchor, pinAnchor + `    '${OUTPUT_FILE}',\n`);
  fs.writeFileSync(BUILD_JS, build, 'utf8');

  // ---- 8. Build + pin + manifest.
  const { buildFirstWaveModule } = require(BUILDER);
  const output = buildFirstWaveModule(MODULE_KEY);
  fs.writeFileSync(path.join(ROOT, OUTPUT_FILE), output, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'desktop', 'web-app', 'public', OUTPUT_FILE), output, 'utf8');
  const pin = sha8(path.join(ROOT, OUTPUT_FILE));
  let host = fs.readFileSync(HOST, 'utf8');
  host = host.replace(`${OUTPUT_FILE}?v=PENDING00`, `${OUTPUT_FILE}?v=${pin}`);
  fs.writeFileSync(HOST, host, 'utf8');
  fs.writeFileSync(MANIFEST, JSON.stringify({ generated: '2026-09-13', handlers: kept.map(k => k.name), deps, bytesMoved: totalBytes }, null, 2) + '\n', 'utf8');
  console.log(`Built ${OUTPUT_FILE} (${Buffer.byteLength(output)} bytes) pin ${pin}; moved ${kept.length} handlers / ${totalBytes} bytes; ${deps.length} getters.`);
  console.log('Wave-3 host handler extraction complete.');
}

main();
