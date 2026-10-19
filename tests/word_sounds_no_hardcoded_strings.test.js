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

function isFallbackOfTranslator(parent) {
  if (!parent || parent.type !== 'LogicalExpression' || parent.operator !== '||') return false;
  const callish = (n) => n && n.type === 'CallExpression' && n.callee &&
    ((n.callee.type === 'Identifier' && (n.callee.name === 'ts' || n.callee.name === 't')) ||
     n.callee.type === 'MemberExpression');
  if (callish(parent.left)) return true;
  if (parent.left && parent.left.type === 'LogicalExpression') {
    return callish(parent.left.left) || callish(parent.left.right);
  }
  return false;
}

function collect() {
  const out = [];
  (function walk(node, parent) {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'CallExpression' && node.callee &&
        node.callee.type === 'MemberExpression' &&
        node.callee.property && node.callee.property.name === 'createElement') {
      const args = node.arguments || [];
      for (let i = 2; i < args.length; i++) {
        const a = args[i];
        if (a && a.type === 'Literal' && typeof a.value === 'string' &&
            looksLikeProse(a.value) && !isFallbackOfTranslator(node) &&
            !ALLOWED.has(a.value.trim())) {
          out.push({ line: a.loc.start.line, text: a.value, kind: 'child' });
        }
      }
      const props = args[1];
      if (props && props.type === 'ObjectExpression') {
        for (const p of props.properties) {
          if (!p.key) continue;
          const name = p.key.name || p.key.value;
          if (!['aria-label', 'title', 'alt', 'placeholder', 'aria-description'].includes(name)) continue;
          if (p.value && p.value.type === 'Literal' && typeof p.value.value === 'string' &&
              looksLikeProse(p.value.value) && !ALLOWED.has(p.value.value.trim())) {
            out.push({ line: p.value.loc.start.line, text: p.value.value, kind: name });
          }
        }
      }
    }
    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'range') continue;
      const v = node[k];
      if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && walk(c, node));
      else if (v && typeof v.type === 'string') walk(v, node);
    }
  })(ast, null);
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
function collectNested() {
  const out = [];
  (function walk(node) {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'CallExpression' && node.callee?.type === 'MemberExpression' &&
        node.callee.property?.name === 'createElement' &&
        !(node.arguments[0]?.type === 'Literal' && node.arguments[0].value === 'style')) {
      const args = node.arguments || [];
      const found = [];
      for (let i = 2; i < args.length; i++) exposedLiterals(args[i], found, false);
      if (args[1]?.type === 'ObjectExpression') {
        for (const p of args[1].properties) {
          const name = p.key && (p.key.name || p.key.value);
          if (['aria-label', 'title', 'alt', 'placeholder', 'aria-description'].includes(name)) exposedLiterals(p.value, found, false);
        }
      }
      found.filter((f) => looksLikeProse(String(f.text).trim()) && !ALLOWED.has(String(f.text).trim())).forEach((f) => out.push(f));
    }
    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'range') continue;
      const v = node[k];
      if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && walk(c));
      else if (v && typeof v.type === 'string') walk(v);
    }
  })(ast);
  return out;
}

beforeAll(() => {
  acorn = require(resolve(process.cwd(), 'node_modules/acorn'));
  src = readFileSync(resolve(process.cwd(), 'word_sounds_module.js'), 'utf8');
  ast = acorn.parse(src, { ecmaVersion: 2022, ranges: true, locations: true });
});

describe('Word Sounds localization gate', () => {
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
    const alloData = readFileSync(resolve(process.cwd(), 'allo_data_source.jsx'), 'utf8');
    const used = [...new Set((src.match(/ts\("(word_sounds\.[a-z0-9_]+)"/g) || [])
      .map((m) => m.replace(/ts\("|"/g, '')))];
    expect(used.length, 'expected the module to use many keys').toBeGreaterThan(50);
    const missing = used.filter((k) => !alloData.includes(`'${k}':`));
    expect(missing, `keys used but never registered (they will fall back to English forever):\n  ${missing.join('\n  ')}`).toEqual([]);
  });

  it('concatenation fragments use {{params}}, not glued English word order', () => {
    // "Word " + n + " of " + goal cannot be translated — the word order is baked
    // into the JS. These must be single parameterised keys.
    for (const key of ['word_sounds.word_n_of_m', 'word_sounds.correct_of_total',
      'word_sounds.sound_n', 'word_sounds.option_n', 'word_sounds.level_n',
      'word_sounds.items_done_of']) {
      expect(src, `${key} should be used for a phrase that was previously concatenated`).toContain(key);
    }
  });
});
