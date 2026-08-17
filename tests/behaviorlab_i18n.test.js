// Behavior Lab — every string a student reads at runtime must be translatable.
//
// WHY A SOURCE SCAN AND NOT A RENDER TEST
// Toasts, live-region announcements and tooltips only exist for a moment, in
// response to an action, on a specific level. No render digest and no screenshot
// covers them, which is how 38 of them — the entire feedback channel the tool
// teaches through, including nearly all of Level 9 — stayed English-only while
// 450 other strings in the same file went through __alloT.
//
// ★ The grep has to know about the ALIAS. This tool never calls ctx.t() directly;
// it aliases to __alloT (and now blT for interpolated messages). A scan written
// against `ctx.t(` reports a clean file and means nothing — see
// feedback_scientific_integrity_alloflow's sibling note on aliased-form greps.

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SOURCE = path.join(process.cwd(), 'stem_lab', 'stem_tool_behaviorlab.js');
// A single-quoted JS string literal, escapes tolerated.
const STR = "'((?:[^'\\\\]|\\\\.)*)'";

let src;
beforeAll(() => { src = fs.readFileSync(SOURCE, 'utf8'); });

/** Call sites of `fn(` whose FIRST argument is a bare string literal. */
function rawLiteralCalls(fn) {
  const re = new RegExp(fn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\(\\s*' + STR, 'g');
  const out = [];
  let m;
  while ((m = re.exec(src))) {
    out.push({ line: src.slice(0, m.index).split('\n').length, text: m[1] });
  }
  return out;
}

function rawLiteralProps(prop) {
  const re = new RegExp('[\'"]?' + prop + '[\'"]?\\s*:\\s*' + STR, 'g');
  const out = [];
  let m;
  while ((m = re.exec(src))) {
    out.push({ line: src.slice(0, m.index).split('\n').length, text: m[1] });
  }
  return out;
}

const show = (hits) => hits.map((h) => `    L${h.line}: ${h.text.slice(0, 90)}`).join('\n');

describe('runtime strings are translatable', () => {
  it('the translation helpers are still wired', () => {
    // If either alias is renamed, every assertion below silently starts checking
    // nothing — so the aliases themselves are part of the contract.
    expect(src).toMatch(/var __alloT = function \(k, fb\)/);
    expect(src).toMatch(/var blT = function \(k, fb, vars\)/);
    // A floor, not a census. It was 400 until three panels moved to the School
    // Behavior Toolkit and the count legitimately dropped — a threshold set just
    // under today's number turns every honest shrinkage into a red test.
    expect((src.match(/__alloT\(/g) || []).length).toBeGreaterThan(250);
  });

  for (const fn of ['addToast', 'announceToSR']) {
    it(`${fn} is never called with a bare English literal`, () => {
      const hits = rawLiteralCalls(fn);
      expect(hits, `${hits.length} untranslated ${fn} string(s):\n${show(hits)}`).toEqual([]);
    });
  }

  for (const prop of ['aria-label', 'title', 'placeholder']) {
    it(`${prop} is never a bare English literal`, () => {
      const hits = rawLiteralProps(prop);
      expect(hits, `${hits.length} untranslated ${prop} value(s):\n${show(hits)}`).toEqual([]);
    });
  }

  it('canvas labels are translatable too', () => {
    // These are PAINTED, not rendered, so no DOM scan and no accessibility audit
    // will ever see them: every label on the chamber apparatus and both axes of
    // the cumulative record sat in English inside an otherwise translated UI.
    const hits = rawLiteralCalls('ctx.fillText');
    expect(hits, `${hits.length} untranslated canvas label(s):\n${show(hits)}`).toEqual([]);
    expect((src.match(/ctx\.fillText\(\s*(?:__alloT|blT)\(/g) || []).length,
      'the canvas draws no translated text at all — did fillText move?').toBeGreaterThan(10);
  });

  it('JSX text children are translatable too', () => {
    // The third place visible English hides, after props and painted text: the
    // CHILD slot of React.createElement, where button faces, stat readouts and
    // headings live ("Deliver Food", "Target hits:", "ANTECEDENT"). Neither an
    // attribute scan nor a canvas scan reaches it.
    const re = /\}\s*,\s*(?:\n\s*)?'((?:[^'\\]|\\.)*)'|\}\s*,\s*(?:\n\s*)?"((?:[^"\\]|\\.)*)"/g;
    // Prop NAMES appear in this position when a props object is built inline, so
    // they match the shape without being text. Listed rather than pattern-matched:
    // an accidental "aria-label" as visible copy should still be caught.
    const NOT_TEXT = new Set(['aria-label', 'aria-hidden', 'aria-live', 'data-testid']);
    const hits = [];
    let m;
    while ((m = re.exec(src))) {
      const text = m[1] !== undefined ? m[1] : m[2];
      const bare = text.replace(/\\u[0-9A-Fa-f]{4}/g, '').trim();
      if (bare.length < 3 || !/[A-Za-z]{3}/.test(bare)) continue;
      if (NOT_TEXT.has(text)) continue;
      hits.push({ line: src.slice(0, m.index).split('\n').length, text });
    }
    expect(hits, `${hits.length} untranslated JSX text child(ren):\n${show(hits)}`).toEqual([]);
  });

  it('literals hiding in ternaries and concatenations', () => {
    // The shapes the first version of this gate could not see. It matched a literal
    // that was the WHOLE value of a prop or a child, so all of these walked past it:
    //     "aria-label": "Quiz answer: " + opt        (double-quoted, concatenated)
    //     }, ok ? '✅ Correct!' : '❌ Incorrect'      (literal inside a ternary)
    //     blQuizAnswered ? 'Paused' : 'Live'
    // Between them they held 41 strings a student reads — including two this file's
    // own author added, because the gate was written against the shapes being fixed
    // at the time. A gate that only knows its author's habits certifies its author's
    // habits.
    const S1 = "'((?:[^'\\\\]|\\\\.)*)'";
    const S2 = '"((?:[^"\\\\]|\\\\.)*)"';

    // Most ternary literals in this file are class names, colours and CSS values,
    // which are not translatable and must not be flagged.
    const CSS = /(^|\s)(bg|text|border|ring|from|to|hover|active|scale|animate|motion|opacity|grayscale|shadow)[-:]|rgba?\(|#[0-9a-fA-F]{3,8}\b|linear-gradient|\dpx|drop-shadow|rotate\(|scale\(|@keyframes|translate/;
    const VALUES = new Set(['true', 'false', 'none', 'block', 'flex', 'pointer', 'default',
      'success', 'info', 'warning', 'error', 'red', 'green', 'step', 'img', 'polite',
      'status', 'group', 'button', 'radio', 'dialog']);

    const isProse = (t) => {
      const bare = t.replace(/\\u[0-9A-Fa-f]{4}/g, '').trim();
      if (bare.length < 3 || !/[A-Za-z]{3}/.test(bare)) return false;
      if (VALUES.has(bare.toLowerCase())) return false;
      if (CSS.test(bare)) return false;
      return true;
    };

    // A string can be prose-shaped and still not be display text. `state` in the
    // inquiry widget is a ternary of English words that INDEXES a lookup object two
    // lines later; translating it made the lookup undefined and the next line threw
    // — a crash the English fallback hid until a language pack existed. The gate
    // cannot tell a key from a label, so the exemption is declared in the source,
    // on the line, with its reason next to it.
    const lineText = (idx) => {
      const start = src.lastIndexOf('\n', idx) + 1;
      const end = src.indexOf('\n', idx);
      return src.slice(start, end < 0 ? undefined : end);
    };

    const hits = [];
    const scan = (re, label) => {
      let m;
      while ((m = re.exec(src))) {
        if (lineText(m.index).includes('i18n-exempt')) continue;
        for (const g of [m[1], m[2]]) {
          if (g !== undefined && isProse(g)) {
            hits.push({ line: src.slice(0, m.index).split('\n').length, text: `${label}: ${g}` });
          }
        }
      }
    };

    for (const prop of ['aria-label', 'title', 'placeholder']) {
      scan(new RegExp('["\']' + prop + '["\']\\s*:\\s*' + S2, 'g'), prop);
    }
    scan(new RegExp('\\?\\s*' + S1 + '\\s*:\\s*' + S1, 'g'), 'ternary');
    scan(new RegExp('\\?\\s*' + S2 + '\\s*:\\s*' + S2, 'g'), 'ternary');
    scan(new RegExp('\\}\\s*,\\s*' + S2 + '\\s*\\+', 'g'), 'concat child');
    scan(new RegExp('\\}\\s*,\\s*' + S1 + '\\s*\\+', 'g'), 'concat child');

    expect(hits, `${hits.length} untranslated literal(s) in a ternary or concatenation:\n${show(hits)}`).toEqual([]);
  });

  it('interpolated messages use named slots, not glued fragments', () => {
    // `'Level ' + n + ' Complete! '` hands a translator two fragments and no way
    // to reorder them; `'Level {n} complete!'` hands them a sentence.
    const glued = [];
    const re = new RegExp('(?:addToast|announceToSR)\\(\\s*__alloT\\([^)]*\\)\\s*\\+', 'g');
    let m;
    while ((m = re.exec(src))) glued.push(src.slice(0, m.index).split('\n').length);
    expect(glued, `translated string concatenated with data at line(s) ${glued.join(', ')} — use blT with {slots}`).toEqual([]);
  });

  it('every blT fallback declares the slots its call site fills', () => {
    // A typo in a slot name leaves a literal "{n}" on screen. Cheap to catch here,
    // invisible until a student sees it.
    const re = /blT\(\s*'[^']*'\s*,\s*'((?:[^'\\]|\\.)*)'\s*,\s*\{([^}]*)\}\s*\)/g;
    const problems = [];
    let m;
    while ((m = re.exec(src))) {
      const line = src.slice(0, m.index).split('\n').length;
      const slots = [...m[1].matchAll(/\{(\w+)\}/g)].map((x) => x[1]);
      const keys = [...m[2].matchAll(/(\w+)\s*:/g)].map((x) => x[1]);
      for (const s of slots) if (!keys.includes(s)) problems.push(`L${line}: {${s}} is never supplied`);
      for (const k of keys) if (!slots.includes(k)) problems.push(`L${line}: '${k}' is passed but unused`);
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });

  it('keys are namespaced to this tool', () => {
    const keys = [...src.matchAll(/(?:__alloT|blT)\(\s*'([^']+)'/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThan(250);
    const stray = [...new Set(keys.filter((k) => !k.startsWith('stem.behaviorlab.')))];
    expect(stray, `keys outside the stem.behaviorlab namespace: ${stray.join(', ')}`).toEqual([]);
  });

  it('no two keys carry different English', () => {
    // A duplicated key with different text means one of the two strings silently
    // takes the other's translation.
    const byKey = new Map();
    const clashes = [];
    const re = /(?:__alloT|blT)\(\s*'([^']+)'\s*,\s*'((?:[^'\\]|\\.)*)'/g;
    let m;
    while ((m = re.exec(src))) {
      const [, key, text] = m;
      if (byKey.has(key) && byKey.get(key) !== text) clashes.push(key);
      else byKey.set(key, text);
    }
    expect([...new Set(clashes)], 'same key, different English').toEqual([]);
  });
});
