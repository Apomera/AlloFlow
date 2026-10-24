// GATE: no user-visible English may be hardcoded in word_sounds_module.js.
//
// Word Sounds ships in 63 language packs and serves multilingual K-2 learners,
// but 58 user-visible strings were printed as English literals rather than
// routed through ts()/t() — including the activity instructions a child reads
// ("Tap once for each syllable you hear"), the answer controls (Submit, Reset,
// Listen Again) and a screen-reader label ("Mystery Word"). Nine of them had
// keys that were ALREADY translated in the packs; the module just printed its
// own copy instead of calling them.
//
// This gate parses the module and fails on any NEW hardcoded visible string, so
// the class cannot creep back one component at a time.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
// Files under test; LANE_DIR points the gate at a working copy.
const DIR = process.env.LANE_DIR || process.cwd();
let acorn, src, ast;

// Deliberate exceptions, each with a reason. Keep this list SHORT and justified.
const ALLOWED = new Set([
  // CSV export headers: machine-readable, spreadsheet/SIS imports key on them.
  'Grade', 'Activity', 'Items Attempted', 'Items Correct', 'Accuracy %',
  'Items/Min', 'Duration (s)',
  'CVC/Easy %', 'CVC/Easy n', 'Medium %', 'Medium n', 'Hard %', 'Hard n',
  // Language picker: options are the packs' language names, shown as named.
  '🇺🇸 English',
]);

function looksLikeProse(s) {
  if (!s || s.length < 3) return false;
  if (!/[A-Za-z]/.test(s)) return false;
  if (/^[\s\d.,:;!?/×%+\-—–()]+$/.test(s)) return false;
  if (!/[A-Za-z]{3}/.test(s)) return false;
  if (/^[a-z0-9-]+$/.test(s) && !/ /.test(s)) return false;
  if (/^[a-z_]+\.[a-z_.]+$/.test(s)) return false;
  if (/^(true|false|null|undefined)$/.test(s)) return false;
  return /[A-Z]/.test(s) || / /.test(s);
}

const TEXT_PROPS = ['aria-label', 'title', 'alt', 'placeholder', 'aria-description'];

function walk(node, visit) {
  if (!node || typeof node.type !== 'string') return;
  visit(node);
  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'range') continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && walk(c, visit));
    else if (v && typeof v.type === 'string') walk(v, visit);
  }
}
const isFunction = (n) => /^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(n.type);
const within = (node, scope) => node.start >= scope.start && node.end <= scope.end;

// Every place an element is built: React.createElement(...), a call through a
// local alias of it (`const h = React.createElement; h(...)`), and a call to a
// small helper that passes one of its parameters straight to such a call as a
// child or a text prop (`const button = (label, ...) => h('button', {...}, label)`).
// Aliases and helpers count only inside the function that declares them.
const siteCache = new WeakMap();
function elementSites(tree) {
  if (siteCache.has(tree)) return siteCache.get(tree);
  const scopeOf = new Map();
  (function mark(node, scope) {
    if (!node || typeof node.type !== 'string') return;
    const inner = isFunction(node) ? node : scope;
    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'range') continue;
      const v = node[k];
      if (Array.isArray(v)) v.forEach((c) => { if (c && typeof c.type === 'string') { scopeOf.set(c, inner); mark(c, inner); } });
      else if (v && typeof v.type === 'string') { scopeOf.set(v, inner); mark(v, inner); }
    }
  })(tree, tree);

  const aliases = [];
  walk(tree, (n) => {
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init?.type === 'MemberExpression' &&
        !n.init.computed && n.init.property?.name === 'createElement') aliases.push({ name: n.id.name, scope: scopeOf.get(n) });
  });
  const isCreate = (n) => n?.type === 'CallExpression' && (
    (n.callee.type === 'MemberExpression' && !n.callee.computed && n.callee.property?.name === 'createElement') ||
    (n.callee.type === 'Identifier' && aliases.some((a) => a.name === n.callee.name && within(n, a.scope))));

  const helpers = [];
  walk(tree, (n) => {
    let name, fn;
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init && isFunction(n.init)) { name = n.id.name; fn = n.init; }
    else if (n.type === 'FunctionDeclaration' && n.id) { name = n.id.name; fn = n; }
    if (!fn) return;
    const params = new Map(fn.params.map((p, index) => [p.type === 'Identifier' ? p.name : null, index]));
    params.delete(null);
    if (!params.size) return;
    const slots = [];
    walk(fn.body, (c) => {
      if (!isCreate(c)) return;
      const args = c.arguments;
      for (let i = 2; i < args.length; i++) if (args[i].type === 'Identifier' && params.has(args[i].name)) slots.push({ index: params.get(args[i].name), prop: null });
      if (args[1]?.type === 'ObjectExpression') {
        for (const q of args[1].properties) {
          const key = q.key && (q.key.name || q.key.value);
          if (TEXT_PROPS.includes(key) && q.value?.type === 'Identifier' && params.has(q.value.name)) slots.push({ index: params.get(q.value.name), prop: key });
        }
      }
    });
    if (slots.length) helpers.push({ name, slots, scope: scopeOf.get(n) });
  });

  const sites = [];
  walk(tree, (n) => {
    if (isCreate(n)) {
      const args = n.arguments || [];
      const props = [];
      if (args[1]?.type === 'ObjectExpression') {
        for (const p of args[1].properties) {
          const name = p.key && (p.key.name || p.key.value);
          if (TEXT_PROPS.includes(name)) props.push({ name, node: p.value });
        }
      }
      sites.push({ tag: args[0], children: args.slice(2), props });
    } else if (n.type === 'CallExpression' && n.callee.type === 'Identifier') {
      for (const helper of helpers) {
        if (helper.name !== n.callee.name || !within(n, helper.scope)) continue;
        const children = [], props = [];
        for (const slot of helper.slots) {
          const arg = n.arguments[slot.index];
          if (!arg) continue;
          if (slot.prop) props.push({ name: slot.prop, node: arg }); else children.push(arg);
        }
        sites.push({ tag: null, children, props });
      }
    }
  });
  siteCache.set(tree, sites);
  return sites;
}

function collect(tree = ast) {
  const out = [];
  for (const site of elementSites(tree)) {
    for (const a of site.children) {
      if (a && a.type === 'Literal' && typeof a.value === 'string' &&
          looksLikeProse(a.value) && !ALLOWED.has(a.value.trim())) {
        out.push({ line: a.loc.start.line, text: a.value, kind: 'child' });
      }
    }
    for (const p of site.props) {
      if (p.node && p.node.type === 'Literal' && typeof p.node.value === 'string' &&
          looksLikeProse(p.node.value) && !ALLOWED.has(p.node.value.trim())) {
        out.push({ line: p.node.loc.start.line, text: p.node.value, kind: p.name });
      }
    }
  }
  return out;
}

// The direct scan above only sees a literal passed straight to createElement.
// 2026-10-16 found 47 more that reached the screen through a ternary
// (`on ? "Hide word" : "Show word"`), concatenation ('I heard: “' + answer)
// or a template string. This follows those shapes; `ts(...) || "English"` is
// the sanctioned fallback and is not flagged.
const isTranslatorCall = (n) => n && n.type === 'CallExpression' && n.callee &&
  ((n.callee.type === 'Identifier' && /^(ts|t|tr|translate|translateCount|reviewText)$/.test(n.callee.name)) ||
   n.callee.type === 'MemberExpression');
function exposedLiterals(node, out, nested) {
  if (!node) return;
  switch (node.type) {
    case 'Literal':
      if (nested && typeof node.value === 'string') out.push({ text: node.value, line: node.loc.start.line });
      return;
    case 'TemplateLiteral':
      node.quasis.forEach((q) => out.push({ text: q.value.cooked, line: q.loc.start.line }));
      node.expressions.forEach((e) => exposedLiterals(e, out, true));
      return;
    case 'ConditionalExpression':
      exposedLiterals(node.consequent, out, true); exposedLiterals(node.alternate, out, true);
      return;
    case 'BinaryExpression':
      if (node.operator === '+') { exposedLiterals(node.left, out, true); exposedLiterals(node.right, out, true); }
      return;
    case 'LogicalExpression':
      if (node.operator === '||' && (isTranslatorCall(node.left) ||
        (node.left.type === 'LogicalExpression' && (isTranslatorCall(node.left.left) || isTranslatorCall(node.left.right))))) return;
      exposedLiterals(node.left, out, true); exposedLiterals(node.right, out, true);
      return;
    default:
  }
}
function collectNested(tree = ast) {
  const out = [];
  for (const site of elementSites(tree)) {
    if (site.tag?.type === 'Literal' && site.tag.value === 'style') continue;
    const found = [];
    site.children.forEach((c) => exposedLiterals(c, found, false));
    site.props.forEach((p) => exposedLiterals(p.node, found, false));
    found.filter((f) => looksLikeProse(String(f.text).trim()) && !ALLOWED.has(String(f.text).trim())).forEach((f) => out.push(f));
  }
  return out;
}

// Calibration: the scan must see English planted through each shape it claims
// to cover, and must not flag the sanctioned fallback or a non-element `h`.
const PLANTED = `
function Panel({ busy }) {
  const h = React.createElement;
  const button = (label, onClick) => h('button', { type: 'button', onClick }, label);
  const icon = (name) => h('span', { 'aria-label': name });
  return h('div', { 'aria-label': 'Planted label' },
    h('p', null, 'Planted child'),
    h('p', null, busy ? 'Planted branch' : ts('word_sounds.ok') || 'Sanctioned fallback'),
    h('p', null, 'Planted ' + busy),
    button('Planted helper', () => {}),
    icon('Planted helper prop'));
}
function Other() { const h = (text) => text; return h('Not an element'); }
`;

beforeAll(() => {
  acorn = require(resolve(process.cwd(), 'node_modules/acorn'));
  src = readFileSync(resolve(DIR, 'word_sounds_module.js'), 'utf8');
  ast = acorn.parse(src, { ecmaVersion: 2022, ranges: true, locations: true });
});

describe('Word Sounds localization gate', () => {
  it('sees English planted through an h() alias and a button()-style helper', () => {
    const planted = acorn.parse(PLANTED, { ecmaVersion: 2022, ranges: true, locations: true });
    const direct = collect(planted).map((f) => f.text).sort();
    const nested = collectNested(planted).map((f) => f.text).sort();
    expect(direct).toEqual(['Planted child', 'Planted helper', 'Planted helper prop', 'Planted label']);
    expect(nested).toEqual(['Planted ', 'Planted branch']);
  });

  it('has no hardcoded user-visible English', () => {
    const found = collect();
    const report = found.map((f) => `  line ${f.line} [${f.kind}] ${JSON.stringify(f.text).slice(0, 80)}`).join('\n');
    expect(found, `hardcoded user-visible strings (route through ts()/t()):\n${report}`).toEqual([]);
  });

  it('has no hardcoded English inside ternaries, concatenation or template strings', () => {
    const found = collectNested();
    const report = found.map((f) => `  line ${f.line} ${JSON.stringify(f.text).slice(0, 80)}`).join('\n');
    expect(found, `hardcoded user-visible strings (route through ts(), keep the English as its || fallback):\n${report}`).toEqual([]);
  });

  it('every ts() key the module uses is registered in allo_data', () => {
    const alloData = readFileSync(resolve(DIR, 'allo_data_source.jsx'), 'utf8');
    const used = [...new Set((src.match(/ts\("(word_sounds\.[a-z0-9_]+)"/g) || [])
      .map((m) => m.replace(/ts\("|"/g, '')))];
    expect(used.length, 'expected the module to use many keys').toBeGreaterThan(50);
    const missing = used.filter((k) => !alloData.includes(`'${k}':`));
    expect(missing, `keys used but never registered (they will fall back to English forever):\n  ${missing.join('\n  ')}`).toEqual([]);
  });

  it('every word_sounds key passed to a component translator helper is registered in allo_data', () => {
    const alloData = readFileSync(resolve(DIR, 'allo_data_source.jsx'), 'utf8');
    // A literal followed by `+` is a composed key prefix ("word_sounds.activity_" + id), not a key.
    const used = [...new Set([...src.matchAll(/\b(?:tr|trp|label|translate|reviewText)\(\s*['"](word_sounds\.[a-z0-9_]+)['"](?!\s*\+)/g)].map((m) => m[1]))];
    expect(used.length, 'expected the editor and panels to use many keys').toBeGreaterThan(50);
    const missing = used.filter((k) => !alloData.includes(`'${k}':`) && !alloData.includes(`"${k}":`));
    expect(missing, `keys used but never registered:\n  ${missing.join('\n  ')}`).toEqual([]);
  });

  it('concatenation fragments use {{params}}, not glued English word order', () => {
    // "Word " + n + " of " + goal cannot be translated — the word order is baked
    // into the JS. These must be single parameterised keys.
    for (const key of ['word_sounds.word_n_of_m', 'word_sounds.correct_of_total',
      'word_sounds.sound_n', 'word_sounds.option_n', 'word_sounds.level_n',
      'word_sounds.items_done_of']) {
      expect(src.includes(key), `${key} should be used for a phrase that was previously concatenated`).toBe(true);
    }
  });
});
