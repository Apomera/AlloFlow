import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const CELL_RENDER_PATHS = [
  'stem_lab/stem_tool_cell.js',
  'prismflow-deploy/public/stem_lab/stem_tool_cell.js',
];

describe('Cell simulator tooltip contrast and process diagrams', () => {
  beforeEach(() => resetStemLab());

  it('uses an explicit opaque canvas tooltip surface and readable body text', () => {
    const source = readFileSync('stem_lab/stem_tool_cell.js', 'utf8');
    expect(source).toContain("var ttFontSize = 10.5 * dpr;");
    expect(source).toContain("var ttMaxW = 290 * dpr;");
    expect(source).toContain("cctx.fillStyle = 'rgba(15,23,42,0.98)';");
    expect(source).toContain("cctx.fillStyle = '#f8fafc';");
    expect(source).not.toContain("cctx.fillStyle = 'var(--allo-stem-deeper");
  });

  it('renders the Processes route and recovers malformed saved process state', () => {
    CELL_RENDER_PATHS.forEach((filePath) => {
      resetStemLab();
      loadTool(filePath, 'cell');
      const html = renderTool('cell', { cell: { mode: 'processes', cellProcess: { forged: true } } });
      expect(html).toContain('data-cell-processes-workspace="true"');
      expect(html).toContain('Cellular processes');
      expect(html).toContain('id="cell-process-tab-respiration"');
      expect(html).toContain('aria-selected="true" aria-controls="cell-process-panel" tabindex="0"');
      expect(html).toContain('glucose + oxygen');
      expect(html).not.toContain('[object Object]');
      expect(html).not.toContain('data-cell-sim-canvas');
      expect(html).toContain('Cell Processes');
      expect(html).toContain('Connected pathway atlas');
      expect(html).toContain('Key inputs');
      expect(html).toContain('Key outputs');
      expect(html).toContain('How the pathway unfolds');
      expect(html).toContain('Trace energy, membrane transport, photosynthesis, and protein shipping.');
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain("modes: ['observe', 'interior', 'microdissection', 'processes', 'play', 'quiz']");
      expect(source).toContain("var allModes = ['observe','interior','microdissection','processes','play','quiz'");
    });
  });

  it('renders an accessible Krebs-cycle map with accurate per-glucose outputs', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cell.js', 'cell');
    const html = renderTool('cell', { cell: { mode: 'processes', cellProcess: 'krebs' } });
    expect(html).toContain('id="cell-process-panel" role="tabpanel" aria-labelledby="cell-process-tab-krebs"');
    expect(html).toContain('viewBox="0 0 720 430" role="img" aria-labelledby="cell-krebs-title cell-krebs-desc"');
    expect(html).toContain('2 acetyl-CoA');
    expect(html).toContain('4 CO₂');
    expect(html).toContain('6 NADH');
    expect(html).toContain('2 FADH₂');
    expect(html).toContain('Oxaloacetate');
    expect(html).toContain('Stoichiometry shown per glucose');
    expect(html).toContain('MATRIX CYCLE');
    expect(html).toContain('M405 112 Q482 142 486 205');
  });

  it('renders an accessible electron-transport and ATP-synthase map', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cell.js', 'cell');
    const html = renderTool('cell', { cell: { mode: 'processes', cellProcess: 'etc' } });
    expect(html).toContain('id="cell-process-panel" role="tabpanel" aria-labelledby="cell-process-tab-etc"');
    expect(html).toContain('viewBox="0 0 760 360" role="img" aria-labelledby="cell-etc-title cell-etc-desc"');
    expect(html).toContain('Complex I');
    expect(html).toContain('Complex II');
    expect(html).toContain('Complex III');
    expect(html).toContain('Complex IV');
    expect(html).toContain('ATP synthase');
    expect(html).toContain('INTERMEMBRANE SPACE');
    expect(html).toContain('MATRIX');
    expect(html).toContain('ADP + Pi \u2192 ATP');
    expect(html).toContain('MEMBRANE ENERGY COUPLING');
    expect(html).toContain('cx="175" cy="62" r="11"');
    expect(html).toContain('O\u2082 + e\u207B + H\u207A \u2192 H\u2082O');
    expect(html).not.toContain('NaN');
  });

  it('renders accessible overview maps for respiration, photosynthesis, and protein shipping', () => {
    const diagrams = [
      {
        process: 'respiration',
        viewBox: '0 0 760 310',
        labelledBy: 'cell-respiration-title cell-respiration-desc',
        labels: ['CELLULAR RESPIRATION', 'Glycolysis', 'Krebs cycle', 'most ATP produced'],
      },
      {
        process: 'photosynthesis',
        viewBox: '0 0 760 350',
        labelledBy: 'cell-photosynthesis-title cell-photosynthesis-desc',
        labels: ['PHOTOSYNTHESIS', 'Light reactions', 'Calvin cycle', 'G3P \u2192 sugars'],
      },
      {
        process: 'protein',
        viewBox: '0 0 760 330',
        labelledBy: 'cell-protein-title cell-protein-desc',
        labels: ['PROTEIN PRODUCTION + SHIPPING', 'DNA \u2192 mRNA', 'ROUGH ER', 'modify \u2022 tag \u2022 sort'],
      },
    ];

    diagrams.forEach(({ process, viewBox, labelledBy, labels }) => {
      resetStemLab();
      loadTool('stem_lab/stem_tool_cell.js', 'cell');
      const html = renderTool('cell', { cell: { mode: 'processes', cellProcess: process } });
      expect(html).toContain('viewBox="' + viewBox + '" role="img" aria-labelledby="' + labelledBy + '"');
      labels.forEach((label) => expect(html).toContain(label));
      expect(html).not.toContain('NaN');
      expect(html).not.toContain('data-cell-sim-canvas');
    });
  });
  it('renders membrane transport as an accessible sixth pathway', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cell.js', 'cell');
    const html = renderTool('cell', { cell: { mode: 'processes', cellProcess: 'transport' } });
    expect(html).toContain('6 linked pathways');
    expect(html).toContain('id="cell-process-tab-transport"');
    expect(html).toContain('id="cell-process-panel" role="tabpanel" aria-labelledby="cell-process-tab-transport"');
    expect(html).toContain('viewBox="0 0 760 360" role="img" aria-labelledby="cell-transport-title cell-transport-desc"');
    expect(html).toContain('PLASMA MEMBRANE');
    expect(html).toContain('Simple diffusion');
    expect(html).toContain('Facilitated diffusion');
    expect(html).toContain('Osmosis');
    expect(html).toContain('Active transport');
    expect(html).toContain('EXTRACELLULAR FLUID');
    expect(html).toContain('CYTOPLASM');
    expect(html).toContain('ATP \u2192 ADP + Pi');
    expect(html).toContain('Na\u207A: low \u2192 high');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('data-cell-sim-canvas');
  });
  it('supports guided stage focus with progress and malformed-state recovery', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cell.js', 'cell');
    const focused = renderTool('cell', { cell: { mode: 'processes', cellProcess: 'respiration', cellProcessStep: 2 } });
    expect(focused).toContain('Stage 3 of 4');
    expect(focused).toContain('role="progressbar" aria-label="Focused pathway stage" aria-valuemin="1" aria-valuemax="4" aria-valuenow="3"');
    expect(focused).toContain('data-cell-process-step="2" aria-pressed="true" aria-current="step"');
    expect(focused).toContain('Select a stage to focus your study.');
    expect(focused).toContain('FOCUS');
    expect(focused).toContain('data-cell-stage-focus="2" aria-labelledby="cell-stage-focus-title"');
    expect(focused).toContain('Look for this in the diagram');
    expect(focused).toContain('id="cell-stage-focus-title"');
    expect(focused).toContain('Krebs cycle');
    expect(focused).toContain('Mitochondrial matrix');

    resetStemLab();
    loadTool('stem_lab/stem_tool_cell.js', 'cell');
    const recovered = renderTool('cell', { cell: { mode: 'processes', cellProcess: 'transport', cellProcessStep: { forged: true } } });
    expect(recovered).toContain('Stage 1 of 4');
    expect(recovered).toContain('data-cell-process-step="0" aria-pressed="true" aria-current="step"');
    expect(recovered).toContain('data-cell-stage-focus="0" aria-labelledby="cell-stage-focus-title"');
    expect(recovered).toContain('Simple diffusion');
    expect(recovered).not.toContain('[object Object]');

    const source = readFileSync('stem_lab/stem_tool_cell.js', 'utf8');
    expect(source).toContain("upd('cellProcessStep', index);");
    expect(source).toContain("upd('cellProcessStep', 0);");
  });
  it('offers contextual, keyboard-safe navigation between related pathways', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cell.js', 'cell');
    const respiration = renderTool('cell', { cell: { mode: 'processes', cellProcess: 'respiration' } });
    expect(respiration).toContain('aria-label="Connected pathways from Cellular respiration"');
    expect(respiration).toContain('data-cell-process-connections="respiration"');
    expect(respiration).toContain('data-cell-related-process="krebs"');
    expect(respiration).toContain('data-cell-related-process="etc"');
    expect(respiration).toContain('Zoom into the Krebs cycle');
    expect(respiration).toContain('Follow electrons to ATP synthase');
    expect(respiration).toContain('2 next views');

    resetStemLab();
    loadTool('stem_lab/stem_tool_cell.js', 'cell');
    const transport = renderTool('cell', { cell: { mode: 'processes', cellProcess: 'transport' } });
    expect(transport).toContain('data-cell-related-process="protein"');
    expect(transport).toContain('data-cell-related-process="photosynthesis"');
    expect(transport).toContain('See how membrane proteins are made');

    const source = readFileSync('stem_lab/stem_tool_cell.js', 'utf8');
    expect(source).toContain("var relatedIndex = PROCESSES.findIndex(function(p) { return p.id === id; });");
    expect(source).toContain("if (relatedIndex >= 0) chooseProcess(relatedIndex, true);");
  });
  it('renders accessible organelle cutaways with structure-to-function labels', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cell.js', 'cell');
    const html = renderTool('cell', { cell: { mode: 'processes', cellProcess: 'respiration' } });
    [
      'cell-mito-cutaway-title cell-mito-cutaway-desc',
      'cell-chloroplast-cutaway-title cell-chloroplast-cutaway-desc',
      'cell-endomembrane-cutaway-title cell-endomembrane-cutaway-desc',
    ].forEach((labelledBy) => {
      expect(html).toContain('viewBox="0 0 320 210" role="img" aria-labelledby="' + labelledBy + '"');
    });
    expect(html).toContain('cristae = inner membrane folds');
    expect(html).toContain('granum = thylakoid stack');
    expect(html).toContain('rough ER + ribosomes');
    expect(html).toContain('vesicles carry selected cargo');
    expect(html).toContain('Structure \u2192 function');
    expect(html).not.toContain('NaN');
  });
  it('connects processes to organelle structure and supports keyboard tabs', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cell.js', 'cell');
    const html = renderTool('cell', { cell: { mode: 'processes', cellProcess: 'protein' } });
    expect(html).toContain('role="tablist" aria-label="Cellular process diagrams"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('Organelle deep dives: structure enables function');
    expect(html).toContain('Mitochondrion');
    expect(html).toContain('Chloroplast');
    expect(html).toContain('Endomembrane system');
    expect(html).toContain('Nucleus → ribosome → ER → Golgi');
    const source = readFileSync('stem_lab/stem_tool_cell.js', 'utf8');
    expect(source).toContain("if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = index + 1;");
    expect(source).toContain("else if (e.key === 'Home') next = 0;");
    expect(source).toContain("else if (e.key === 'End') next = PROCESSES.length - 1;");
  });
});