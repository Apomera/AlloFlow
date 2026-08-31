#!/usr/bin/env node
'use strict';

// One-time, AST-anchored extraction for the first cold-path CDN wave.
//
// The monolith is intentionally edited by byte range rather than regenerated
// from Babel so unrelated formatting and in-flight user changes are preserved.
// Each target is asserted by both its source line and a distinctive marker.

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const ROOT = path.resolve(__dirname, '..');
const HOST = path.join(ROOT, 'AlloFlowANTI.txt');

const GLOBALS = new Set([
  'Array', 'Blob', 'Boolean', 'CustomEvent', 'Date', 'Error', 'JSON', 'Map',
  'Math', 'NaN', 'Number', 'Object', 'Promise', 'React', 'Set', 'String', 'URL',
  'clearInterval', 'clearTimeout', 'console', 'document', 'navigator',
  'parseFloat', 'parseInt', 'requestAnimationFrame', 'setInterval', 'setTimeout',
  'undefined', 'window',
]);

const TARGETS = [
  {
    key: 'live-session-dock',
    line: 54247,
    marker: 'liveDockPanelRef',
    component: 'LiveSessionDockView',
    sourceFile: 'view_live_session_dock_source.jsx',
    displayName: 'Live Session Dashboard',
    overlay: false,
    closeExpression: '() => setShowLiveDock(false)',
  },
  {
    key: 'full-pack-run',
    line: 51337,
    marker: 'tour-tool-fullpack',
    component: 'FullPackRunView',
    sourceFile: 'view_full_pack_run_source.jsx',
    displayName: 'Full Pack',
    overlay: false,
  },
  {
    key: 'homework-qr',
    line: 49680,
    marker: 'alloflow-homework-qr-title',
    component: 'HomeworkQrDialogView',
    sourceFile: 'view_share_session_surfaces_source.jsx',
    displayName: 'Homework QR',
    overlay: false,
    closeExpression: '() => setQrShareModal(null)',
    appendSource: true,
  },
  {
    key: 'class-mailbox-setup',
    line: 49819,
    marker: 'copyMailboxScriptSource',
    component: 'ClassMailboxSetupView',
    sourceFile: 'view_share_session_surfaces_source.jsx',
    displayName: 'Class Mailbox',
    overlay: false,
    closeExpression: '() => setMbPanelOpen(false)',
    appendSource: true,
  },
  {
    key: 'video-studio-host-bridge',
    line: 56681,
    marker: 'moduleKey="VideoStudio"',
    component: 'VideoStudioHostBridgeView',
    sourceFile: 'video_studio_host_bridge_source.jsx',
    displayName: 'Video Studio',
    overlay: true,
    closeExpression: '() => setIsVideoStudioOpen(false)',
    activeExpression: 'isVideoStudioOpen',
  },
];

function externalBindings(pathRef, node) {
  const names = new Set();
  pathRef.traverse({
    ReferencedIdentifier(identifierPath) {
      const name = identifierPath.node.name;
      if (GLOBALS.has(name)) return;
      const binding = identifierPath.scope.getBinding(name);
      if (binding && binding.path.node.start >= node.start && binding.path.node.end <= node.end) return;
      names.add(name);
    },
  });
  return Array.from(names).sort();
}

function componentSource(spec, raw, bindings) {
  return [
    `// Extracted from AlloFlowANTI.txt (${spec.key}).`,
    `function ${spec.component}(props) {`,
    `  const { ${bindings.join(', ')} } = props;`,
    '  return (',
    raw,
    '  );',
    '}',
    '',
  ].join('\n');
}

function hostReplacement(spec, bindings) {
  const metadata = [
    `__alloDisplayName=${JSON.stringify(spec.displayName)}`,
    `__alloOverlay={${spec.overlay ? 'true' : 'false'}}`,
  ];
  if (spec.closeExpression) metadata.push(`__alloOnClose={${spec.closeExpression}}`);
  if (spec.activeExpression) metadata.push(`__alloActive={${spec.activeExpression}}`);
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

function main() {
  const source = fs.readFileSync(HOST, 'utf8');
  const alreadyExtracted = TARGETS.every(spec => source.includes(`<${spec.component}`))
    && /const ALLO_MB_SCRIPT_FALLBACK_GZIP = ''/.test(source);
  if (alreadyExtracted) {
    console.log('First-wave CDN views are already extracted.');
    return;
  }
  const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
  const found = new Map();
  let mailboxFallbackLiteral = null;

  traverse(ast, {
    VariableDeclarator(pathRef) {
      if (pathRef.node.id && pathRef.node.id.name === 'ALLO_MB_SCRIPT_FALLBACK_GZIP') {
        mailboxFallbackLiteral = pathRef.node.init;
      }
    },
    JSXElement(pathRef) {
      const line = pathRef.node.loc && pathRef.node.loc.start.line;
      const spec = TARGETS.find(item => item.line === line);
      if (!spec || found.has(spec.key)) return;
      const raw = source.slice(pathRef.node.start, pathRef.node.end);
      if (!raw.includes(spec.marker)) return;
      found.set(spec.key, {
        spec,
        node: pathRef.node,
        raw,
        bindings: externalBindings(pathRef, pathRef.node),
      });
    },
  });

  const missing = TARGETS.filter(spec => !found.has(spec.key));
  if (missing.length) {
    throw new Error('Extraction anchors not found: ' + missing.map(spec => spec.key).join(', '));
  }
  if (!mailboxFallbackLiteral || mailboxFallbackLiteral.type !== 'StringLiteral') {
    throw new Error('Embedded mailbox fallback literal was not found');
  }

  const sourceOutputs = new Map();
  for (const spec of TARGETS) {
    const item = found.get(spec.key);
    const existing = sourceOutputs.get(spec.sourceFile) || '';
    sourceOutputs.set(spec.sourceFile, existing + componentSource(spec, item.raw, item.bindings));
    console.log(`${spec.key}: ${Buffer.byteLength(item.raw)} bytes, ${item.bindings.length} host bindings`);
  }

  for (const [file, contents] of sourceOutputs) {
    const header = '// Auto-extracted cold-path view source. Edit this file, then rebuild its CDN module.\n\n';
    fs.writeFileSync(path.join(ROOT, file), header + contents, 'utf8');
  }

  let rewritten = source;
  const replacements = Array.from(found.values()).sort((left, right) => right.node.start - left.node.start);
  for (const item of replacements) {
    rewritten = rewritten.slice(0, item.node.start)
      + hostReplacement(item.spec, item.bindings)
      + rewritten.slice(item.node.end);
  }
  rewritten = rewritten.slice(0, mailboxFallbackLiteral.start)
    + "''"
    + rewritten.slice(mailboxFallbackLiteral.end);

  if (rewritten === source) throw new Error('Extraction produced no host changes');
  fs.writeFileSync(HOST, rewritten, 'utf8');
  console.log('First-wave CDN view extraction complete.');
}

main();
