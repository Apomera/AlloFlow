'use strict';
// The stdlib-only MCP and the inline/Gemini host share this conservative SVG
// contract without requiring a network-loaded security dependency.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const begin = '// __ALLO_STATIC_SVG_POLICY_BEGIN__';
const end = '// __ALLO_STATIC_SVG_POLICY_END__';
const native = fs.readFileSync(path.join(root, 'agent_core_pack_native_module.js'), 'utf8');
const policy = native.slice(native.indexOf(begin), native.indexOf(end) + end.length).replace(/\r\n/g, '\n');
if (!policy.startsWith(begin) || !policy.endsWith(end)) throw new Error('Static SVG policy markers missing');
const check = process.argv.includes('--check');
for (const rel of ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt']) {
  const file = path.join(root, rel), source = fs.readFileSync(file, 'utf8');
  const a = source.indexOf(begin), b = source.indexOf(end);
  if (a < 0 || b < a) throw new Error('Host policy markers missing in ' + rel);
  const current = source.slice(a, b + end.length).replace(/\r\n/g, '\n');
  if (check && current !== policy) throw new Error('Static SVG policy drift in ' + rel);
  if (!check && current !== policy) {
    const newline = source.includes('\r\n') ? '\r\n' : '\n';
    fs.writeFileSync(file, source.slice(0, a) + policy.replace(/\n/g, newline) + source.slice(b + end.length));
  }
}
console.log('Static SVG policy matches the MCP and all three app hosts.');
