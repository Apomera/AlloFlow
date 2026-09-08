const fs = require('fs');
const crypto = require('crypto');
const { transformSync } = require('esbuild');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const out = 'reports/document-builder-refinements-2026-09-08/runtime-verification.json';
const read = path => fs.readFileSync(path, 'utf8');
const compile = source => transformSync(source, { loader: 'jsx', target: 'es2020', format: 'esm', jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment' }).code.replace(/\/\*.*global.*\*\/\n/g, '').trim();
const builder = read('view_export_preview_module.js');
const pdf = read('view_pdf_audit_module.js');
const results = {
  builderContainsCurrentSource: builder.includes(compile('/* global React */\n' + read('view_export_preview_source.jsx'))),
  officeContainsCurrentSource: pdf.includes(read('remediation_review_helpers.js')) && pdf.includes(compile('\n/* global React */\n' + read('remediation_review_component.jsx') + '\n' + read('view_pdf_audit_source.jsx') + '\n')),
  exportContainsCurrentSource: read('export_module.js').includes(read('export_source.jsx').trim()),
  mirrorParity: {},
  hostParity: {},
  sourceHashes: {},
  unexpectedGlobals: [],
};
for (const file of ['view_export_preview_module.js', 'view_pdf_audit_module.js', 'export_module.js', 'export_handlers_module.js']) {
  results.mirrorParity[file] = fs.readFileSync(file).equals(fs.readFileSync('desktop/web-app/public/' + file));
  results.sourceHashes[file] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
for (const file of ['desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) results.hostParity[file] = fs.readFileSync(file).equals(fs.readFileSync('AlloFlowANTI.txt'));
for (const file of ['view_export_preview_source.jsx', 'view_pdf_audit_source.jsx', 'export_source.jsx', 'AlloFlowANTI.txt']) results.sourceHashes[file] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
// Babel resolves lexically scoped bindings, including declarations after their
// referencing functions; the older standalone scanner reports those as free.
const allowed = new Set(['window', 'document', 'console', 'Function', 'Number', 'Boolean', 'String', 'Array', 'Object', 'Set', 'Map', 'JSON', 'Math', 'Date', 'parseFloat', 'parseInt', 'NodeFilter', 'Intl', 'DOMParser', 'Uint16Array', 'globalThis', 'TextEncoder', 'Uint8Array', 'setTimeout', 'clearTimeout', 'Error', 'encodeURIComponent', 'URL', 'fetch', 'AbortController', 'Promise', 'CustomEvent', 'FileReader', 'Event', 'Blob', 'XMLSerializer', 'navigator', 'prompt', 'undefined']);
traverse(parse(builder, { sourceType: 'script' }), { ReferencedIdentifier(path) {
  if (!path.scope.getBinding(path.node.name) && !allowed.has(path.node.name)) results.unexpectedGlobals.push({ name: path.node.name, line: path.node.loc.start.line });
} });
results.passed = results.builderContainsCurrentSource && results.officeContainsCurrentSource && results.exportContainsCurrentSource
  && Object.values(results.mirrorParity).every(Boolean) && Object.values(results.hostParity).every(Boolean) && results.unexpectedGlobals.length === 0;
fs.writeFileSync(out, JSON.stringify(results, null, 2));
console.log(JSON.stringify({ ...results, sourceHashes: undefined }));
if (!results.passed) process.exitCode = 1;
