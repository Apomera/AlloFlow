// AlphaFold Explorer round 2 (2026-11-24): evidence-based quest hook, 12 px text floor, non-color right/wrong cue on
// the predict card (high contrast), and an on-screen note that the 5 / 10 / 20 Å PAE steps are teaching bins.
// Fail-first: ALPHAFOLD_TOOL_FILE=<path to start_r2.js> npx vitest run tests/alphafold_round2_2026_11_24.test.js
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
const TOOL_FILE = process.env.ALPHAFOLD_TOOL_FILE || 'stem_lab/stem_tool_alphafold.js';
const SOURCE = readFileSync(resolve(process.cwd(), TOOL_FILE), 'utf8');

function chip(container, acc) {
  return [...container.querySelectorAll('.af-preset-chip')].find((b) => b.textContent.indexOf(acc) >= 0);
}
function choice(container, start) {
  return [...container.querySelectorAll('button.af-predict-choice')].find((b) => b.textContent.trim().indexOf(start) === 0);
}

describe('AlphaFold Explorer round 2', () => {
  let container;
  let root;
  let latestState;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    resetStemLab();
    delete window.__alloAlphaFoldPreview;
    loadTool(resolve(process.cwd(), TOOL_FILE), 'alphaFoldExplorer');
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    container.remove();
    root = null;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  async function mount(seed, theme) {
    const th = theme || 'dark';
    function Host() {
      const [toolData, setToolData] = React.useState(seed || {});
      latestState = toolData;
      return window.StemLab._registry.alphaFoldExplorer.render(makeCtx({
        toolData, setToolData, theme: th, isDark: th === 'dark', isContrast: th === 'contrast', lang: 'en',
        announceToSR: () => {},
      }));
    }
    root = ReactDOMClient.createRoot(container);
    await act(async () => root.render(React.createElement(Host)));
  }
  async function click(el) {
    expect(el).toBeTruthy();
    await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  }
  function hook() {
    return window.StemLab._registry.alphaFoldExplorer.questHooks.find((x) => x.id === 'af_open');
  }

  it('af_open quest needs a committed prediction, not just opening the window (id kept for saved quests)', () => {
    const hk = hook();
    expect(hk, 'af_open id must stay so saved station quests still match').toBeTruthy();
    expect(hk.check({ opened: true, openedCount: 3 })).toBe(false);
    expect(hk.check({})).toBe(false);
    expect(hk.check(null)).toBe(false);
    expect(hk.check({ previewPredictionCount: 1 })).toBe(true);
    expect(hk.check({ previewPredictions: { P04637: 'some' } })).toBe(true);
    expect(hk.label).not.toMatch(/^Open /);
  });

  it('committing a prediction in the tool satisfies the quest; the launches metric is still shown', async () => {
    await mount({});
    expect(hook().check(latestState._alphaFoldExplorer || {})).toBe(false);
    await click(choice(container, 'Most of it'));
    expect(hook().check(latestState._alphaFoldExplorer)).toBe(true);
    expect(container.textContent).toContain('Explorer launches');
  });

  it('every CSS font size is at least 12 px', () => {
    const sizes = [...SOURCE.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
    const shorthand = [...SOURCE.matchAll(/font:\s*\d{3}\s+(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(30);
    expect([...sizes, ...shorthand].filter((n) => n < 12)).toEqual([]);
  });

  it('ribbon labels are HTML (not shrinking SVG text) and the residue count comes from the model', async () => {
    const m = window.__alloAlphaFoldPreview;
    await mount({});
    const fig = container.querySelector('figure.af-protein-viz');
    expect(fig.querySelectorAll('svg text')).toHaveLength(0);
    const labels = () => [...container.querySelectorAll('.af-ribbon-label')].map((n) => n.textContent);
    expect(labels().join('|')).toContain('N-term');
    expect(labels().join('|')).toContain('C-term');
    expect(labels()).toContain('residue ' + m.data.find((d) => d.accession === 'P69905').length);
    await click(chip(container, 'P04637'));
    expect(labels()).toContain('residue ' + m.data.find((d) => d.accession === 'P04637').length);
    // PAE axis titles stay SVG but at 12 user units or more (the matrix never draws smaller than its viewBox here).
    await click(choice(container, 'Some of it'));
    await click(container.querySelector('#af-stage-tab-pae'));
    const paeTexts = [...container.querySelectorAll('svg.af-pae-matrix text')];
    expect(paeTexts.length).toBe(2);
    paeTexts.forEach((tx) => expect(Number(tx.getAttribute('font-size'))).toBeGreaterThanOrEqual(12));
  });

  it('predict card marks right and wrong with text and border style, not only color (high contrast)', async () => {
    await mount({}, 'contrast');
    expect(container.querySelector('.af-launcher').getAttribute('data-theme')).toBe('contrast');
    // Before a prediction no verdict is shown.
    expect(container.querySelector('[data-verdict]')).toBeNull();
    await click(chip(container, 'P04637'));
    await click(choice(container, 'Little of it'));
    const wrong = choice(container, 'Little of it');
    const answer = choice(container, 'Some of it');
    expect(wrong.getAttribute('data-verdict')).toBe('wrong');
    expect(wrong.textContent).toContain('✗ Your pick');
    expect(answer.getAttribute('data-verdict')).toBe('answer');
    expect(answer.textContent).toContain('✓ AlphaFold DB answer');
    expect(choice(container, 'Most of it').getAttribute('data-verdict')).toBe('other');
    expect(container.querySelector('.af-predict-result .af-predict-mark').textContent).toBe('✗');
    await click(chip(container, 'P69905'));
    await click(choice(container, 'Most of it'));
    const match = choice(container, 'Most of it');
    expect(match.getAttribute('data-verdict')).toBe('match');
    expect(match.textContent).toContain('✓ Your pick matches');
    expect(container.querySelector('.af-predict-result .af-predict-mark').textContent).toBe('✓');
    // The contrast theme draws the wrong pick dashed and the answer solid green, overriding the flat yellow border.
    expect(SOURCE).toMatch(/\[data-theme="contrast"\] \.af-predict-choice\[data-verdict="wrong"\][^{]*\{border:3px dashed #ffff00!important;\}/);
    expect(SOURCE).toMatch(/\[data-theme="contrast"\] \.af-predict-choice\[data-verdict="answer"\][^{]*\{border:4px solid #00ff00!important;\}/);
  });

  it('PAE legend says the 5 / 10 / 20 Å steps are teaching bins and cites the EMBL-EBI course', async () => {
    await mount({ _alphaFoldExplorer: { previewPredictions: { P69905: 'most' } } });
    await click(container.querySelector('#af-stage-tab-pae'));
    const note = container.querySelector('.af-pae-bins-note');
    expect(note).toBeTruthy();
    expect(note.textContent).toContain('teaching bins');
    expect(note.textContent).toContain('smooth scale');
    expect(SOURCE).toContain('"the shade of green indicates the expected distance error in Ångströms (Å)"');
  });

  it('the confidence key intro paragraph is styled (the old child selector never matched it)', () => {
    expect(SOURCE).toContain(".af-confidence-key h3+p{");
    expect(SOURCE).not.toContain(".af-confidence-key>p{");
  });
});
