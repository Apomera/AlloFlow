import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL_FILE = 'stem_lab/stem_tool_cellatlas.js';
const TOOL_ID = 'cellAtlasLab';

describe('Cell Atlas Lab science and accessibility contract', () => {
  beforeEach(() => {
    resetStemLab();
    delete window.__alloCellAtlasPure;
    loadTool(TOOL_FILE, TOOL_ID);
  });

  it('uses an attributed HCA pancreas source and clearly separates teaching representations', () => {
    const pure = window.__alloCellAtlasPure;
    expect(pure.SOURCE.hcaId).toBe('894ae6ac-5b48-41a8-a72f-315a9b60a62e');
    expect(pure.SOURCE.license).toBe('CC BY 4.0');
    expect(pure.CELL_TYPES).toHaveLength(8);
    expect(pure.GENES).toHaveLength(8);

    const html = renderTool(TOOL_ID, { cellAtlasLab: { view: 'source' } });
    expect(html).toContain('What is real, curated, and illustrative?');
    expect(html).toContain('They are not raw cells or a published UMAP');
    expect(html).toContain('Do not use it for diagnosis');
    expect(html).toContain(pure.SOURCE.hcaId);
  });

  it('classifies each mystery profile by its intended marker pattern', () => {
    const pure = window.__alloCellAtlasPure;
    for (const challenge of pure.CHALLENGES) {
      const ranking = pure.classifyExpression(challenge.profile);
      expect(ranking[0].id, challenge.id).toBe(challenge.answer);
      expect(ranking[0].score).toBeGreaterThan(0.95);
    }
  });

  it('keeps canonical pancreas markers strongest in their teaching profiles', () => {
    const pure = window.__alloCellAtlasPure;
    const expected = {
      beta: 'INS',
      alpha: 'GCG',
      delta: 'SST',
      ductal: 'KRT19',
      acinar: 'PRSS1',
      stellate: 'COL3A1',
      endothelial: 'KDR',
      immune: 'PTPRC',
    };
    for (const cell of pure.CELL_TYPES) {
      const highest = Object.entries(cell.evidence).sort((a, b) => b[1] - a[1])[0][0];
      expect(highest, cell.id).toBe(expected[cell.id]);
      expect(cell.marker).toBe(expected[cell.id]);
    }
  });

  it('renders a keyboard-described map and a semantic comparison table', () => {
    const map = renderTool(TOOL_ID, { cellAtlasLab: { view: 'map' } });
    expect(map).toContain('Illustrative pancreas cell-type expression neighborhood');
    expect(map).toContain('keyboard selectable');
    expect(map).toContain('not a published UMAP');
    expect(map).toContain('Follow INS to AlphaFold');

    const compare = renderTool(TOOL_ID, { cellAtlasLab: { view: 'compare' } });
    expect(compare).toContain('<table');
    expect(compare).toContain('<caption');
    expect(compare).toContain('Evidence-based claim');
    expect(compare).toContain('RNA abundance');
  });

  it('wires the insulin handoff into AlphaFold accession prefilling', () => {
    const atlasSource = readFileSync(resolve(process.cwd(), TOOL_FILE), 'utf8');
    const alphaFoldSource = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_alphafold.js'), 'utf8');
    expect(atlasSource).toContain("prefillAccession: 'P01308'");
    expect(atlasSource).toContain("prefillLabel: 'Human insulin'");
    expect(alphaFoldSource).toContain('explorerLaunchUrl');
    expect(alphaFoldSource).toContain("'&accession=' + encodeURIComponent(prefillAccession)");
  });

  it('offers measurable exploration, comparison, classification, and cross-tool quests', () => {
    const cfg = window.StemLab._registry[TOOL_ID];
    expect(cfg.questHooks.map((quest) => quest.id)).toEqual([
      'atlas_explore_3',
      'atlas_tissues_3',
      'atlas_compare',
      'atlas_mystery_2',
      'atlas_real_bridge',
      'atlas_metric_stress',
      'atlas_ablation',
      'atlas_replicates',
      'atlas_reproducibility',
      'atlas_design_3',
      'atlas_reasoning',
      'atlas_scale_journey',
      'atlas_scale_record',
    ]);
    const state = {
      exploredTypes: { beta: true, alpha: true, ductal: true },
      comparisonViewed: true,
      completedChallenges: { hormone: true, duct: true },
      tissuesVisited: { pancreas: true, lung: true, brain: true },
      journeyHandoffs: { pancreas: true },
      realDataViewed: true,
      realMetricsSeen: { relativeMeanPct: true, detectionPct: true },
      realInterpretation: 'cautious',
      benchmarkMetricsSeen: { detectionPct: true, relativeMeanPct: true },
      metricStressAnswer: 'representation',
      ablationTrials: { 'relativeMeanPct:beta:INS': true, 'relativeMeanPct:alpha:GCG': true },
      ablationInterpretation: 'panel',
      replicatesVisited: { replicate_a: true, replicate_b: true },
      replicateMetricsSeen: { relativeMeanPct: true, detectionPct: true },
      replicateInterpretation: 'cautious',
      reproducibilityInterpretation: 'external-study',
      designChanged: true,
      completedDesignCases: { fragile: true, doublet: true, batch: true },
      crossNotebook: { vascular: { claim: 'Vascular cells solve a shared interface problem.', evidence: 'KDR and PECAM1 are strong displayed markers.', reasoning: 'These marker programs support comparison, but the teaching model cannot prove identity or lineage.' } },
      cautionAnswer: 'cautious',
      alphaFoldHandoff: true,
      alphaFoldEvidenceRecord: { kind: 'cell-atlas-alphafold-evidence', complete: true },
    };
    for (const quest of cfg.questHooks) expect(quest.check(state), quest.id).toBe(true);
  });
});
