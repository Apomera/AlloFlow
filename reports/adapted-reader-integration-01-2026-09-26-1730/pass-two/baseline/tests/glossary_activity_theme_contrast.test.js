// Lane 1 (fleet 2026-08-16), issue G5.
//
// The bug class, measured rather than reasoned about: the dark theme in
// app_styles_source.jsx only ever emits selectors for BASE utilities, e.g.
// `.theme-dark .allo-docsuite .bg-slate-50`. Tailwind compiles
// `hover:bg-slate-50` to `.hover\:bg-slate-50:hover`, which that selector
// cannot match, so a hover colour keeps its LIGHT value in dark mode.
//
// An element that ALSO carries a base bg utility is accidentally safe, because
// the remap sets that base `!important` and it beats the non-important hover
// rule. An element with NO base surface of its own is exposed. Measured in
// Chromium against the real shipped class strings and the real app CSS:
//
//   glossary term row   hover  #f1f5f9 on #f8fafc   1.05:1
//   glossary definition hover  #cbd5e1 on #f8fafc   1.42:1
//   matching audio chip hover  #cbd5e1 on #ffffff   1.48:1
//   matching reset chip hover  #a5b4fc on #eef2ff   1.78:1
//   crossword clue      hover  #4338ca on #1e293b   1.85:1
//
// The fix is a small stylesheet in each module rather than a theme branch in
// JS, so it is right before the first paint and cannot drift from the theme
// class. This test pins the shape of that stylesheet and guards the elements
// that were exposed from regaining a bare `hover:` colour.
//
// Lane 2 owns the shell-wide scanner for this class (D3); this file only
// covers the glossary and games surfaces.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const games = readFileSync('games_source.jsx', 'utf8');
const gamesBuilt = readFileSync('games_module.js', 'utf8');
const glossary = readFileSync('view_glossary_source.jsx', 'utf8');
const glossaryBuilt = readFileSync('view_glossary_module.js', 'utf8');

const region = (src, from, to) => {
  const a = src.indexOf(from);
  const b = to ? src.indexOf(to, a) : src.length;
  expect(a, 'region start not found: ' + from).toBeGreaterThan(-1);
  return src.slice(a, b === -1 ? src.length : b);
};

// Pull a `NAME = [ ... ].join(...)` CSS array out of a source file.
const cssRules = (src, name) => {
  const start = src.indexOf(name + ' = [');
  expect(start, name + ' not found').toBeGreaterThan(-1);
  const open = src.indexOf('[', start);
  const close = src.indexOf('].join', open);
  // eslint-disable-next-line no-new-func
  return new Function('return [' + src.slice(open + 1, close) + ']')();
};

describe('G5 the hover stylesheets exist and cover every theme', () => {
  for (const [label, src, name] of [
    ['games_source.jsx', games, 'GAME_HOVER_CSS'],
    ['games_module.js', gamesBuilt, 'GAME_HOVER_CSS'],
    ['view_glossary_source.jsx', glossary, 'GLOSSARY_HOVER_CSS'],
    ['view_glossary_module.js', glossaryBuilt, 'GLOSSARY_HOVER_CSS'],
  ]) {
    it(label + ' defines a light, a dark and a high-contrast rule for every hover class', () => {
      const rules = cssRules(src, name);
      expect(rules.length).toBeGreaterThan(2);
      // Every class that gets a background in the default (light) rules must
      // also get one under .theme-dark. A missing dark rule is exactly the
      // failure this file exists to prevent, and it is invisible by eye
      // because the light value simply carries over.
      const classesWithSurface = new Set();
      const darkCovered = new Set();
      const contrastCovered = new Set();
      for (const rule of rules) {
        const isDark = rule.startsWith('.theme-dark ');
        const isContrast = rule.startsWith('.theme-contrast ');
        const hasSurface = /background-color:/.test(rule) || /outline:/.test(rule);
        for (const m of rule.matchAll(/\.(allo-[a-z-]+hov[a-z-]*)/g)) {
          if (isDark) darkCovered.add(m[1]);
          else if (isContrast) contrastCovered.add(m[1]);
          else if (hasSurface) classesWithSurface.add(m[1]);
        }
      }
      for (const cls of classesWithSurface) {
        expect(darkCovered, cls + ' has no .theme-dark rule').toContain(cls);
        expect(contrastCovered, cls + ' has no .theme-contrast rule').toContain(cls);
      }
    });
  }

  it('both stylesheets are injected, once, guarded by an id', () => {
    expect(games).toContain('ensureGameHoverStyles();');
    expect(games).toContain("document.getElementById(GAME_HOVER_STYLE_ID)");
    expect(glossary).toContain('ensureGlossaryHoverStyles();');
    expect(glossary).toContain('document.getElementById(GLOSSARY_HOVER_STYLE_ID)');
  });
});

describe('G5 the elements that measured below AA no longer carry a bare hover colour', () => {
  it('the glossary term row uses the themed class, not hover:bg-slate-50', () => {
    expect(glossary).toContain('className="group/row allo-vghov-row"');
    // Look only at emitted className values. Both files still mention the old
    // class string in the comment that explains why it was removed, so a plain
    // substring check on the file would fail on its own documentation.
    const emitted = [...glossaryBuilt.matchAll(/className:\s*"([^"]*)"/g)].map(m => m[1]);
    expect(emitted.length).toBeGreaterThan(50);
    expect(emitted.some(c => c.includes('hover:bg-slate-50') && c.includes('group/row'))).toBe(false);
    expect(emitted).toContain('group/row allo-vghov-row');
  });

  it('the crossword clue buttons no longer recolour their text on hover', () => {
    const crossword = region(games, 'const CrosswordGame =', 'const SyntaxScramble =');
    // hover:text-indigo-700 measured 1.85:1 on the dark panel. The replacement
    // changes no colour at all: an underline reads as hover in every theme and
    // no remap layer can break it.
    expect(crossword).not.toContain('hover:text-indigo-700');
    expect(crossword).toContain('allo-ghov-link');
  });

  it('the matching toolbar chips use the themed classes', () => {
    const matching = region(games, 'const MatchingGame =', 'const TIMELINE_PASTEL_COLORS');
    expect(matching).not.toContain('hover:bg-white');
    expect(matching).not.toContain('hover:bg-indigo-50');
    expect(matching).toContain('allo-ghov-soft');
    expect(matching).toContain('allo-ghov-tint');
  });

  it('the Word Scramble hint button clears AA in light mode', () => {
    const scramble = region(games, 'const WordScrambleGame =', 'const _MultiZoneColorMap');
    // amber-600 #d97706 on amber-50 #fffbeb measured 3.07:1 resting and
    // 2.86:1 hovered, both under 4.5:1. amber-800 #92400e gives 6.9:1 and
    // matches the crossword's own hint button.
    expect(scramble).toContain('text-amber-800 bg-amber-50');
    expect(scramble).not.toContain('text-amber-600 bg-amber-50');
  });
});
