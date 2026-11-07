import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Contrast theme: the host paints every <button> black (app_styles_module.js, `.theme-contrast button`).
// A generated chip-ink rule forces black text on inline fills with an id chain, so a resting button with an
// inline fill was black on black. A hovered button is different: the host paints it #00ff00, and black is the
// ink it needs (the tool's own ink rule would make it yellow on green, 1.28:1). So the guard is
// :not(button:not(:hover)), not :not(button). HC_SCOPE_DIR points this at another copy of the files.
const DIR = process.env.HC_SCOPE_DIR || path.join(process.cwd(), 'stem_lab');

// Other sessions own these files, so they are not checked yet. None held such a rule on 2026-11-05.
const OWNED_ELSEWHERE = new Set(['bakingscience', 'logiclab', 'probability', 'timeschedule', 'organismid', 'graphcalc', 'funcgrapher', 'algebracas']);

const GUARD = ':not(button:not(:hover))';
const BLACK = '{color:#000!important';
const ID_CHAIN = /(?::not\(#[\w-]+\)){3,}/;

// The last compound of a selector, split on top-level combinators only.
const subjectOf = (selector) => {
  let depth = 0, inAttr = false, inStr = null, start = 0;
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];
    if (inStr) { if (ch === inStr) inStr = null; continue; }
    if (ch === '"' || ch === "'") { inStr = ch; continue; }
    if (ch === '[') inAttr = true;
    if (ch === ']') inAttr = false;
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (!depth && !inAttr && /[\s>+~]/.test(ch)) start = i + 1;
  }
  return { subject: selector.slice(start), before: selector.slice(0, start) };
};

// A rule that hits a resting button: id chain + black ink + a last compound that does not rule out <button>.
const unsafe = (rule) => {
  if (!rule.endsWith(BLACK) || !ID_CHAIN.test(rule)) return false;
  const { subject, before } = subjectOf(rule.slice(0, -BLACK.length));
  if (subject.endsWith(GUARD)) return false;
  if (/^(?!button\b)[a-z][\w-]*/i.test(subject)) return false; // a type selector for something else
  // Text inside a button a rule above repainted itself (a button cannot hold a button).
  if (subject === '*' && /^button\b/.test(subjectOf(before.trimEnd()).subject)) return false;
  return true;
};

// Every string literal holding an id-chain rule, whichever way the block assembles its text.
const rulesIn = (src) => src.split('\n').filter((line) => line.includes('#hc-k')).flatMap((line) => {
  const a = line.indexOf('"'), b = line.lastIndexOf('"');
  return JSON.parse(line.slice(a, b + 1)).split('}').filter(Boolean);
});

const files = fs.readdirSync(DIR).filter((n) => /^(public_)?stem_tool_.*\.js$/.test(n));
const toolOf = (f) => f.replace(/^(public_)?stem_tool_/, '').replace(/\.js$/, '').toLowerCase();

describe('contrast theme: black chip ink never lands on a resting button', () => {
  it('the check itself tells the two rule shapes apart', () => {
    const S = '.theme-contrast [data-stem-tool-shell="x"] [style]:not(#hc-k):not(#hc-k):not(#hc-k):is([style*="background: rgb"])';
    expect(unsafe(S + BLACK)).toBe(true);
    expect(unsafe(S + ':not(button)' + BLACK)).toBe(true); // hovered button: yellow on host green
    expect(unsafe(S + GUARD + BLACK)).toBe(false);
    expect(unsafe(S + GUARD + '{color:#ffff00!important')).toBe(false);
    expect(unsafe('.theme-contrast [data-stem-tool-shell="x"] button[style*="a b"]:not(#hc-k):not(#hc-k):not(#hc-k):not(#hc-k)' + BLACK)).toBe(true);
    expect(unsafe('.theme-contrast [data-stem-tool-shell="x"] button[style*="a b"]:not(#hc-k):not(#hc-k):not(#hc-k):not(#hc-k) *' + BLACK)).toBe(false);
    expect(unsafe('.theme-contrast [data-stem-tool-shell="x"] div:not(#hc-k):not(#hc-k):not(#hc-k) *' + BLACK)).toBe(true);
    expect(unsafe('.theme-contrast [data-stem-tool-shell="x"] span:not(#hc-k):not(#hc-k):not(#hc-k)' + BLACK)).toBe(false);
  });

  it('finds the generated rules at all', () => {
    const count = files.filter((f) => !OWNED_ELSEWHERE.has(toolOf(f))).reduce((n, f) => n + rulesIn(fs.readFileSync(path.join(DIR, f), 'utf8')).filter((r) => r.endsWith(BLACK) && ID_CHAIN.test(r)).length, 0);
    expect(count).toBeGreaterThan(0);
  });

  it('no tool holds a rule that can do it', () => {
    const bad = [];
    for (const f of files) {
      if (OWNED_ELSEWHERE.has(toolOf(f))) continue;
      for (const r of rulesIn(fs.readFileSync(path.join(DIR, f), 'utf8'))) if (unsafe(r)) bad.push(f + ': ...' + r.slice(-90));
    }
    expect(bad, `black ink on a resting button:\n${bad.join('\n')}`).toEqual([]);
  });
});
