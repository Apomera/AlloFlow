#!/usr/bin/env node
// Extract the canonical English source-of-truth for the Ctrl+K command palette i18n.
// Pulls every t('cmd.X','English') / t('palette.X','English') inline-fallback pair from
// allo_commands_source.jsx, plus the dynamic palette.group.* / palette.ctx.* keys whose
// English lives in the GROUP_LABEL_FALLBACK / CONTEXT_LABEL_FALLBACK maps.
// Output: dev-tools/i18n/cmd_keys_en.json  { "cmd.open_stem_lab": "Open the STEM Lab", ... }
//
// Importable: require() returns { extractFromSource, SRC, OUT }. Run directly to (re)write OUT.
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '..', 'allo_commands_source.jsx');
const OUT = path.join(__dirname, 'cmd_keys_en.json');

const unescape = (s) => s
  .replace(/\\u2019/g, '’').replace(/\\u2026/g, '…')
  .replace(/\\u2192/g, '→').replace(/\\n/g, '\n')
  .replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');

function parseMap(src, name) {
  const re = new RegExp('const ' + name + '\\s*=\\s*\\{([^}]*)\\}', 'm');
  const block = src.match(re);
  const map = {};
  if (block) {
    const entryRe = /(\w+)\s*:\s*'((?:[^'\\]|\\.)*)'/g;
    let e;
    while ((e = entryRe.exec(block[1])) !== null) map[e[1]] = unescape(e[2]);
  }
  return map;
}

// Returns a key-sorted { "cmd.x": "English", ... } object extracted from the source.
function extractFromSource(srcPath) {
  const src = fs.readFileSync(srcPath || SRC, 'utf8');
  const out = {};
  // 1) Inline t('key','value') / t("key","value") fallbacks for cmd.*/palette.* literal keys.
  const patterns = [
    /t\(\s*'((?:cmd|palette)\.[a-z0-9_.]+)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*\)/g,
    /t\(\s*'((?:cmd|palette)\.[a-z0-9_.]+)'\s*,\s*"((?:[^"\\]|\\.)*)"\s*\)/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(src)) !== null) { if (!(m[1] in out)) out[m[1]] = unescape(m[2]); }
  }
  // 2) Dynamic palette.group.<g> / palette.ctx.<c> — English from the *_FALLBACK maps.
  const groups = parseMap(src, 'GROUP_LABEL_FALLBACK');
  for (const g of Object.keys(groups)) out['palette.group.' + g] = groups[g];
  const ctx = parseMap(src, 'CONTEXT_LABEL_FALLBACK');
  for (const c of Object.keys(ctx)) out['palette.ctx.' + c] = ctx[c];
  const sorted = {};
  for (const k of Object.keys(out).sort()) sorted[k] = out[k];
  return sorted;
}

function writeManifest() {
  const sorted = extractFromSource(SRC);
  fs.writeFileSync(OUT, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
  const cmdN = Object.keys(sorted).filter((k) => k.startsWith('cmd.')).length;
  const palN = Object.keys(sorted).filter((k) => k.startsWith('palette.')).length;
  console.log(`[extract_cmd_keys] ${Object.keys(sorted).length} keys -> ${path.relative(process.cwd(), OUT)}`);
  console.log(`  cmd.*: ${cmdN}   palette.*: ${palN}`);
}

module.exports = { extractFromSource, SRC, OUT };
if (require.main === module) writeManifest();
