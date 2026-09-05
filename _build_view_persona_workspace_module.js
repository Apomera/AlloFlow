#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { transformSync } = require('esbuild');
const ROOT = __dirname;
function buildPersonaWorkspaceModule(source) {
  const compiled = transformSync(source, { loader: 'jsx', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment', target: 'es2020' }).code;
  return '/* AlloFlow - AGPL-3.0-only. Generated from view_persona_workspace_source.jsx. */\n(function() {\n"use strict";\nif (window.AlloModules && window.AlloModules.PersonaWorkspace) return;\nvar React = window.React;\n' + compiled + '\nwindow.AlloModules = window.AlloModules || {};\nwindow.AlloModules.PersonaWorkspace = { PersonaWorkspaceView };\n})();\n';
}
function build({ check = false } = {}) {
  const source = fs.readFileSync(path.join(ROOT, 'view_persona_workspace_source.jsx'), 'utf8');
  const output = buildPersonaWorkspaceModule(source);
  for (const relative of ['view_persona_workspace_module.js', 'desktop/web-app/public/view_persona_workspace_module.js']) {
    const file = path.join(ROOT, relative);
    if (check) { if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== output) throw Error('Stale/missing Persona workspace: ' + relative); }
    else { if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== output) fs.writeFileSync(file, output); }
  }
  return output;
}
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check')) throw Error('Usage: node _build_view_persona_workspace_module.js [--check]');
  console.log('Persona workspace:', Buffer.byteLength(build({ check: args.includes('--check') })), 'bytes');
}
module.exports = { buildPersonaWorkspaceModule, build };
