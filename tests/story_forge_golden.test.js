// SSR render golden + reading-level integrity for StoryForge (story_forge_module.js,
// built from story_forge_source.jsx).
//
// WHY: StoryForge is a 6-phase scaffolded creative-writing wizard that reports a
// Flesch-Kincaid reading level used to tell students/teachers whether a draft is at
// the target grade. The FK math + grade-label mapping are pure and had no coverage,
// and the component itself had only an indirect e2e tile check. We pin (a) the FK
// computation against hand-computed fixtures, and (b) the component's open/closed SSR
// render contract.
//
// The pure helpers are module-level; exposed via a read-only seam
// (window.AlloModules.StoryForge._meta) added to BOTH the source build template and
// the generated module. Set at load, so the FK tests need no render.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, ReactDOMServer, StoryForge, FK;

beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ReactDOMServer = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/server'));
  globalThis.React = window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('story_forge_module.js');
  StoryForge = window.AlloModules.StoryForge;
  FK = StoryForge && StoryForge._meta;
  if (!FK || !FK.computeReadingLevel) throw new Error('StoryForge._meta seam not present');
});

describe('computeReadingLevel — Flesch-Kincaid grade', () => {
  it('returns null for empty / too-short text (<20 chars trimmed)', () => {
    expect(FK.computeReadingLevel('')).toBeNull();
    expect(FK.computeReadingLevel('short')).toBeNull();
  });
  it('exact FK on an all-monosyllabic sentence (10 words, 1 sentence)', () => {
    // syllables == words == 10 → avgSPW 1, avgWPS 10 → FK = 0.39*10 + 11.8*1 - 15.59 = 0.11 → 0.1
    const r = FK.computeReadingLevel('the cat sat on the mat and the dog ran.');
    expect(r).toMatchObject({ sentences: 1, words: 10, syllables: 10, avgWordsPerSentence: 10, grade: 0.1 });
  });
  it('clamps grade to [0, 18] and a complex passage reads higher than a simple one', () => {
    const simple = FK.computeReadingLevel('I am a cat. I am a dog. I am a fish.');
    expect(simple.grade).toBeGreaterThanOrEqual(0);
    const complex = FK.computeReadingLevel('Extraordinarily sophisticated multidisciplinary methodologies necessitate comprehensive institutional reorganization throughout interconnected administrative infrastructures simultaneously.');
    expect(complex.grade).toBeLessThanOrEqual(18);
    expect(complex.grade).toBeGreaterThan(simple.grade);
  });
  it('counts sentences and words', () => {
    const r = FK.computeReadingLevel('First sentence here. Second one is a bit longer than that one.');
    expect(r.sentences).toBe(2);
    expect(r.words).toBeGreaterThan(8);
  });
});

describe('gradeLevelToNumber', () => {
  it('maps Pre-K / K to 0 and College to 13', () => {
    expect(FK.gradeLevelToNumber('Pre-K')).toBe(0);
    expect(FK.gradeLevelToNumber('K')).toBe(0);
    expect(FK.gradeLevelToNumber('College')).toBe(13);
  });
  it('non-string → null', () => {
    expect(FK.gradeLevelToNumber(42)).toBeNull();
    expect(FK.gradeLevelToNumber(null)).toBeNull();
  });
});

describe('comic lettering width persistence', () => {
  it('clamps imported bubble widths and keeps valid placement data', () => {
    expect(FK.clampComicLetteringWidth(12)).toBe(28);
    expect(FK.clampComicLetteringWidth(120)).toBe(86);
    expect(FK.clampComicLetteringWidth(54.44)).toBe(54.4);
    expect(FK.clampComicLetteringWidth(null)).toBe(72);

    expect(FK.sanitizePanelThumbnails({
      panelA: { letteringSpace: 'top-right', letteringWidth: 120, letteringX: 4, letteringY: 99 },
      panelB: { letteringWidth: 12 },
      invalid: { letteringWidth: 'wide' },
      empty: { letteringWidth: null },
    })).toEqual({
      panelA: { letteringSpace: 'top-right', letteringWidth: 86, letteringX: 8, letteringY: 92 },
      panelB: { letteringWidth: 28 },
    });
  });
});

describe('StoryForge — SSR render contract', () => {
  const render = (props) => ReactDOMServer.renderToStaticMarkup(React.createElement(StoryForge, props));
  const base = { isOpen: true, onClose: () => {}, onCallGemini: async () => '', t: (k) => k, codename: 'Bright Tiger', gradeLevel: '5th Grade' };
  it('renders no dialog when closed', () => {
    expect(render({ ...base, isOpen: false })).not.toContain('role="dialog"');
  });
  it('open: renders the modal dialog (default configure phase) without crashing', () => {
    const html = render(base);
    expect(html).toContain('role="dialog"');
    expect(html.length).toBeGreaterThan(1000);
  });
});
