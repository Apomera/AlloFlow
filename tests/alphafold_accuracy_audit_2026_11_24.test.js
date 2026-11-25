// AlphaFold Explorer accuracy audit (2026-11-24).
// The launcher's confidence preview used hand-made numbers that did not match AlphaFold DB (for example insulin was
// shown as 48% very high when AFDB scores 0% of it above 90). The preview now carries AFDB v6 numbers and hides them
// until the student predicts. Fail-first: ALPHAFOLD_TOOL_FILE=<path to the pre-audit copy> npx vitest run <this file>
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
const TOOL_FILE = process.env.ALPHAFOLD_TOOL_FILE || 'stem_lab/stem_tool_alphafold.js';
const SOURCE = readFileSync(resolve(process.cwd(), TOOL_FILE), 'utf8');

// Independent record of the AlphaFold DB v6 API fields (https://alphafold.ebi.ac.uk/api/prediction/<acc>, fetched
// 2026-11-24): fractionPlddtVeryHigh / Confident / Low / VeryLow and globalMetricValue.
const AFDB = {
  P69905: { length: 142, vh: 0.993, c: 0, l: 0.007, vl: 0, mean: 98.06 },
  P42212: { length: 238, vh: 0.933, c: 0.055, l: 0.013, vl: 0, mean: 96.62 },
  P01308: { length: 110, vh: 0, c: 0.127, l: 0.364, vl: 0.509, mean: 52.91 },
  P04637: { length: 393, vh: 0.527, c: 0.071, l: 0.104, vl: 0.298, mean: 75.06 },
};

function buttonByText(container, text) {
  return [...container.querySelectorAll('button')].find((b) => b.textContent.trim() === text);
}
function buttonStarting(container, text) {
  return [...container.querySelectorAll('button')].find((b) => b.textContent.trim().indexOf(text) === 0);
}

describe('AlphaFold Explorer accuracy audit 2026-11-24', () => {
  let container;
  let root;
  let latestState;
  let announced;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    resetStemLab();
    delete window.__alloAlphaFoldPreview;
    loadTool(resolve(process.cwd(), TOOL_FILE), 'alphaFoldExplorer');
    container = document.createElement('div');
    document.body.appendChild(container);
    announced = [];
  });

  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    container.remove();
    root = null;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  async function mount(seed, theme) {
    function Host() {
      const [toolData, setToolData] = React.useState(seed || {});
      latestState = toolData;
      return window.StemLab._registry.alphaFoldExplorer.render(makeCtx({
        toolData, setToolData, theme: theme || 'dark', isDark: theme !== 'light', lang: 'en',
        announceToSR: (msg) => announced.push(msg),
      }));
    }
    root = ReactDOMClient.createRoot(container);
    await act(async () => root.render(React.createElement(Host)));
  }
  async function click(el) {
    expect(el).toBeTruthy();
    await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  }
  function pctTexts() {
    return [...container.querySelectorAll('.af-confidence-pct')].map((n) => n.textContent);
  }

  it('exposes the preview model and its numbers match the AlphaFold DB API record', () => {
    const model = window.__alloAlphaFoldPreview;
    expect(model, 'window.__alloAlphaFoldPreview').toBeTruthy();
    expect(model.data.map((d) => d.accession)).toEqual(Object.keys(AFDB));
    for (const d of model.data) {
      const ref = AFDB[d.accession];
      expect(d.length).toBe(ref.length);
      expect(d.frac['very-high']).toBe(ref.vh);
      expect(d.frac.confident).toBe(ref.c);
      expect(d.frac.low).toBe(ref.l);
      expect(d.frac['very-low']).toBe(ref.vl);
      expect(d.plddtMean).toBe(ref.mean);
      const sum = ref.vh + ref.c + ref.l + ref.vl;
      expect(Math.abs(sum - 1)).toBeLessThan(0.002);
      // 18 bin means: their mean must sit close to the AFDB global mean (bins are near-equal size).
      expect(d.bars).toHaveLength(18);
      const barMean = d.bars.reduce((a, b) => a + b, 0) / 18;
      expect(Math.abs(barMean - ref.mean)).toBeLessThan(1.5);
      expect(d.pae).toHaveLength(8);
      d.pae.forEach((row) => { expect(row).toHaveLength(8); row.forEach((v) => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(31.75); }); });
    }
  });

  it('band, percent, prediction and PAE helpers follow the stated thresholds', () => {
    const m = window.__alloAlphaFoldPreview;
    expect(m).toBeTruthy();
    expect([91, 90, 71, 70, 51, 50].map(m.bandForScore)).toEqual(['very-high', 'confident', 'confident', 'low', 'low', 'very-low']);
    expect(m.bandPercents({ 'very-high': 0.933, confident: 0.055, low: 0.013, 'very-low': 0 })).toEqual({ 'very-high': '93%', confident: '6%', low: '1%', 'very-low': '0%' });
    expect(m.data.map((d) => m.predictionBucket(d.frac['very-high']))).toEqual(['most', 'most', 'little', 'some']);
    expect([0, 4.9, 5, 9.9, 10, 19.9, 20, 31].map(m.paeLevel)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
    expect([1, 2, 3, 4].map(m.paeGroup)).toEqual(['intra', 'boundary', 'boundary', 'inter']);
  });

  it('hides the confidence answer until the student predicts, then shows the AFDB numbers', async () => {
    await mount({});
    expect(pctTexts()).toEqual(['?', '?', '?', '?']);
    expect(container.querySelectorAll('.af-fold-segment')).toHaveLength(0);
    expect(container.textContent).not.toContain('Almost every residue scores above 90');
    const fig = container.querySelector('figure.af-protein-viz');
    expect(fig.getAttribute('aria-label')).toContain('Make your prediction');

    await click(buttonByText(container, 'Most of it (over 75%)'));
    expect(pctTexts()).toEqual(['99%', '0%', '1%', '0%']);
    expect(container.querySelectorAll('.af-fold-segment')).toHaveLength(18);
    const result = container.querySelector('.af-predict-result');
    expect(result.textContent).toContain('Your prediction matches.');
    expect(result.textContent).toContain('99%');
    expect(latestState._alphaFoldExplorer.previewPredictions).toEqual({ P69905: 'most' });
    expect(latestState._alphaFoldExplorer.previewPredictionCorrect).toBe(1);
    expect(container.querySelector('figure.af-protein-viz').getAttribute('aria-label')).toContain('Very high 99%');
  });

  it('every shown percent and segment color comes from the model for each sample', async () => {
    const m = window.__alloAlphaFoldPreview;
    await mount({});
    for (const d of m.data) {
      await click([...container.querySelectorAll('.af-preset-chip')].find((b) => b.textContent.indexOf(d.accession) >= 0));
      if (pctTexts()[0] === '?') await click(buttonByText(container, 'Some of it (25% to 75%)'));
      const want = m.bandPercents(d.frac);
      expect(pctTexts()).toEqual([want['very-high'], want.confident, want.low, want['very-low']]);
      const bands = [...container.querySelectorAll('.af-fold-segment')].map((p) => p.getAttribute('data-band'));
      expect(bands).toEqual(d.bars.map(m.bandForScore));
      const result = container.querySelector('.af-predict-result').textContent;
      expect(result).toContain(want['very-high'] + ' of the residues above 90');
      if (m.predictionBucket(d.frac['very-high']) === 'some') expect(result).toContain('Your prediction matches.');
      else expect(result).toContain('Not this time.');
    }
  });

  it('PAE view shows AFDB block averages with consistent labels and counts', async () => {
    const m = window.__alloAlphaFoldPreview;
    await mount({ _alphaFoldExplorer: { previewPredictions: { P04637: 'some' } } });
    await click([...container.querySelectorAll('.af-preset-chip')].find((b) => b.textContent.indexOf('P04637') >= 0));
    await click(container.querySelector('#af-stage-tab-pae'));
    const p53 = m.data.find((d) => d.accession === 'P04637');
    const counts = { intra: 0, boundary: 0, inter: 0 };
    p53.pae.forEach((row) => row.forEach((v) => { counts[m.paeGroup(m.paeLevel(v))] += 1; }));
    const levels = [...container.querySelectorAll('.af-pae-cell')].map((c) => c.getAttribute('data-pae-level'));
    expect(levels).toEqual(p53.pae.flat().map((v) => String(m.paeLevel(v))));
    const aria = container.querySelector('figure.af-protein-viz').getAttribute('aria-label');
    expect(aria).toContain(counts.intra + ' of 64 squares are under 5 Å');
    expect(aria).toContain(counts.inter + ' are 20 Å or more');
    // Chip labels and explanations used to share keys (pae_intra) with two different texts.
    const chip = buttonStarting(container, 'Low error (under 5 Å)');
    expect(chip).toBeTruthy();
    expect(chip.textContent).toContain('· ' + counts.intra);
    await click(chip);
    expect(container.textContent).toContain('Under 5 Å: AlphaFold is confident');
    // Clicking one square reports its residue stretches and its average.
    await click(container.querySelectorAll('.af-pae-cell')[0]);
    expect(container.textContent).toContain('Residues 1–49 vs 1–49: average 17.6 Å.');
    expect(SOURCE).not.toContain('Diagonal = within domain');
    expect(SOURCE).not.toContain('Tightly packed domain');
  });

  it('removes the fabricated preview numbers and overstated notes', () => {
    expect(SOURCE).not.toContain("pcts: { 'very-high': '48%'");
    expect(SOURCE).not.toContain("'very-high': '82%'");
    expect(SOURCE).not.toContain('Well-folded A/B hormone helices');
    expect(SOURCE).not.toContain("'Protein Folding \\u00b7 pLDDT & PAE'");
    expect(SOURCE).toContain('fractionPlddtVeryHigh');
  });

  it('does not announce the fold note (which gives away the answer) before a prediction', async () => {
    await mount({});
    await click([...container.querySelectorAll('.af-preset-chip')].find((b) => b.textContent.indexOf('P01308') >= 0));
    const last = announced[announced.length - 1];
    expect(last).toContain('Make your prediction first.');
    expect(last).not.toContain('below 50');
  });

  it('cross-scale claim: no length cue and each wrong answer explains its own misconception', async () => {
    await mount({ _alphaFoldExplorer: { _scaleJourneySource: 'cellAtlasLab', prefillAccession: 'P01308', prefillGene: 'INS', prefillProtein: 'Insulin precursor' } });
    const choices = [...container.querySelectorAll('.af-claim-choice')].map((b) => b.textContent.trim());
    expect(choices).toHaveLength(3);
    const correct = choices[1];
    const longestWrong = Math.max(choices[0].length, choices[2].length);
    expect(correct.length / longestWrong).toBeLessThan(1.25);
    await click(container.querySelectorAll('.af-claim-choice')[2]);
    const fbExpression = container.querySelector('.af-cross-feedback').textContent;
    expect(fbExpression).toContain('pLDDT describes the model, not the cell');
    await click(container.querySelectorAll('.af-claim-choice')[0]);
    const fbProof = container.querySelector('.af-cross-feedback').textContent;
    expect(fbProof).toContain('Neither measures how much protein is made');
    expect(fbProof).not.toBe(fbExpression);
  });
});
