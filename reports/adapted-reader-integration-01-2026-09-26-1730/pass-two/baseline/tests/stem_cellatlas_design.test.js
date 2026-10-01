import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL_FILE = 'stem_lab/stem_tool_cellatlas.js';
const TOOL_ID = 'cellAtlasLab';

describe('Cell Atlas Lab experimental-design literacy', () => {
  beforeEach(() => {
    resetStemLab();
    delete window.__alloCellAtlasPure;
    loadTool(TOOL_FILE, TOOL_ID);
  });

  it('defines six bounded study decisions with explanatory tradeoffs', () => {
    const pure = window.__alloCellAtlasPure;
    expect(pure.DESIGN_FIELDS.map((field) => field.id)).toEqual([
      'question',
      'donors',
      'regions',
      'preparation',
      'depth',
      'batchPlan',
    ]);
    for (const field of pure.DESIGN_FIELDS) {
      expect(field.options).toHaveLength(3);
      for (const option of field.options) {
        expect(option.note.length).toBeGreaterThan(25);
      }
    }
  });

  it('makes richer coverage improve heuristic dimensions while increasing complexity', () => {
    const pure = window.__alloCellAtlasPure;
    const pilot = pure.evaluateDesign({
      question: 'comparison',
      donors: '3',
      regions: '1',
      preparation: 'cells',
      depth: 'survey',
      batchPlan: 'confounded',
    });
    const ambitious = pure.evaluateDesign({
      question: 'comparison',
      donors: '30',
      regions: '20',
      preparation: 'mixed',
      depth: 'deep',
      batchPlan: 'replicated',
    });

    for (const key of ['representation', 'rare', 'comparison', 'recovery']) {
      expect(ambitious.raw[key], key).toBeGreaterThan(pilot.raw[key]);
    }
    expect(pilot.complexity).toBe('lower');
    expect(ambitious.complexity).toBe('high');
    expect(pilot.dimensions.find((item) => item.id === 'comparison').level).toBe('limited');
    expect(ambitious.dimensions.find((item) => item.id === 'comparison').level).toBe('strong');
  });

  it('provides five quality-control cases with one valid response each', () => {
    const cases = window.__alloCellAtlasPure.DESIGN_CASES;
    expect(cases.map((item) => item.id)).toEqual([
      'fragile',
      'doublet',
      'batch',
      'dropout',
      'singlemarker',
    ]);
    for (const item of cases) {
      expect(item.choices).toHaveLength(3);
      expect(item.choices.filter((choice) => choice.id === item.answer)).toHaveLength(1);
      expect(item.explanation.length).toBeGreaterThan(120);
    }
  });

  it('renders a qualitative design rubric, boundary, and diagnostic case', () => {
    const html = renderTool(TOOL_ID, {
      cellAtlasLab: { tissue: 'brain', view: 'design' },
    });

    expect(html).toContain('Design a cell-atlas study');
    expect(html).toContain('Study question');
    expect(html).toContain('Biological donors');
    expect(html).toContain('Material captured');
    expect(html).toContain('Group-to-batch plan');
    expect(html).toContain('Qualitative rubric');
    expect(html).toContain('not budgets, power calculations, or predictions');
    expect(html).toContain('No configuration removes every bias');
    expect(html).toContain('Copy study plan packet');
    expect(html).toContain('Missing fragile cells');
    expect(html).toContain('Compare preparation methods or use nuclei');
  });

  it('links methodology context to protocol benchmarking and access governance', () => {
    const html = renderTool(TOOL_ID, {
      cellAtlasLab: { tissue: 'lung', view: 'source' },
    });
    expect(html).toContain('HCA protocol benchmarking study');
    expect(html).toContain('6e177195-0ac0-468b-99a2-87de96dc9db4');
    expect(html).toContain('Open vs managed data access');
    expect(html).toContain('requesting-access-to-controlled-access-data');
  });

  it('requires a changed design and three solved QC cases for its quest', () => {
    const quest = window.StemLab._registry[TOOL_ID].questHooks.find(
      (item) => item.id === 'atlas_design_3',
    );
    expect(quest).toBeDefined();
    expect(quest.check({
      designChanged: true,
      completedDesignCases: { fragile: true, doublet: true, batch: true },
    })).toBe(true);
    expect(quest.check({
      designChanged: false,
      completedDesignCases: { fragile: true, doublet: true, batch: true },
    })).toBe(false);
  });
});
