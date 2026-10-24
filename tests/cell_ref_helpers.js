// Shared helpers for the REF lane tests. Location-independent: every repo path is
// built from process.cwd() (the repo root), so these work from lanes/REF/tests or tests/.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

export const SRC_PATH = 'stem_lab/stem_tool_cell.js';
const req = createRequire(resolve(process.cwd(), 'tests/_cell_ref_helpers.js'));
export const React = req(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
const acorn = req('acorn');

let cachedSrc = null;
export function source() {
  if (cachedSrc == null) cachedSrc = readFileSync(SRC_PATH, 'utf8');
  return cachedSrc;
}
// Evaluate one array literal from inside render() (ORGANISM_DB, CELL_GLOSSARY...).
export function extractArray(name) {
  const src = source();
  const ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script' });
  let node = null;
  (function walk(n) {
    if (node || !n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'VariableDeclarator' && n.id && n.id.name === name && n.init && n.init.type === 'ArrayExpression') { node = n.init; return; }
    for (const k of Object.keys(n)) if (k !== 'loc') walk(n[k]);
  })(ast);
  if (!node) throw new Error(name + ' not found');
  // eslint-disable-next-line no-new-func
  return new Function('return ' + src.slice(node.start, node.end))();
}
export async function harness() {
  return import(pathToFileURL(resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js')).href);
}
// Raw values a student must never see (text or attributes; CSS blocks excluded).
export function leaks(html) {
  const markup = html.replace(/<style[\s\S]*?<\/style>/g, ' ');
  const out = ['undefined', 'NaN', 'Infinity'].filter(w => new RegExp('\\b' + w + '\\b').test(markup));
  if (markup.includes('[object Object]')) out.push('[object Object]');
  return out;
}
