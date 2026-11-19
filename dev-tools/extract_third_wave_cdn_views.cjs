#!/usr/bin/env node
'use strict';

// Third cold-path CDN wave (2026-11-17). Same contract as extract_second_wave_cdn_views.cjs
// (read that header first): the monolith is edited by byte range, every target is asserted
// by a unique source prefix plus a marker inside it, and the host keeps one
// `_alloCreateFirstWaveCdnView` shim per component, so a call site changes only to the shim
// with its props spread.
//
// What is different from wave 2:
//   - `--dry-run` reports each target (bytes, host bindings, refs, hooks) and writes nothing.
//   - A target is REFUSED when it takes a ref that the host passes to useFocusTrap: the trap's
//     effect runs when the dialog opens, and on the first opening the lazy view is not mounted
//     yet, so the ref is empty and the dialog would open with no focus trap.
//   - A target with a `trap` entry (second batch: translate, teach live) takes the trap WITH it:
//     the view makes its own ref and calls the host's hook (window.__alloHooks.useFocusTrap), so
//     the trap starts when the view mounts, which is when the dialog is on screen. The host's
//     ref line and hook line are deleted (each must be found exactly once, and the ref must be
//     used nowhere else). Escape reaches the view as the `onTrapEscape` prop.
//   - The save-project dialog stays in the host on purpose: saving must work with no network,
//     and a lazy dialog would be a loading notice when the network is down.
//   - Incremental: a target already in the host as a shim call is skipped, so the second batch
//     appends to the source file and the export list of the first.
//   - A target that calls a hook is refused for a bare JSX element too, not only for an IIFE.
//   - All four copies of the module are written (root, desktop/web-app/public,
//     desktop/app-build, desktop/web-app/build).
//
// After it runs: node dev-tools/build_browser_delivery_manifest.cjs --sync --host=AlloFlowANTI.txt
// then copy AlloFlowANTI.txt to desktop/web-app/src/AlloFlowANTI.txt and App.jsx.
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
const DRY = process.argv.includes('--dry-run');

const GLOBALS = new Set([
  'Array', 'Blob', 'Boolean', 'CustomEvent', 'Date', 'Error', 'JSON', 'Map', 'Math', 'NaN',
  'Number', 'Object', 'Promise', 'React', 'Set', 'String', 'URL', 'Infinity', 'RegExp', 'Symbol',
  'clearInterval', 'clearTimeout', 'console', 'document', 'navigator', 'parseFloat', 'parseInt',
  'requestAnimationFrame', 'cancelAnimationFrame', 'setInterval', 'setTimeout', 'undefined',
  'window', 'localStorage', 'sessionStorage', 'encodeURIComponent', 'decodeURIComponent',
  'isNaN', 'isFinite', 'Intl', 'fetch', 'alert', 'confirm', 'location', 'history', 'performance',
  'atob', 'btoa', 'Event', 'KeyboardEvent', 'HTMLElement', 'Element', 'Node', 'AbortController',
  'FileReader', 'File', 'Image', 'Audio', 'URLSearchParams', 'TextEncoder', 'TextDecoder',
  'structuredClone', 'queueMicrotask', 'getComputedStyle', 'indexedDB', 'crypto', 'TypeError',
  'RangeError', 'globalThis', 'FormData', 'Headers', 'Request', 'Response', 'MutationObserver',
  'ResizeObserver', 'IntersectionObserver', 'DOMParser', 'XMLSerializer', 'Uint8Array', 'ArrayBuffer',
]);

const MODULE_KEY = 'ColdPathScreens';
const SOURCE_FILE = 'view_cold_path_screens_source.jsx';
const OUTPUT_FILE = 'view_cold_path_screens_module.js';
const LOADER = '__alloLazyColdPathScreens';

const TARGETS = [
  {
    key: 'gemini-bridge-view',
    kind: 'jsx',
    startsWith: '<div className="space-y-6 max-w-4xl mx-auto h-full overflow-y-auto pe-2 pb-10">\n                        <div className="bg-slate-900 text-slate-100 p-6 rounded-xl border border-slate-700 shadow-lg font-mono relative">',
    marker: '<Terminal size={18} />',
    component: 'GeminiBridgeView',
    displayName: 'Gemini Bridge',
    icon: '🌉',
    overlay: false,
  },
  {
    key: 'saved-math-assessment-view',
    kind: 'iife',
    startsWith: '(() => {\n                    // Saved plans and submitted work share a historical resource type.',
    marker: 'saved-math-assessment-title',
    component: 'SavedMathAssessmentView',
    displayName: 'Saved Math Assessment',
    icon: '🧮',
    overlay: false,
  },
  {
    key: 'adventure-cast-lobby',
    kind: 'jsx',
    startsWith: '<CastLobby\n                        characters={adventureState.characters}',
    marker: 'onAddCharacter',
    component: 'AdventureCastLobbyView',
    displayName: 'Adventure Cast',
    icon: '🎭',
    overlay: false,
  },
  {
    key: 'stem-artwork-handoff',
    kind: 'iife',
    startsWith: "(() => {\n        const boards = _alloReadVisualSupportCollection('alloSymbolBoards');",
    marker: 'stem-artwork-handoff-title',
    component: 'StemArtworkHandoffView',
    displayName: 'Save Artwork',
    icon: '🖼️',
    overlay: true,
    closeExpression: '() => setStemArtworkHandoff(null)',
  },
  // Second batch: dialogs that take their focus trap with them.
  {
    key: 'session-start-options',
    kind: 'jsx',
    startsWith: '<div ref={sessionStartOptionsRef} className="fixed inset-0 bg-black/70 z-[152]',
    marker: "t('share_collect.start_live_session')",
    component: 'SessionStartOptionsView',
    displayName: 'Teach Live',
    icon: '📡',
    overlay: true,
    closeExpression: '() => setShowSessionStartOptions(false)',
    trap: {
      ref: 'sessionStartOptionsRef',
      hostRefLine: '  const sessionStartOptionsRef = useRef(null);\n',
      hostHookLine: '  useFocusTrap(sessionStartOptionsRef, showSessionStartOptions, () => setShowSessionStartOptions(false));\n',
    },
  },
  {
    key: 'translate-modal',
    kind: 'iife',
    startsWith: '(() => {\n        const primaryLanguage = targetTranslationLang.trim();',
    marker: 'companionPolicy',
    component: 'TranslateModalView',
    displayName: 'Translate',
    icon: '🌐',
    overlay: true,
    closeExpression: '() => setIsTranslateModalOpen(false)',
    trap: {
      ref: 'translateModalRef',
      hostRefLine: '  const translateModalRef = useRef(null);\n',
      hostHookLine: '  useFocusTrap(translateModalRef, isTranslateModalOpen, () => setIsTranslateModalOpen(false));\n',
    },
  },
];

function externalBindings(pathRef, node) {
  const names = new Set();
  const unbound = new Set();
  pathRef.traverse({
    ReferencedIdentifier(identifierPath) {
      const name = identifierPath.node.name;
      if (GLOBALS.has(name)) return;
      const binding = identifierPath.scope.getBinding(name);
      if (!binding) { unbound.add(name); return; }
      if (binding.path.node.start >= node.start && binding.path.node.end <= node.end) return;
      names.add(name);
    },
  });
  if (unbound.size) throw new Error('Unbound identifiers inside target (add to GLOBALS or fix): ' + Array.from(unbound).join(', '));
  return Array.from(names).sort();
}

function componentSource(spec, item) {
  const header = `// Extracted from AlloFlowANTI.txt (${spec.key}).`;
  const head = [header, `function ${spec.component}(props) {`, `  const { ${item.bindings.join(', ')} } = props;`];
  if (spec.trap) {
    head.push('  // The dialog owns its focus trap: it starts when this view mounts and ends when it leaves.');
    head.push(`  const ${spec.trap.ref} = React.useRef(null);`);
    head.push(`  window.__alloHooks.useFocusTrap(${spec.trap.ref}, true, props.onTrapEscape);`);
  }
  if (spec.kind === 'iife') return [...head, item.body, '}', ''].join('\n');
  return [...head, '  return (', item.raw, '  );', '}', ''].join('\n');
}

function hostReplacement(spec, bindings) {
  const metadata = [`__alloDisplayName=${JSON.stringify(spec.displayName)}`, `__alloOverlay={${spec.overlay ? 'true' : 'false'}}`];
  if (spec.closeExpression) metadata.push(`__alloOnClose={${spec.closeExpression}}`);
  if (spec.trap) metadata.push(`onTrapEscape={${spec.closeExpression}}`);
  const propRows = [];
  for (let i = 0; i < bindings.length; i += 8) propRows.push('        ' + bindings.slice(i, i + 8).join(', '));
  return [`<${spec.component}`, ...metadata.map(value => `        ${value}`), '        {...{', propRows.join(',\n'), '        }}', '      />'].join('\n');
}

function insertAfterLine(text, anchorRegex, insertion, label) {
  const lines = text.split('\n');
  const matches = lines.map((line, i) => (anchorRegex.test(line) ? i : -1)).filter(i => i >= 0);
  if (matches.length !== 1) throw new Error('Anchor found ' + matches.length + ' times: ' + label);
  lines.splice(matches[0] + 1, 0, insertion);
  return lines.join('\n');
}

function replaceOnce(text, pattern, replacement, label) {
  const found = text.match(pattern);
  if (!found) throw new Error('Anchor missing: ' + label);
  return text.replace(pattern, replacement);
}


function countOf(text, needle) {
  return text.split(needle).length - 1;
}

function main() {
  const source = fs.readFileSync(HOST, 'utf8');
  const done = TARGETS.filter(spec => source.includes(`<${spec.component}\n`));
  const pending = TARGETS.filter(spec => !done.includes(spec));
  if (!pending.length) {
    console.log('Third-wave CDN views are already extracted.');
    return;
  }
  const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
  const found = new Map();
  const consider = (spec, pathRef) => {
    const node = pathRef.node;
    if (!source.startsWith(spec.startsWith, node.start)) return;
    const raw = source.slice(node.start, node.end);
    if (!raw.includes(spec.marker)) return;
    if (found.has(spec.key)) throw new Error('Ambiguous anchor: ' + spec.key);
    const item = { spec, node, raw, bindings: externalBindings(pathRef, node) };
    if (/\buse[A-Z][A-Za-z]*\s*\(/.test(raw)) throw new Error('Target calls a hook; refusing: ' + spec.key);
    let trapped = item.bindings.filter(name => new RegExp('useFocusTrap\\(\\s*' + name + '\\b').test(source));
    if (spec.trap) {
      // The trap moves with the dialog: its ref is made in the view, so the host no longer hands it over.
      if (!trapped.includes(spec.trap.ref)) throw new Error('Trap ref is not one the host traps focus on: ' + spec.trap.ref);
      if (countOf(source, spec.trap.hostRefLine) !== 1 || countOf(source, spec.trap.hostHookLine) !== 1) throw new Error('Host ref line or hook line not found exactly once: ' + spec.key);
      if (countOf(raw, spec.trap.ref) !== 1 || !raw.includes(`ref={${spec.trap.ref}}`)) throw new Error('Trap ref must be used once, as a ref, inside the target: ' + spec.key);
      const uses = source.match(new RegExp('\\b' + spec.trap.ref + '\\b', 'g')).length;
      if (uses !== 3) throw new Error('Trap ref is used outside its declaration, its hook and the dialog (' + uses + ' uses): ' + spec.key);
      item.bindings = item.bindings.filter(name => name !== spec.trap.ref);
      trapped = trapped.filter(name => name !== spec.trap.ref);
    }
    if (trapped.length) throw new Error('Target takes a ref the host traps focus on (' + trapped.join(', ') + '); refusing: ' + spec.key);
    if (spec.kind === 'iife') {
      const fn = node.callee;
      if (!fn || fn.type !== 'ArrowFunctionExpression' || fn.body.type !== 'BlockStatement') throw new Error('IIFE target is not an arrow block: ' + spec.key);
      if (node.arguments.length) throw new Error('IIFE target is called with arguments: ' + spec.key);
      item.body = source.slice(fn.body.start + 1, fn.body.end - 1).replace(/^\n+/, '').replace(/\s+$/, '');
    }
    found.set(spec.key, item);
  };
  traverse(ast, {
    JSXElement(pathRef) { for (const spec of pending) if (spec.kind === 'jsx') consider(spec, pathRef); },
    CallExpression(pathRef) { for (const spec of pending) if (spec.kind === 'iife') consider(spec, pathRef); },
  });
  const missing = pending.filter(spec => !found.has(spec.key));
  if (missing.length) throw new Error('Extraction anchors not found: ' + missing.map(spec => spec.key).join(', '));

  let moved = 0;
  for (const spec of pending) {
    const item = found.get(spec.key);
    moved += Buffer.byteLength(item.raw);
    console.log(`${spec.key}: ${Buffer.byteLength(item.raw)} bytes, ${item.bindings.length} host bindings: ${item.bindings.join(', ')}${spec.trap ? ' | owns its focus trap (' + spec.trap.ref + ')' : ''}`);
  }
  console.log('total moved: ' + moved + ' bytes' + (done.length ? ' (already extracted: ' + done.map(spec => spec.component).join(', ') + ')' : ''));
  if (DRY) { console.log('dry run: nothing written'); return; }

  // 1. The source file: made by the first batch, appended to by a later one.
  const sourcePath = path.join(ROOT, SOURCE_FILE);
  const header = '// Auto-extracted cold-path view source (third wave, dev-tools/extract_third_wave_cdn_views.cjs).\n// Edit this file, then rebuild its CDN module: node _build_first_wave_view_modules.js ' + MODULE_KEY + '\n\n';
  const body = pending.map(spec => componentSource(spec, found.get(spec.key))).join('\n').replace(/\n+$/, '\n');
  if (done.length && !fs.existsSync(sourcePath)) throw new Error('Host has third-wave shims but ' + SOURCE_FILE + ' is missing');
  fs.writeFileSync(sourcePath, done.length ? fs.readFileSync(sourcePath, 'utf8').replace(/\n*$/, '\n\n') + body : header + body, 'utf8');

  // 2. The host: targets replaced from the last to the first, trap lines removed, then the shims and the loader.
  let rewritten = source;
  for (const item of Array.from(found.values()).sort((a, b) => b.node.start - a.node.start)) {
    rewritten = rewritten.slice(0, item.node.start) + hostReplacement(item.spec, item.bindings) + rewritten.slice(item.node.end);
  }
  for (const spec of pending) {
    if (!spec.trap) continue;
    rewritten = rewritten.replace(spec.trap.hostRefLine, '').replace(spec.trap.hostHookLine, '');
    if (new RegExp('\\b' + spec.trap.ref + '\\b').test(rewritten)) throw new Error('Trap ref still named in the host: ' + spec.trap.ref);
  }
  const shims = pending.map(spec => `const ${spec.component} = _alloCreateFirstWaveCdnView('${spec.component}', '${LOADER}', '${spec.icon}');`).join('\n');
  const lastDone = done.length ? done[done.length - 1].component : 'ReadThisPagePanelView';
  rewritten = insertAfterLine(rewritten, new RegExp('^const ' + lastDone + ' = _alloCreateFirstWaveCdnView\\('), shims, 'shim block after ' + lastDone);
  if (!rewritten.includes(`window.${LOADER} = `)) {
    const loader = `    window.${LOADER} = (function() { var L=false; return function() { if(L)return; L=true; loadModule('${MODULE_KEY}', 'https://alloflow-cdn.pages.dev/${OUTPUT_FILE}?v=PENDING00'); }; })();`;
    rewritten = insertAfterLine(rewritten, /^\s+window\.__alloLazyColdPathSurfaces = /, loader, 'second-wave loader line');
  }
  fs.writeFileSync(HOST, rewritten, 'utf8');

  // 3. The builder's list.
  let builder = fs.readFileSync(BUILDER, 'utf8');
  const exportsText = `[${TARGETS.filter(spec => done.includes(spec) || pending.includes(spec)).map(spec => `'${spec.component}'`).join(', ')}]`;
  if (builder.includes(`  ${MODULE_KEY}: {`)) {
    builder = replaceOnce(builder, new RegExp(`(  ${MODULE_KEY}: \\{\\n    source: '[^']+',\\n    output: '[^']+',\\n    exports: )\\[[^\\]]*\\]`), `$1${exportsText}`, 'builder ' + MODULE_KEY + ' exports');
  } else {
    const configText = [`  ${MODULE_KEY}: {`, `    source: '${SOURCE_FILE}',`, `    output: '${OUTPUT_FILE}',`, `    exports: ${exportsText},`, '  },'].join('\n');
    builder = replaceOnce(builder, /(  ColdPathSurfaces: \{[\s\S]*?\n  \},\n)/, `$1${configText}\n`, 'builder ColdPathSurfaces');
  }
  fs.writeFileSync(BUILDER, builder, 'utf8');

  // 4. build.js: MODULES, COMPILE_PAIRS, CONTENT_HASH_PINNED (once, by the first batch).
  let build = fs.readFileSync(BUILD_JS, 'utf8');
  if (!build.includes(`name: '${MODULE_KEY}'`)) {
    const moduleEntry = ['    {', `        name: '${MODULE_KEY}',`, `        filename: '${OUTPUT_FILE}',`, "        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'", '    },'].join('\n');
    build = replaceOnce(build, /(    \{\n        name: 'ColdPathSurfaces',\n        filename: 'view_cold_path_surfaces_module\.js',\n        cdnBase: '[^']+'\n    \},\n)/, `$1${moduleEntry}\n`, 'build.js MODULES');
    const pairEntry = ['    {', `        name: '${MODULE_KEY}',`, `        srcPath: path.join(ROOT, '${SOURCE_FILE}'),`, `        modPath: path.join(ROOT, '${OUTPUT_FILE}'),`,
      `        publicPath: path.join(ROOT, 'desktop/web-app/public/${OUTPUT_FILE}'),`,
      `        wrap(src) { return require('./_build_first_wave_view_modules.js').buildFirstWaveModule('${MODULE_KEY}', src); },`, '    },'].join('\n');
    build = replaceOnce(build, /(    \{\n        name: 'ColdPathSurfaces',\n        srcPath: [^\n]+\n        modPath: [^\n]+\n        publicPath: [^\n]+\n        wrap\(src\) [^\n]+\n    \},\n)/, `$1${pairEntry}\n`, 'build.js COMPILE_PAIRS');
    build = replaceOnce(build, /(    'view_cold_path_surfaces_module\.js',\n)/, `$1    '${OUTPUT_FILE}',\n`, 'build.js CONTENT_HASH_PINNED');
    fs.writeFileSync(BUILD_JS, build, 'utf8');
  }

  // 5. Build the module (four copies), then pin the loader by content hash.
  delete require.cache[require.resolve(BUILDER)];
  const output = require(BUILDER).buildFirstWaveModule(MODULE_KEY);
  for (const dir of ['', 'desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
    const target = path.join(ROOT, dir, OUTPUT_FILE);
    if (fs.existsSync(path.dirname(target))) fs.writeFileSync(target, output, 'utf8');
  }
  const pin = createHash('sha256').update(fs.readFileSync(path.join(ROOT, OUTPUT_FILE))).digest('hex').slice(0, 8);
  const pinPattern = new RegExp(OUTPUT_FILE.replace(/\./g, '\\.') + '\\?v=(?:PENDING00|[0-9a-f]{8})', 'g');
  const hostNow = fs.readFileSync(HOST, 'utf8');
  if ((hostNow.match(pinPattern) || []).length !== 1) throw new Error('Loader pin not found exactly once');
  fs.writeFileSync(HOST, hostNow.replace(pinPattern, `${OUTPUT_FILE}?v=${pin}`), 'utf8');
  console.log(`Built ${OUTPUT_FILE} (${Buffer.byteLength(output)} bytes) pin ${pin}`);
  console.log('host: ' + Buffer.byteLength(source) + ' -> ' + fs.statSync(HOST).size + ' bytes');
}

main();
