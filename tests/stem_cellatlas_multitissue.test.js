import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL_FILE = 'stem_lab/stem_tool_cellatlas.js';
const TOOL_ID = 'cellAtlasLab';

describe('Cell Atlas Lab multi-tissue investigations', () => {
  beforeEach(() => {
    resetStemLab();
    delete window.__alloCellAtlasPure;
    loadTool(TOOL_FILE, TOOL_ID);
  });

  it('provides attributed pancreas, lung, and brain source records', () => {
    const tissues = window.__alloCellAtlasPure.TISSUES;
    expect(tissues.map((tissue) => tissue.id)).toEqual(['pancreas', 'lung', 'brain']);
    expect(tissues.map((tissue) => tissue.source.hcaId)).toEqual([
      '894ae6ac-5b48-41a8-a72f-315a9b60a62e',
      'HLCA-v1.0',
      'Human-Brain-v1.0',
    ]);
    for (const tissue of tissues) {
      expect(tissue.source.hcaUrl).toMatch(/^https:\/\/(?:explore\.)?data\.humancellatlas\.org\//);
      expect(tissue.source.license).toBe('CC BY 4.0');
      expect(tissue.cells).toHaveLength(8);
      expect(tissue.genes).toHaveLength(8);
      expect(tissue.challenges).toHaveLength(3);
    }
  });

  it('keeps every displayed identity marker strongest in its tissue profile', () => {
    for (const tissue of window.__alloCellAtlasPure.TISSUES) {
      for (const cell of tissue.cells) {
        const highest = Object.entries(cell.evidence).sort((a, b) => b[1] - a[1])[0][0];
        expect(highest, `${tissue.id}:${cell.id}`).toBe(cell.marker);
        expect(tissue.genes.some((gene) => gene.id === cell.marker)).toBe(true);
      }
    }
  });

  it('classifies all nine tissue-specific mysteries as intended', () => {
    const pure = window.__alloCellAtlasPure;
    for (const tissue of pure.TISSUES) {
      for (const challenge of tissue.challenges) {
        const ranking = pure.classifyExpression(challenge.profile, tissue.id);
        expect(ranking[0].id, `${tissue.id}:${challenge.id}`).toBe(challenge.answer);
        expect(ranking[0].score).toBeGreaterThan(0.95);
      }
    }
  });

  it('renders distinct lung and brain maps, provenance, and journeys', () => {
    const lungMap = renderTool(TOOL_ID, { cellAtlasLab: { tissue: 'lung', view: 'map' } });
    expect(lungMap).toContain('Lung cell neighborhood');
    expect(lungMap).toContain('SFTPC');
    expect(lungMap).toContain('Alveolar type 2 cell');
    expect(lungMap).toContain('Follow SFTPC to AlphaFold');

    const lungSource = renderTool(TOOL_ID, { cellAtlasLab: { tissue: 'lung', view: 'source' } });
    expect(lungSource).toContain('The integrated Human Lung Cell Atlas');
    expect(lungSource).toContain('Zoom out to lung anatomy');
    expect(lungSource).toContain('Open atlas code');

    const brainMap = renderTool(TOOL_ID, { cellAtlasLab: { tissue: 'brain', view: 'map' } });
    expect(brainMap).toContain('Brain cell neighborhood');
    expect(brainMap).toContain('SLC17A7');
    expect(brainMap).toContain('Excitatory neuron');

    const brainSource = renderTool(TOOL_ID, { cellAtlasLab: { tissue: 'brain', view: 'source' } });
    expect(brainSource).toContain('Human Brain Cell Atlas v1.0');
    expect(brainSource).toContain('Zoom out to Brain Atlas');
    expect(brainSource).toContain('over 3M nuclei');
  });

  it('keeps the tissue selector and model boundary visible', () => {
    const html = renderTool(TOOL_ID, { cellAtlasLab: { tissue: 'brain', view: 'map' } });
    expect(html).toContain('Choose a Human Cell Atlas tissue investigation');
    expect(html).toContain('HLCA-v1.0');
    expect(html).toContain('Human-Brain-v1.0');
    expect(html).toContain('not a published UMAP');
    expect(html).toContain('Do not use it for diagnosis');
  });
});
