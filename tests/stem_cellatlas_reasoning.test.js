import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL_FILE = 'stem_lab/stem_tool_cellatlas.js';
const TOOL_ID = 'cellAtlasLab';

describe('Cell Atlas Lab scientific reasoning studio', () => {
  beforeEach(() => {
    resetStemLab();
    delete window.__alloCellAtlasPure;
    loadTool(TOOL_FILE, TOOL_ID);
  });

  it('defines cautious cross-tissue lenses with valid cell and marker references', () => {
    const pure = window.__alloCellAtlasPure;
    expect(pure.CROSS_TISSUE_LENSES.map((lens) => lens.id)).toEqual([
      'vascular',
      'immune',
      'support',
    ]);

    for (const lens of pure.CROSS_TISSUE_LENSES) {
      expect(lens.members).toHaveLength(3);
      expect(new Set(lens.members.map((member) => member.tissueId)).size).toBe(3);
      expect(lens.caution.length).toBeGreaterThan(50);

      for (const member of lens.members) {
        const tissue = pure.tissueById(member.tissueId);
        const cell = tissue.cells.find((item) => item.id === member.cellId);
        expect(cell, `${lens.id}:${member.tissueId}`).toBeDefined();
        expect(tissue.genes.some((gene) => gene.id === cell.marker)).toBe(true);
      }
    }
  });

  it('tracks claim, multi-marker evidence, and reasoning separately', () => {
    const pure = window.__alloCellAtlasPure;
    const incomplete = pure.notebookProgress({
      claim: 'Too short',
      evidence: 'KDR is strong.',
      reasoning: 'Not enough.',
    }, 'vascular');
    expect(incomplete).toMatchObject({
      claim: false,
      evidence: false,
      reasoning: false,
      markerHits: 1,
      complete: false,
    });

    const complete = pure.notebookProgress({
      claim: 'Vascular interfaces share a broad biological problem across organs.',
      evidence: 'KDR, PECAM1, and CLDN5 are the strongest displayed markers in their panels.',
      reasoning: 'Those observations support a functional comparison, while this teaching model cannot establish complete identity or developmental lineage.',
    }, 'vascular');
    expect(complete).toMatchObject({
      claim: true,
      evidence: true,
      reasoning: true,
      markerHits: 3,
      complete: true,
    });
  });

  it('renders three-organ evidence cards, a CER notebook, and a caution checkpoint', () => {
    const html = renderTool(TOOL_ID, {
      cellAtlasLab: { tissue: 'lung', view: 'cross', systemLens: 'vascular' },
    });

    expect(html).toContain('Cross-tissue evidence studio');
    expect(html).toContain('Pancreas');
    expect(html).toContain('Lung');
    expect(html).toContain('Brain');
    expect(html).toContain('KDR evidence 100/100');
    expect(html).toContain('PECAM1 evidence 100/100');
    expect(html).toContain('CLDN5 evidence 100/100');
    expect(html).toContain('Build a claim–evidence–reasoning argument');
    expect(html).toContain('Caution checkpoint');
    expect(html).toContain('cannot prove identity or lineage');
  });

  it('shows the six-step atlas pipeline and tissue-specific method context', () => {
    const pure = window.__alloCellAtlasPure;
    expect(pure.ATLAS_PIPELINE).toHaveLength(6);
    for (const stage of pure.ATLAS_PIPELINE) {
      expect(stage.action.length).toBeGreaterThan(35);
      expect(stage.uncertainty.length).toBeGreaterThan(35);
    }

    const lung = renderTool(TOOL_ID, {
      cellAtlasLab: { tissue: 'lung', view: 'source' },
    });
    expect(lung).toContain('How an expression atlas is built');
    expect(lung).toContain('1. Design + sample');
    expect(lung).toContain('6. Annotate + validate');
    expect(lung).toContain('consensus annotations from six experts');
    expect(lung).toContain('Filtering thresholds are analytical choices');

    const brain = renderTool(TOOL_ID, {
      cellAtlasLab: { tissue: 'brain', view: 'source' },
    });
    expect(brain).toContain('single-nucleus RNA sequencing');
    expect(brain).toContain('approximately 100 adult-brain dissections');
  });

  it('requires both a complete CER entry and the cautious conclusion for its quest', () => {
    const quest = window.StemLab._registry[TOOL_ID].questHooks.find(
      (item) => item.id === 'atlas_reasoning',
    );
    expect(quest).toBeDefined();

    const state = {
      crossNotebook: {
        immune: {
          claim: 'Immune surveillance occurs in all three displayed tissue contexts.',
          evidence: 'PTPRC is displayed in pancreas and lung, while AIF1 marks microglia.',
          reasoning: 'These observations support a functional comparison, but they do not make the cells interchangeable or prove shared lineage.',
        },
      },
      cautionAnswer: 'cautious',
    };
    expect(quest.check(state)).toBe(true);
    expect(quest.check({ ...state, cautionAnswer: 'marker' })).toBe(false);
  });
});
