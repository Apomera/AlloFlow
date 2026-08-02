// GATE: a STEM tool's translator keys must exist in ui_strings.
//
// STEM tools call t('stem.<ns>.<key>', 'English fallback'). The English second
// argument makes the tool LOOK localized — it renders fine and the call site is
// wired — but the 63 language packs mirror ui_strings, so a key absent from
// ui_strings can never be translated. It is English in every language forever,
// no matter how much translation work is done downstream.
//
// This is the same defect found in Word Sounds (111 keys called but never
// registered). Measured across stem_lab on 2026-07-28: 13 tools were in this
// state. areaperimeter has been fixed; the rest are baselined below so the
// category cannot grow while it is worked through.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

// Tools known to call keys that are not yet in ui_strings. Shrink this list as
// each is extracted; never add to it.
const BASELINE_UNREGISTERED = new Set([
  'arithmetic', 'circuitshelf', 'freeforms', 'magnetism',
  'moleculeshelf', 'ratios', 'simshelf', 'spacestation', 'timeline',
  'timeschedule', 'zoomgallery',
]);

let acorn, ui, tools;

function keysCalledBy(src) {
  const ast = acorn.parse(src, { ecmaVersion: 2022, ranges: true, locations: true });
  const out = new Set();
  (function walk(node) {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'CallExpression') {
      const c = node.callee;
      const name = c.type === 'Identifier' ? c.name
        : (c.type === 'MemberExpression' && c.property ? c.property.name : null);
      if (name === 't' || name === '__alloT') {
        const a0 = node.arguments[0];
        if (a0 && a0.type === 'Literal' && typeof a0.value === 'string' && a0.value.startsWith('stem.')) {
          out.add(a0.value);
        }
      }
    }
    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'range') continue;
      const v = node[k];
      if (Array.isArray(v)) v.forEach((x) => x && typeof x.type === 'string' && walk(x));
      else if (v && typeof v.type === 'string') walk(v);
    }
  })(ast);
  return [...out];
}

const resolveKey = (obj, dotted) => dotted.split('.').reduce((a, p) => (a && typeof a === 'object' ? a[p] : undefined), obj);

beforeAll(() => {
  acorn = require(resolve(process.cwd(), 'node_modules/acorn'));
  ui = JSON.parse(readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8'));
  tools = readdirSync(resolve(process.cwd(), 'stem_lab'))
    .filter((f) => /^stem_tool_.*\.js$/.test(f))
    .map((f) => ({ slug: f.replace(/^stem_tool_|\.js$/g, ''), path: resolve(process.cwd(), 'stem_lab', f) }));
});

describe('STEM translator keys are registered in ui_strings', () => {
  it('finds the stem_lab tools', () => {
    expect(tools.length).toBeGreaterThan(100);
  });

  it('no NEW tool calls keys that ui_strings does not define', () => {
    const offenders = [];
    for (const { slug, path } of tools) {
      if (BASELINE_UNREGISTERED.has(slug)) continue;
      const called = keysCalledBy(readFileSync(path, 'utf8'));
      if (!called.length) continue;
      const missing = called.filter((k) => typeof resolveKey(ui, k) !== 'string');
      if (missing.length) offenders.push(`${slug}: ${missing.length} missing (e.g. ${missing.slice(0, 3).join(', ')})`);
    }
    expect(offenders, `these tools call keys absent from ui_strings, so they can never be translated:\n  ${offenders.join('\n  ')}`).toEqual([]);
  });

  it('areaperimeter is fully registered', () => {
    const t = tools.find((x) => x.slug === 'areaperimeter');
    expect(t, 'areaperimeter tool not found').toBeTruthy();
    const called = keysCalledBy(readFileSync(t.path, 'utf8'));
    expect(called.length).toBeGreaterThan(200);
    const missing = called.filter((k) => typeof resolveKey(ui, k) !== 'string');
    expect(missing, `still unregistered: ${missing.slice(0, 5).join(', ')}`).toEqual([]);
  });

  it('the baseline only lists tools that are genuinely still unregistered', () => {
    // Stops the baseline from rotting: once a tool is fixed it must be removed,
    // otherwise the gate silently stops protecting it.
    const stillBroken = [];
    for (const slug of BASELINE_UNREGISTERED) {
      const t = tools.find((x) => x.slug === slug);
      if (!t) continue;
      const called = keysCalledBy(readFileSync(t.path, 'utf8'));
      const missing = called.filter((k) => typeof resolveKey(ui, k) !== 'string');
      if (missing.length) stillBroken.push(slug);
    }
    const fixed = [...BASELINE_UNREGISTERED].filter((s) => tools.find((x) => x.slug === s) && !stillBroken.includes(s));
    expect(fixed, `these are fixed — remove them from BASELINE_UNREGISTERED: ${fixed.join(', ')}`).toEqual([]);
  });
});
