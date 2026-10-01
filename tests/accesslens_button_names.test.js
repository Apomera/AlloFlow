import fs from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

// Every button label was a flat string beginning with a decorative emoji, so a
// screen reader announced "speaker with three sound waves Read aloud" and
// "wastebasket Clear photo". In a tool built for students who are blind or have
// low vision, the button name is the whole interface. The tab strip already
// hid its icons; the buttons did not.

const src = fs.readFileSync('stem_lab/stem_tool_accesslens.js', 'utf8');
let isDecorativeLead;

const SYMBOLS = /[\u{1F300}-\u{1FAFF}\u{2190}-\u{27BF}\u{2B00}-\u{2BFF}]/u;

beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_accesslens.js', 'accessLens');
  isDecorativeLead = window.AccessLensPure.isDecorativeLead;
});

function render(theme) {
  theme = theme || {};
  resetStemLab();
  loadTool('stem_lab/stem_tool_accesslens.js', 'accessLens');
  const ctx = {
    React, toolData: {}, isDark: !!theme.dark, isContrast: !!theme.contrast,
    setToolData() {}, updateMulti() {}, gradeBand: 'g68'
  };
  return ReactDOMServer.renderToStaticMarkup(window.StemLab._registry.accessLens.render(ctx));
}

// A button's accessible name is its text with aria-hidden subtrees removed.
function accessibleNames(html) {
  return [...html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)]
    .map((m) => m[1].replace(/<span aria-hidden="true">[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);
}

describe('button accessible names', () => {
  it('renders buttons to check', () => {
    expect(accessibleNames(render()).length).toBeGreaterThan(2);
  });

  it('no button announces a decorative symbol as part of its name', () => {
    for (const theme of [{}, { dark: true }, { contrast: true }]) {
      for (const name of accessibleNames(render(theme))) {
        expect(SYMBOLS.test(name), JSON.stringify(theme) + ' -> ' + JSON.stringify(name)).toBe(false);
      }
    }
  });

  it('keeps the words, so the name still says what the button does', () => {
    const names = accessibleNames(render()).join(' | ');
    for (const word of ['photo', 'camera']) {
      expect(names.toLowerCase(), word).toContain(word);
    }
    // An emoji-only name would leave a button with no name at all.
    for (const name of accessibleNames(render())) expect(name.length).toBeGreaterThan(1);
  });

  it('classifies decorative leads without touching real words', () => {
    for (const sym of ['\u{1F50A}', '⏹', '\u{1F5D1}', '✨', '\u{1F4F7}', '←']) {
      expect(isDecorativeLead(sym), JSON.stringify(sym)).toBe(true);
    }
    // Letters, digits and punctuation must never be hidden from a screen
    // reader: hiding a real word would be worse than the bug being fixed.
    for (const word of ['Read', 'Stop', 'Clear', 'photo', '2', 'OK', 'a', '...', '-', 'x2']) {
      expect(isDecorativeLead(word), JSON.stringify(word)).toBe(false);
    }
  });

  it('leaves a label with no decorative lead completely alone', () => {
    // splitButtonLabel must be a no-op for a plain string, or it would wrap
    // every label in spans for nothing.
    const i = src.indexOf('function splitButtonLabel');
    const body = src.slice(i, src.indexOf('\n    }', i));
    expect(body).toContain('if (!DECORATIVE_LEAD.test(lead)) return label;');
    expect(body).toContain("if (typeof label !== 'string') return label;");
  });

  it('builds the symbol class from code points, not a literal range', () => {
    // A literal emoji class in this source has been mangled by tooling before,
    // silently widening or breaking the match.
    const i = src.indexOf('var DECORATIVE_LEAD');
    const body = src.slice(i, i + 500);
    expect(body).toContain('String.fromCharCode');
  });

  it('routes the hand-built photo button through the same splitter', () => {
    // That one button builds its own element instead of calling btn().
    expect(src).toContain("splitButtonLabel('\u{1F4F7} ' + _t('stem.accessLens.take_photo'");
  });

  it('ships the same names in the public mirror', () => {
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_accesslens.js', 'utf8')).toBe(src);
  });
});
