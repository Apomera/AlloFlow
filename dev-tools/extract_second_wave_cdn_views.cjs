#!/usr/bin/env node
'use strict';

// Second cold-path CDN wave (2026-09-13). Same contract as
// extract_first_wave_cdn_views.cjs: the monolith is edited by byte range so
// unrelated formatting and in-flight edits survive, every target is asserted by
// a unique source prefix plus a distinctive marker, and the host keeps a
// `_alloCreateFirstWaveCdnView` shim per component so the JSX call sites are
// unchanged apart from the props spread.
//
// New in this wave: a target may be an IIFE `(() => { ...; return (<jsx/>); })()`
// rather than a bare JSX element. Its arrow body becomes the component body.
//
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

const TARGETS = [
  {
    key: 'canvas-recovery-dialog',
    kind: 'jsx',
    startsWith: '<div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 p-4"',
    marker: 'canvas-recovery-title',
    component: 'CanvasRecoveryDialogView',
    moduleKey: 'CanvasRecoveryDialogView',
    sourceFile: 'view_canvas_recovery_dialog_source.jsx',
    displayName: 'Workspace Recovery',
    icon: '🛟',
    overlay: true,
  },
  {
    key: 'ai-backend-settings',
    kind: 'jsx',
    startsWith: '<div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === \'Escape\') e.currentTarget.click(); }} className="fixed inset-0 z-[300]',
    marker: 'ai-backend-canvas-title',
    component: 'AiBackendSettingsView',
    moduleKey: 'ColdPathSurfaces',
    sourceFile: 'view_cold_path_surfaces_source.jsx',
    displayName: 'AI Settings & Diagnostics',
    icon: '⚙️',
    overlay: true,
    closeExpression: '() => setShowAIBackendModal(false)',
  },
  {
    key: 'lms-audit-banner',
    kind: 'jsx',
    startsWith: '<div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 z-[500]">',
    marker: 'lms.queued_one',
    component: 'LmsAuditBannerView',
    moduleKey: 'ColdPathSurfaces',
    sourceFile: 'view_cold_path_surfaces_source.jsx',
    displayName: 'LMS Accessibility Queue',
    icon: '♿',
    overlay: false,
  },
  {
    key: 'read-this-page-panel',
    kind: 'iife',
    startsWith: '(() => {\n          const items = getReadableContent();',
    marker: 'rtp-read-all-btn',
    component: 'ReadThisPagePanelView',
    moduleKey: 'ColdPathSurfaces',
    sourceFile: 'view_cold_path_surfaces_source.jsx',
    displayName: 'Read This Page',
    icon: '🔊',
    overlay: true,
    closeExpression: 'closeReadThisPage',
  },
];

const MODULE_CONFIGS = {
  CanvasRecoveryDialogView: {
    source: 'view_canvas_recovery_dialog_source.jsx',
    output: 'view_canvas_recovery_dialog_module.js',
    exports: ['CanvasRecoveryDialogView'],
    loader: '__alloLazyCanvasRecoveryDialogView',
  },
  ColdPathSurfaces: {
    source: 'view_cold_path_surfaces_source.jsx',
    output: 'view_cold_path_surfaces_module.js',
    exports: ['AiBackendSettingsView', 'LmsAuditBannerView', 'ReadThisPagePanelView'],
    loader: '__alloLazyColdPathSurfaces',
  },
};

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
  if (unbound.size) {
    throw new Error('Unbound identifiers inside target (add to GLOBALS or fix): ' + Array.from(unbound).join(', '));
  }
  return Array.from(names).sort();
}

function componentSource(spec, item) {
  const header = `// Extracted from AlloFlowANTI.txt (${spec.key}).`;
  const propsLine = `  const { ${item.bindings.join(', ')} } = props;`;
  if (spec.kind === 'iife') {
    return [header, `function ${spec.component}(props) {`, propsLine, item.body, '}', ''].join('\n');
  }
  return [header, `function ${spec.component}(props) {`, propsLine, '  return (', item.raw, '  );', '}', ''].join('\n');
}

function hostReplacement(spec, bindings) {
  const metadata = [
    `__alloDisplayName=${JSON.stringify(spec.displayName)}`,
    `__alloOverlay={${spec.overlay ? 'true' : 'false'}}`,
  ];
  if (spec.closeExpression) metadata.push(`__alloOnClose={${spec.closeExpression}}`);
  const propRows = [];
  for (let i = 0; i < bindings.length; i += 8) propRows.push('        ' + bindings.slice(i, i + 8).join(', '));
  return [
    `<${spec.component}`,
    ...metadata.map(value => `        ${value}`),
    '        {...{',
    propRows.join(',\n'),
    '        }}',
    '      />',
  ].join('\n');
}

function insertAfterLine(text, anchorRegex, insertion, label) {
  const lines = text.split('\n');
  const idx = lines.findIndex(line => anchorRegex.test(line));
  if (idx < 0) throw new Error('Anchor not found: ' + label);
  lines.splice(idx + 1, 0, insertion);
  return lines.join('\n');
}

function sha8(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
}

function main() {
  const source = fs.readFileSync(HOST, 'utf8');
  if (TARGETS.every(spec => source.includes(`<${spec.component}`))) {
    console.log('Second-wave CDN views are already extracted.');
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
    if (spec.kind === 'iife') {
      const fn = node.callee;
      if (!fn || fn.type !== 'ArrowFunctionExpression' || fn.body.type !== 'BlockStatement') {
        throw new Error('IIFE target is not an arrow block: ' + spec.key);
      }
      const body = source.slice(fn.body.start + 1, fn.body.end - 1);
      if (/\buse[A-Z][A-Za-z]*\s*\(/.test(body)) throw new Error('IIFE target calls a hook; refusing: ' + spec.key);
      item.body = body.replace(/^\n+/, '').replace(/\s+$/, '');
    }
    found.set(spec.key, item);
  };

  traverse(ast, {
    JSXElement(pathRef) {
      for (const spec of TARGETS) if (spec.kind === 'jsx') consider(spec, pathRef);
    },
    CallExpression(pathRef) {
      for (const spec of TARGETS) if (spec.kind === 'iife') consider(spec, pathRef);
    },
  });

  const missing = TARGETS.filter(spec => !found.has(spec.key));
  if (missing.length) throw new Error('Extraction anchors not found: ' + missing.map(spec => spec.key).join(', '));

  // 1. Source files (grouped per module).
  const sourceOutputs = new Map();
  for (const spec of TARGETS) {
    const item = found.get(spec.key);
    const existing = sourceOutputs.get(spec.sourceFile) || '';
    sourceOutputs.set(spec.sourceFile, existing + componentSource(spec, item) + '\n');
    console.log(`${spec.key}: ${Buffer.byteLength(item.raw)} bytes, ${item.bindings.length} host bindings`);
  }
  for (const [file, contents] of sourceOutputs) {
    const header = '// Auto-extracted cold-path view source. Edit this file, then rebuild its CDN module.\n\n';
    fs.writeFileSync(path.join(ROOT, file), header + contents.replace(/\n+$/, '\n'), 'utf8');
  }

  // 2. Host: replace targets (descending offsets), add shims + lazy loaders.
  let rewritten = source;
  const replacements = Array.from(found.values()).sort((a, b) => b.node.start - a.node.start);
  for (const item of replacements) {
    rewritten = rewritten.slice(0, item.node.start) + hostReplacement(item.spec, item.bindings) + rewritten.slice(item.node.end);
  }
  const shims = TARGETS.map(spec => {
    const cfg = MODULE_CONFIGS[spec.moduleKey];
    return `const ${spec.component} = _alloCreateFirstWaveCdnView('${spec.component}', '${cfg.loader}', '${spec.icon}');`;
  }).join('\n');
  rewritten = insertAfterLine(rewritten, /^const VideoStudioHostBridgeView = _alloCreateFirstWaveCdnView\(/, shims, 'first-wave shim block');
  const loaders = Object.entries(MODULE_CONFIGS).map(([key, cfg]) =>
    `    window.${cfg.loader} = (function() { var L=false; return function() { if(L)return; L=true; loadModule('${key}', 'https://alloflow-cdn.pages.dev/${cfg.output}?v=PENDING00'); }; })();`
  ).join('\n');
  rewritten = insertAfterLine(rewritten, /^\s+window\.__alloLazyShareSessionSurfaces = /, loaders, 'first-wave loader block');
  if (rewritten === source) throw new Error('Extraction produced no host changes');
  fs.writeFileSync(HOST, rewritten, 'utf8');

  // 3. Builder CONFIGS.
  let builder = fs.readFileSync(BUILDER, 'utf8');
  const configText = Object.entries(MODULE_CONFIGS).map(([key, cfg]) => [
    `  ${key}: {`,
    `    source: '${cfg.source}',`,
    `    output: '${cfg.output}',`,
    `    exports: [${cfg.exports.map(name => `'${name}'`).join(', ')}],`,
    '  },',
  ].join('\n')).join('\n');
  if (!builder.includes('VideoStudioHostBridgeView: {')) throw new Error('builder anchor missing');
  builder = builder.replace(/(  VideoStudioHostBridgeView: \{[\s\S]*?\n  \},\n)/, `$1${configText}\n`);
  fs.writeFileSync(BUILDER, builder, 'utf8');

  // 4. build.js: MODULES entries, COMPILE_PAIRS entries, CONTENT_HASH_PINNED.
  let build = fs.readFileSync(BUILD_JS, 'utf8');
  const moduleEntries = Object.entries(MODULE_CONFIGS).map(([key, cfg]) => [
    '    {',
    `        name: '${key}',`,
    `        filename: '${cfg.output}',`,
    "        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'",
    '    },',
  ].join('\n')).join('\n');
  const modulesAnchor = /(    \{\n        name: 'VideoStudioHostBridgeView',\n        filename: 'video_studio_host_bridge_module\.js',\n        cdnBase: '[^']+'\n    \},\n)/;
  if (!modulesAnchor.test(build)) throw new Error('build.js MODULES anchor missing');
  build = build.replace(modulesAnchor, `$1${moduleEntries}\n`);
  const pairEntries = Object.entries(MODULE_CONFIGS).map(([key, cfg]) => [
    '    {',
    `        name: '${key}',`,
    `        srcPath: path.join(ROOT, '${cfg.source}'),`,
    `        modPath: path.join(ROOT, '${cfg.output}'),`,
    `        publicPath: path.join(ROOT, 'desktop/web-app/public/${cfg.output}'),`,
    `        wrap(src) { return require('./_build_first_wave_view_modules.js').buildFirstWaveModule('${key}', src); },`,
    '    },',
  ].join('\n')).join('\n');
  const pairAnchor = /(    \{\n        name: 'VideoStudioHostBridgeView',\n        srcPath: [^\n]+\n        modPath: [^\n]+\n        publicPath: [^\n]+\n        wrap\(src\) [^\n]+\n    \},\n)/;
  if (!pairAnchor.test(build)) throw new Error('build.js COMPILE_PAIRS anchor missing');
  build = build.replace(pairAnchor, `$1${pairEntries}\n`);
  const pinAnchor = "const CONTENT_HASH_PINNED = new Set([\n";
  if (!build.includes(pinAnchor)) throw new Error('build.js CONTENT_HASH_PINNED anchor missing');
  build = build.replace(pinAnchor, pinAnchor + Object.values(MODULE_CONFIGS).map(cfg => `    '${cfg.output}',\n`).join(''));
  fs.writeFileSync(BUILD_JS, build, 'utf8');

  // 5. Build the modules (root + desktop mirror), then pin the loaders by content hash.
  const { buildFirstWaveModule } = require(BUILDER);
  let host = fs.readFileSync(HOST, 'utf8');
  for (const [key, cfg] of Object.entries(MODULE_CONFIGS)) {
    const output = buildFirstWaveModule(key);
    fs.writeFileSync(path.join(ROOT, cfg.output), output, 'utf8');
    fs.writeFileSync(path.join(ROOT, 'desktop', 'web-app', 'public', cfg.output), output, 'utf8');
    const pin = sha8(path.join(ROOT, cfg.output));
    host = host.replace(`${cfg.output}?v=PENDING00`, `${cfg.output}?v=${pin}`);
    console.log(`Built ${cfg.output} (${Buffer.byteLength(output)} bytes) pin ${pin}`);
  }
  fs.writeFileSync(HOST, host, 'utf8');
  console.log('Second-wave CDN view extraction complete.');
}

main();
