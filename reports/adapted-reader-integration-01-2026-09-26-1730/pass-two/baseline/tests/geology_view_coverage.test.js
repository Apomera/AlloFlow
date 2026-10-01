// Every scene x mode the tool can show.
//
// WHY: the render golden (tests/stem_tool_golden.test.js) renders each tool ONCE, in its
// default state — for this tool that is crust/explore, 1 of 21 combinations. Five panels
// are gated behind a mode (`inAssessment ? quizPanel() : null`, `inInvestigation ?
// sceneSequencePanel() : null`, comparePanel, sceneComparisonPanel, the CER panel), so the
// golden cannot see them at all. That is exactly why three passes of quiz edits never moved
// the golden hash: the quiz is behind the Assess tab.
//
// This mounts all 21 for real and pins the properties that should hold in every one.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
if (typeof act !== 'function') throw new Error('React.act unavailable; cannot mount the tool');

const SCENES = ['crust', 'geode', 'deepEarth', 'subduction', 'ridge', 'hotspot', 'collision'];
const MODES = ['explore', 'investigate', 'assess'];

let cfg;
// Mount each combination ONCE and share it across the assertions below. Mounting per test
// meant 21 x 7 = 147 mounts and blew the 5s timeout; these views are read-only here.
const mounted = [];

beforeAll(() => {
  resetStemLab();
  cfg = loadTool('stem_lab/stem_tool_geologyexplorer.js', 'geologyExplorer');
  for (const scene of SCENES) {
    for (const mode of MODES) {
      const container = document.createElement('div');
      document.body.appendChild(container);
      // Tool state is namespaced under ctx.toolData.geologyExplorer.
      const store = newStore({ geologyExplorer: { scene, mode } });
      const ctx = makeCtx({ toolData: store.toolData }, store);
      const root = ReactDOMClient.createRoot(container);
      act(() => root.render(React.createElement(() => cfg.render(ctx))));
      mounted.push({ root, container, where: `${scene}/${mode}` });
    }
  }
}, 120000);

afterAll(() => {
  for (const { root, container } of mounted) {
    act(() => root.unmount());
    container.remove();
  }
});

const everyView = (fn) => {
  expect(mounted.length).toBe(SCENES.length * MODES.length);
  for (const { container, where } of mounted) fn(container, where);
};

const accName = (el) => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim();

describe('Geology Explorer — every scene x mode renders', () => {
  it('mounts all 21 combinations with real content', () => {
    everyView((container, where) => {
      expect(container.innerHTML.length, `${where} rendered almost nothing`).toBeGreaterThan(20000);
      expect(container.querySelectorAll('button').length, where).toBeGreaterThan(30);
    });
  });

  it('never leaks undefined, NaN or [object Object] into visible text', () => {
    everyView((container, where) => {
      const leaks = (container.textContent || '').match(/undefined|NaN|\[object Object\]/g) || [];
      expect(leaks, `${where} leaked ${leaks.join(', ')}`).toEqual([]);
    });
  });

  it('gates the quiz behind Assess, in every scene', () => {
    // Pins the blind spot itself: if the quiz ever moves into the default view, the golden
    // starts covering it and this test should be revisited.
    everyView((container, where) => {
      const hasQuiz = !!container.querySelector('[data-geology-target="quiz"]');
      expect(hasQuiz, where).toBe(where.endsWith('/assess'));
    });
  });

  it('gives every control an accessible name', () => {
    everyView((container, where) => {
      const nameless = [...container.querySelectorAll('button, [role="button"]')]
        .filter((b) => !accName(b))
        .map((b) => b.className.slice(0, 50));
      expect(nameless, `${where} has unnamed controls: ${nameless.join(' | ')}`).toEqual([]);
    });
  });

  it('never repeats an id or an accessible name within one view', () => {
    everyView((container, where) => {
      const ids = [...container.querySelectorAll('[id]')].map((e) => e.getAttribute('id'));
      expect(new Set(ids).size, `${where} has duplicate ids`).toBe(ids.length);
      const names = [...container.querySelectorAll('button')].map(accName).filter(Boolean);
      const dupes = names.filter((n, i) => names.indexOf(n) !== i);
      expect(dupes, `${where} has ambiguous controls: ${[...new Set(dupes)].join(' | ')}`).toEqual([]);
    });
  });

  it('points every disclosure at a panel that exists', () => {
    // A collapsed disclosure used to keep aria-controls pointing at an unmounted panel.
    // The scene TABS are excluded deliberately: only the selected tabpanel is rendered,
    // which is the standard tabs pattern, and the alternatives are worse.
    everyView((container, where) => {
      const ids = new Set([...container.querySelectorAll('[id]')].map((e) => e.getAttribute('id')));
      const dangling = [...container.querySelectorAll('[aria-controls]')]
        .filter((el) => el.getAttribute('role') !== 'tab')
        .map((el) => el.getAttribute('aria-controls'))
        .filter((ref) => ref && !ids.has(ref));
      expect(dangling, `${where} aria-controls points at nothing: ${dangling.join(' | ')}`).toEqual([]);
    });
  });

  // Accessible names are built from translator TEMPLATES ('Move {label} earlier') whose
  // values are substituted at call time. A typo in a var name, or a var that goes missing,
  // leaves the raw placeholder in the name a screen reader reads out — and nothing else
  // fails. This is the only thing watching for that.
  it('substitutes every placeholder in an accessible name', () => {
    everyView((container, where) => {
      const raw = [...container.querySelectorAll('[aria-label]')]
        .map((e) => e.getAttribute('aria-label'))
        .filter((v) => /\{[a-z_0-9]+\}/i.test(v));
      expect(raw, `${where} renders unsubstituted placeholders: ${raw.join(' | ')}`).toEqual([]);
    });
  });

  it('keeps the live region present in every view', () => {
    everyView((container, where) => {
      expect(container.querySelector('[aria-live]'), `${where} has no live region`).toBeTruthy();
    });
  });
});
