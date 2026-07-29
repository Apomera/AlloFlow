#!/usr/bin/env node
// check_agent_core_mirrors.cjs — byte-equality gate for hand-mirrored modules.
//
// Why this exists (2026-07-28):
//   The agent_core_* modules are PLAIN JS — no *_source.jsx, no builder. They
//   are edited in place at the repo root and copied by hand to
//   desktop/web-app/public/. Nothing checked that the copy happened.
//
//   That matters more than a normal mirror because the two copies have
//   DIFFERENT CONSUMERS:
//     • desktop/mcp/alloflow-mcp-stdio.cjs requires the ROOT copy directly
//       (require('../../agent_core_blueprint_service_module.js')) — an MCP
//       agent runs against root.
//     • the web app loads the desktop/web-app/public copy.
//   So drift does not merely ship stale code: it makes an external agent and
//   the teacher's UI disagree about the same contract — the agent validates a
//   blueprint against one set of rules and the UI executes it under another.
//
//   check_module_freshness covers source→module pairs. These are
//   module→mirror pairs and fall through it.
//
// The rule: each listed pair must be byte-identical. Fix by copying root over
// the mirror (there is no build step to run).

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAIRS = [
  'agent_core_contracts_module.js',
  'agent_core_blueprint_service_module.js',
  'agent_core_ui_adapter_module.js',
];
const MIRROR_DIR = path.join('desktop', 'web-app', 'public');

const errors = [];
let checked = 0;

for (const rel of PAIRS) {
  const rootPath = path.join(ROOT, rel);
  const mirrorPath = path.join(ROOT, MIRROR_DIR, rel);
  if (!fs.existsSync(rootPath)) { errors.push(`missing root copy: ${rel}`); continue; }
  if (!fs.existsSync(mirrorPath)) { errors.push(`missing mirror: ${MIRROR_DIR}/${rel}`); continue; }
  checked++;
  const a = fs.readFileSync(rootPath);
  const b = fs.readFileSync(mirrorPath);
  if (!a.equals(b)) {
    errors.push(
      `${rel} DRIFT (root ${a.length}B vs mirror ${b.length}B)\n` +
      `      fix:  cp ${rel} ${MIRROR_DIR}/${rel}`
    );
  }
}

// Second guard: the MCP server must keep requiring the ROOT copy. If someone
// repoints it at the mirror, the drift above stops being detectable from here.
const mcpPath = path.join(ROOT, 'desktop', 'mcp', 'alloflow-mcp-stdio.cjs');
if (fs.existsSync(mcpPath)) {
  const mcp = fs.readFileSync(mcpPath, 'utf8');
  if (!/require\(path\.join\(__dirname, '\.\.', '\.\.', 'agent_core_blueprint_service_module\.js'\)\)/.test(mcp)) {
    errors.push(
      'desktop/mcp/alloflow-mcp-stdio.cjs no longer requires the ROOT agent_core_blueprint_service_module.js.\n' +
      '      If that is intentional, update this gate — the root/mirror split is only meaningful\n' +
      '      while MCP and the web app read different copies.'
    );
  }
}

if (errors.length) {
  console.error('\n✗ check_agent_core_mirrors FAILED\n');
  for (const e of errors) console.error('  • ' + e);
  console.error('\n  These modules have no builder — the mirror is a manual copy, and an MCP');
  console.error('  agent reads the root while the web app reads the mirror.\n');
  process.exit(1);
}

console.log(`✓ check_agent_core_mirrors: ${checked} hand-mirrored agent_core module(s) byte-identical; MCP still reads the root copy.`);
