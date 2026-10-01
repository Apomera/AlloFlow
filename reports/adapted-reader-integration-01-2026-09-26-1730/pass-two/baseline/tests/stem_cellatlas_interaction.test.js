import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(
  resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'),
);

const TOOL_FILE = 'stem_lab/stem_tool_cellatlas.js';
const DATA_FILE = 'stem_lab/stem_data_cellatlas_muraro.js';
const TOOL_ID = 'cellAtlasLab';

function loadSnapshot() {
  new Function(readFileSync(resolve(process.cwd(), DATA_FILE), 'utf8'))();
}

function buttonByText(container, text) {
  return [...container.querySelectorAll('button')].find(
    (button) => button.textContent.trim() === text,
  );
}

describe('Cell Atlas Lab mounted interactions', () => {
  let container;
  let root;
  let latestState;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    resetStemLab();
    delete window.__alloCellAtlasPure;
    delete window.__alloCellAtlasRealSnapshots;
    loadSnapshot();
    loadTool(TOOL_FILE, TOOL_ID);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    container.remove();
    root = null;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  async function mount(initialCellAtlasState = {}) {
    const config = window.StemLab._registry[TOOL_ID];
    function Host() {
      const [toolData, setToolData] = React.useState({
        cellAtlasLab: {
          tissue: 'pancreas',
          view: 'map',
          selectedCell: 'beta',
          selectedGene: 'INS',
          ...initialCellAtlasState,
        },
      });
      latestState = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }
    root = ReactDOMClient.createRoot(container);
    await act(async () => root.render(React.createElement(Host)));
  }

  async function click(text) {
    const button = buttonByText(container, text);
    expect(button, `button "${text}"`).toBeDefined();
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    return button;
  }

  it('enters real mode, compares both metrics, and records the cautious interpretation', async () => {
    await mount();

    await click('Real Muraro snapshot');
    expect(latestState.cellAtlasLab.evidenceMode).toBe('real');
    expect(latestState.cellAtlasLab.realDataViewed).toBe(true);
    expect(latestState.cellAtlasLab.realMetricsSeen.relativeMeanPct).toBe(true);
    expect(container.textContent).toContain('Detected does not mean defining');

    await click('Detection frequency');
    expect(latestState.cellAtlasLab.realMetric).toBe('detectionPct');
    expect(latestState.cellAtlasLab.realMetricsSeen).toEqual({
      relativeMeanPct: true,
      detectionPct: true,
    });
    expect(
      buttonByText(container, 'Detection frequency').getAttribute('aria-pressed'),
    ).toBe('true');

    await click(
      'Detection alone is insufficient; signal magnitude, the multigene panel, and possible ambient/background RNA all matter.',
    );
    expect(latestState.cellAtlasLab.realInterpretation).toBe('cautious');
    expect(container.textContent).toContain(
      'Defensible: abundant transcripts can appear as low background',
    );

    const quest = window.StemLab._registry[TOOL_ID].questHooks.find(
      (item) => item.id === 'atlas_real_bridge',
    );
    expect(quest.check(latestState.cellAtlasLab)).toBe(true);
  });

  it('records both benchmark views and a representation-aware explanation', async () => {
    await mount({ evidenceMode: 'real' });

    expect(container.textContent).toContain('Same source cells, different computational representation');
    expect(container.textContent).toContain('1 of 7 aligned');
    expect(container.textContent).toContain('7 of 7 aligned');

    await click('Inspect detection rankings');
    await click('Inspect relative-signal rankings');
    expect(latestState.cellAtlasLab.benchmarkMetricsSeen).toEqual({
      detectionPct: true,
      relativeMeanPct: true,
    });

    await click(
      'Detection frequency emphasizes broad presence, including background; relative magnitude preserves which marker dominates each displayed identity.',
    );
    expect(latestState.cellAtlasLab.metricStressAnswer).toBe('representation');
    expect(container.textContent).toContain('a representation can preserve or erase the contrast');

    const quest = window.StemLab._registry[TOOL_ID].questHooks.find(
      (item) => item.id === 'atlas_metric_stress',
    );
    expect(quest.check(latestState.cellAtlasLab)).toBe(true);
  });

  it('compares pseudonymous replicates and records a denominator-aware conclusion', async () => {
    await mount({ evidenceMode: 'real' });

    expect(container.textContent).toContain('Does the pattern transfer across people?');
    expect(container.textContent).toContain('28 of 28');
    expect(container.textContent).toContain('22 of 28');
    for (const label of ['Replicate A', 'Replicate B']) {
      const replicateButton = [...container.querySelectorAll('.cal-replicate-tab')].find(
        (button) => button.querySelector('strong')?.textContent === label,
      );
      expect(replicateButton, label).toBeDefined();
      await act(async () => {
        replicateButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    }
    await click('Inspect relative-mean transfer');
    await click('Inspect detection transfer');
    expect(Object.keys(latestState.cellAtlasLab.replicatesVisited)).toHaveLength(2);
    expect(latestState.cellAtlasLab.replicateMetricsSeen).toEqual({
      relativeMeanPct: true,
      detectionPct: true,
    });

    await click(
      'Both sampled cells had detected KDR, but n=2 gives weak precision; inspect other replicates and avoid population-level certainty.',
    );
    expect(latestState.cellAtlasLab.replicateInterpretation).toBe('cautious');
    expect(container.textContent).toContain('percentages need denominators');

    const quest = window.StemLab._registry[TOOL_ID].questHooks.find(
      (item) => item.id === 'atlas_replicates',
    );
    expect(quest.check(latestState.cellAtlasLab)).toBe(true);
  });

  it('distinguishes pooled-cell weighting from independent donor replication', async () => {
    await mount({ evidenceMode: 'real' });

    expect(container.textContent).toContain('Why pooled cells can mislead');
    expect(container.textContent).toContain('14.1%');
    expect(container.textContent).toContain('31.4%');
    expect(container.textContent).toContain('8.1–23.5%');
    await click(
      'They answer different weighting questions: pooled cells emphasize donors with more captured cells, while the descriptive replicate mean weights each donor equally; neither alone proves a population rate.',
    );
    expect(latestState.cellAtlasLab.pseudoreplicationInterpretation).toBe('nested');
    expect(container.textContent).toContain('Cell count increases within-donor detail');
  });

  it('runs feature-ablation trials and records a bounded interpretation', async () => {
    await mount({ evidenceMode: 'real' });

    expect(container.textContent).toContain('How fragile is an eight-gene ranking?');
    await click('Remove INS');
    expect(latestState.cellAtlasLab.ablationGene).toBe('INS');
    expect(container.textContent).toContain('Ranking changed: Beta cell → Alpha cell');

    await click('Remove GCG');
    expect(Object.keys(latestState.cellAtlasLab.ablationTrials)).toHaveLength(2);
    expect(container.textContent).toContain('Ranking stayed at Beta cell');

    await click(
      'This limited panel and template ranking lack redundancy for that profile; stronger annotation should use converging markers, QC, and replication.',
    );
    expect(latestState.cellAtlasLab.ablationInterpretation).toBe('panel');
    expect(container.textContent).toContain('the flip diagnoses feature dependence in this pipeline');

    const quest = window.StemLab._registry[TOOL_ID].questHooks.find(
      (item) => item.id === 'atlas_ablation',
    );
    expect(quest.check(latestState.cellAtlasLab)).toBe(true);
  });

  it('builds a searched panel and records the held-out-data interpretation', async () => {
    await mount({ evidenceMode: 'real' });

    expect(container.textContent).toContain('design a marker panel');
    await click('Use searched five-gene example');
    expect(latestState.cellAtlasLab.panelMetric).toBe('detectionPct');
    expect(Object.keys(latestState.cellAtlasLab.panelGenes)).toHaveLength(5);
    expect(container.textContent).toContain('5 of 7');
    expect(container.textContent).toContain('top templates aligned with source annotations using 5 gene(s)');

    await click(
      'Selection and scoring used the same small dataset, so apparent agreement is optimistic; test the panel on independent held-out data.',
    );
    expect(latestState.cellAtlasLab.panelInterpretation).toBe('holdout');
    expect(container.textContent).toContain('panel search can capitalize on this dataset');
  });

  it('switches perturbation envelopes and records a sensitivity-bounded conclusion', async () => {
    await mount({ evidenceMode: 'real' });

    expect(container.textContent).toContain('test bounded perturbation stability');
    expect(container.textContent).toContain('192 of 256');
    await click('Stress detection frequency');
    await click('Use ±50% envelope');
    expect(latestState.cellAtlasLab.stabilityMetric).toBe('detectionPct');
    expect(latestState.cellAtlasLab.stabilityAmount).toBe(0.5);
    expect(container.textContent).toContain('136 of 256');

    await click(
      'The top template survives 75% of this chosen perturbation grid; that measures pipeline sensitivity, not biological confidence or correctness.',
    );
    expect(latestState.cellAtlasLab.stabilityInterpretation).toBe('sensitivity');
    expect(container.textContent).toContain('robustness and validity are separate axes');
  });

  it('returns to the teaching layer when moving to a tissue without a bundled snapshot', async () => {
    await mount({ evidenceMode: 'real' });
    expect(buttonByText(container, 'Real Muraro snapshot')).toBeDefined();

    const lungButton = [...container.querySelectorAll('.cal-tissue')].find(
      (button) => button.textContent.includes('Lung'),
    );
    expect(lungButton).toBeDefined();
    await act(async () => {
      lungButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(latestState.cellAtlasLab.tissue).toBe('lung');
    expect(latestState.cellAtlasLab.evidenceMode).toBe('teaching');
    const unavailable = buttonByText(container, 'Real snapshot: pancreas only');
    expect(unavailable).toBeDefined();
    expect(unavailable.disabled).toBe(true);
  });
});
