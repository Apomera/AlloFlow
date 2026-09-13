#!/usr/bin/env node
'use strict';

// Move the AlloBot command-context builder (`_alloCmdCtx`, ~104 KB of plain JS
// closures inside AlloFlowContent) into its own boot-critical CDN module
// (2026-09-13). The host keeps a shim with the same name that hands every free
// variable of the original body to the module as a deps bag, so the 280+
// command entries keep their exact semantics:
//
//   * component-scope bindings are all `const` per render (state, setters,
//     refs, handlers) and are passed by value — identical to what the closure
//     read at call time;
//   * the handful of MODULE-scope `let` bindings that the boot sequence
//     upgrades in place (callGemini, cleanJson, doc, getSpeechLangCode,
//     safeJsonParse) are passed through live getters (`deps.__live`) and every
//     reference inside the body is rewritten to `__live.<name>`, so a cached
//     context never pins a pre-upgrade fallback.
//
// Also guards the two call sites that dereferenced the context without a null
// check, and makes the render-time context depend on the module being present.
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
const KEYS_SNAPSHOT = path.join(__dirname, 'command_context_keys.json');

const MODULE_KEY = 'AlloCommandContext';
const EXPORT_NAME = 'buildAlloCommandContext';
const SOURCE_FILE = 'allo_command_context_source.js';
const OUTPUT_FILE = 'allo_command_context_module.js';

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
  'SpeechSynthesisUtterance', 'speechSynthesis', 'AudioContext', 'webkitAudioContext', 'MediaRecorder',
  'devicePixelRatio', 'innerWidth', 'innerHeight', 'screen', 'scrollTo', 'open', 'requestIdleCallback',
]);

function sha8(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
}

function insertAfterLine(text, anchorRegex, insertion, label) {
  const lines = text.split('\n');
  const idx = lines.findIndex(line => anchorRegex.test(line));
  if (idx < 0) throw new Error('Anchor not found: ' + label);
  lines.splice(idx + 1, 0, insertion);
  return lines.join('\n');
}

function replaceOnce(text, from, to, label) {
  const first = text.indexOf(from);
  if (first < 0) throw new Error('Replacement anchor not found: ' + label);
  if (text.indexOf(from, first + 1) >= 0) throw new Error('Replacement anchor ambiguous: ' + label);
  return text.slice(0, first) + to + text.slice(first + from.length);
}

function main() {
  const source = fs.readFileSync(HOST, 'utf8');
  if (source.includes(`window.AlloModules.${MODULE_KEY}`)) {
    console.log('Command context is already extracted.');
    return;
  }
  const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
  let declPath = null;
  let hostComponent = null;
  traverse(ast, {
    VariableDeclarator(pathRef) {
      if (pathRef.node.id.name === '_alloCmdCtx') declPath = pathRef;
      if (pathRef.node.id.name === 'AlloFlowContent') hostComponent = pathRef.node;
    },
  });
  if (!declPath || !hostComponent) throw new Error('_alloCmdCtx / AlloFlowContent not found');
  const fn = declPath.node.init;
  if (fn.type !== 'ArrowFunctionExpression' || fn.body.type !== 'BlockStatement' || fn.params.length) {
    throw new Error('_alloCmdCtx is not a zero-arg arrow block');
  }
  const declaration = declPath.parentPath.node; // the VariableDeclaration statement
  if (declaration.type !== 'VariableDeclaration' || declaration.declarations.length !== 1) throw new Error('unexpected declaration shape');

  // Free variables of the body, partitioned into by-value deps and live module-scope lets.
  const deps = new Map();
  const liveRefs = []; // { start, end, name, shorthandProperty }
  const unbound = new Set();
  declPath.get('init').traverse({
    ReferencedIdentifier(idPath) {
      const name = idPath.node.name;
      if (GLOBALS.has(name)) return;
      const binding = idPath.scope.getBinding(name);
      if (!binding) { unbound.add(name); return; }
      const bnode = binding.path.node;
      if (bnode.start >= fn.start && bnode.end <= fn.end) return; // local to the body
      const inComponent = bnode.start >= hostComponent.start && bnode.end <= hostComponent.end;
      const mutableModuleLet = !inComponent && (binding.kind === 'let' || binding.kind === 'var') && binding.constantViolations.length > 0;
      if (mutableModuleLet) {
        const parent = idPath.parentPath.node;
        const shorthand = parent.type === 'ObjectProperty' && parent.shorthand && parent.value === idPath.node;
        liveRefs.push({ start: idPath.node.start, end: idPath.node.end, name, shorthand, propStart: parent.start, propEnd: parent.end });
        deps.set(name, 'live');
      } else {
        deps.set(name, 'value');
      }
    },
    AssignmentExpression(assignPath) {
      const left = assignPath.node.left;
      if (left.type === 'Identifier') {
        const binding = assignPath.scope.getBinding(left.name);
        if (!(binding && binding.path.node.start >= fn.start && binding.path.node.end <= fn.end)) {
          throw new Error('Body assigns to an outer binding; cannot pass by value: ' + left.name);
        }
      }
    },
  });
  if (unbound.size) throw new Error('Unbound identifiers inside _alloCmdCtx (add to GLOBALS or fix): ' + Array.from(unbound).join(', '));
  const valueNames = Array.from(deps).filter(([, kind]) => kind === 'value').map(([name]) => name).sort();
  const liveNames = Array.from(deps).filter(([, kind]) => kind === 'live').map(([name]) => name).sort();
  console.log(`deps: ${valueNames.length} by value, ${liveNames.length} live (${liveNames.join(', ')})`);

  // Snapshot the ctx key list for the equivalence test.
  let ctxKeys = null;
  declPath.get('init').traverse({
    VariableDeclarator(p) {
      if (p.node.id.name === 'ctx' && p.node.init && p.node.init.type === 'ObjectExpression') {
        ctxKeys = p.node.init.properties.map(prop => {
          if (prop.type === 'SpreadElement') throw new Error('ctx literal uses spread; snapshot cannot enumerate keys');
          return prop.key.name || prop.key.value;
        });
      }
    },
  });
  if (!ctxKeys) throw new Error('ctx object literal not found inside _alloCmdCtx');

  // Rewrite live references inside the body text (descending offsets).
  let body = source.slice(fn.body.start + 1, fn.body.end - 1);
  const base = fn.body.start + 1;
  const edits = liveRefs.sort((a, b) => b.start - a.start);
  for (const ref of edits) {
    if (ref.shorthand) {
      const s = ref.propStart - base, e = ref.propEnd - base;
      body = body.slice(0, s) + `${ref.name}: __live.${ref.name}` + body.slice(e);
    } else {
      const s = ref.start - base, e = ref.end - base;
      body = body.slice(0, s) + `__live.${ref.name}` + body.slice(e);
    }
  }
  body = body.replace(/^\n+/, '').replace(/\s+$/, '');

  const depRows = [];
  for (let i = 0; i < valueNames.length; i += 6) depRows.push('    ' + valueNames.slice(i, i + 6).join(', '));
  const moduleSource = [
    '// Auto-extracted from AlloFlowANTI.txt (_alloCmdCtx, the AlloBot command context).',
    '// Edit this file, then rebuild its CDN module. The host shim passes every free',
    '// variable of the original body as `deps`; module-scope bindings that the boot',
    '// sequence upgrades in place arrive as live getters on `deps.__live`.',
    '',
    `function ${EXPORT_NAME}(deps) {`,
    '  const {',
    depRows.join(',\n'),
    '  } = deps;',
    '  const __live = deps.__live;',
    body,
    '}',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, SOURCE_FILE), moduleSource, 'utf8');
  fs.writeFileSync(KEYS_SNAPSHOT, JSON.stringify({ generated: '2026-09-13', count: ctxKeys.length, keys: ctxKeys }, null, 2) + '\n', 'utf8');

  // Host shim.
  const shimRows = [];
  for (let i = 0; i < valueNames.length; i += 8) shimRows.push('      ' + valueNames.slice(i, i + 8).join(', '));
  const liveGetters = liveNames.map(name => `get ${name}() { return ${name}; }`).join(', ');
  const shim = [
    '  // AlloBot command context. The builder lives in allo_command_context_module.js',
    '  // (boot-critical, loaded beside AlloCommands); this shim hands it the current',
    '  // component scope. Returns the last built context (or null) until the module',
    '  // lands — every caller already tolerates a null context.',
    '  const _alloCmdCtx = () => {',
    `    const build = window.AlloModules && window.AlloModules.${MODULE_KEY};`,
    "    if (typeof build !== 'function') {",
    `      try { if (window.__alloModuleRegistry && window.__alloModuleRegistry.${MODULE_KEY} && window.__alloModuleRegistry.${MODULE_KEY}.status === 'failed' && typeof window.__alloRetryModule === 'function') window.__alloRetryModule('${MODULE_KEY}'); } catch (_) {}`,
    '      return _alloCmdCtxRef.current || null;',
    '    }',
    '    return build({',
    shimRows.join(',\n') + ',',
    `      __live: { ${liveGetters} },`,
    '    });',
    '  };',
  ].join('\n');
  let rewritten = source.slice(0, declaration.start) + shim.trimStart() + source.slice(declaration.end);

  // Guards at the two unguarded call sites + the render-time context.
  rewritten = replaceOnce(rewritten,
    '    const ctx = _alloCmdCtxRef.current || _alloCmdCtx();\n    if (!ctx.voiceAvailable) {',
    '    const ctx = _alloCmdCtxRef.current || _alloCmdCtx();\n    if (!ctx || !ctx.voiceAvailable) {',
    'enableGlobalVoiceAccess guard');
  rewritten = replaceOnce(rewritten,
    'onToggleVoiceAgent: () => { const c = _alloCmdCtx(); if (alloVoiceActive) c.stopVoiceLoop(); else c.startVoiceLoop(); }',
    'onToggleVoiceAgent: () => { const c = _alloCmdCtx(); if (!c) return; if (alloVoiceActive) c.stopVoiceLoop(); else c.startVoiceLoop(); }',
    'onToggleVoiceAgent guard');
  rewritten = replaceOnce(rewritten,
    'const _alloRenderCommandContext = isAppReady && window.AlloModules?.AlloCommands ? _alloCmdCtx() : null;',
    `const _alloRenderCommandContext = isAppReady && window.AlloModules?.AlloCommands && window.AlloModules?.${MODULE_KEY} ? _alloCmdCtx() : null;`,
    'render context guard');

  // Boot-critical + eager load beside AlloCommands.
  rewritten = replaceOnce(rewritten,
    "'ConfirmDialog', 'PromptDialog', 'AlloCommands', 'OnboardingCoach', 'OnboardingHelpers'",
    `'ConfirmDialog', 'PromptDialog', 'AlloCommands', '${MODULE_KEY}', 'OnboardingCoach', 'OnboardingHelpers'`,
    'boot-critical set');
  rewritten = insertAfterLine(rewritten, /^\s+loadModule\('AlloCommands', /,
    `    loadModule('${MODULE_KEY}', 'https://alloflow-cdn.pages.dev/${OUTPUT_FILE}?v=PENDING00');`,
    'AlloCommands loadModule line');
  fs.writeFileSync(HOST, rewritten, 'utf8');

  // Builder CONFIGS (plain JS goes through the same Babel wrapper; no JSX involved).
  let builder = fs.readFileSync(BUILDER, 'utf8');
  const configText = [
    `  ${MODULE_KEY}: {`,
    `    source: '${SOURCE_FILE}',`,
    `    output: '${OUTPUT_FILE}',`,
    `    exports: ['${EXPORT_NAME}'],`,
    '  },',
  ].join('\n');
  if (!builder.includes('VideoStudioHostBridgeView: {')) throw new Error('builder anchor missing');
  builder = builder.replace(/(  VideoStudioHostBridgeView: \{[\s\S]*?\n  \},\n)/, `$1${configText}\n`);
  fs.writeFileSync(BUILDER, builder, 'utf8');

  // build.js registration.
  let build = fs.readFileSync(BUILD_JS, 'utf8');
  const moduleEntry = [
    '    {',
    `        name: '${MODULE_KEY}',`,
    `        filename: '${OUTPUT_FILE}',`,
    "        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'",
    '    },',
  ].join('\n');
  const modulesAnchor = /(    \{\n        name: 'VideoStudioHostBridgeView',\n        filename: 'video_studio_host_bridge_module\.js',\n        cdnBase: '[^']+'\n    \},\n)/;
  if (!modulesAnchor.test(build)) throw new Error('build.js MODULES anchor missing');
  build = build.replace(modulesAnchor, `$1${moduleEntry}\n`);
  const pairEntry = [
    '    {',
    `        name: '${MODULE_KEY}',`,
    `        srcPath: path.join(ROOT, '${SOURCE_FILE}'),`,
    `        modPath: path.join(ROOT, '${OUTPUT_FILE}'),`,
    `        publicPath: path.join(ROOT, 'desktop/web-app/public/${OUTPUT_FILE}'),`,
    `        wrap(src) { return require('./_build_first_wave_view_modules.js').buildFirstWaveModule('${MODULE_KEY}', src); },`,
    '    },',
  ].join('\n');
  const pairAnchor = /(    \{\n        name: 'VideoStudioHostBridgeView',\n        srcPath: [^\n]+\n        modPath: [^\n]+\n        publicPath: [^\n]+\n        wrap\(src\) [^\n]+\n    \},\n)/;
  if (!pairAnchor.test(build)) throw new Error('build.js COMPILE_PAIRS anchor missing');
  build = build.replace(pairAnchor, `$1${pairEntry}\n`);
  const pinAnchor = "const CONTENT_HASH_PINNED = new Set([\n";
  if (!build.includes(pinAnchor)) throw new Error('build.js CONTENT_HASH_PINNED anchor missing');
  build = build.replace(pinAnchor, pinAnchor + `    '${OUTPUT_FILE}',\n`);
  fs.writeFileSync(BUILD_JS, build, 'utf8');

  // Build + pin.
  const { buildFirstWaveModule } = require(BUILDER);
  const output = buildFirstWaveModule(MODULE_KEY);
  fs.writeFileSync(path.join(ROOT, OUTPUT_FILE), output, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'desktop', 'web-app', 'public', OUTPUT_FILE), output, 'utf8');
  const pin = sha8(path.join(ROOT, OUTPUT_FILE));
  let host = fs.readFileSync(HOST, 'utf8');
  host = host.replace(`${OUTPUT_FILE}?v=PENDING00`, `${OUTPUT_FILE}?v=${pin}`);
  fs.writeFileSync(HOST, host, 'utf8');
  console.log(`Built ${OUTPUT_FILE} (${Buffer.byteLength(output)} bytes) pin ${pin}; ctx keys ${ctxKeys.length}`);
  console.log('Command context extraction complete.');
}

main();
