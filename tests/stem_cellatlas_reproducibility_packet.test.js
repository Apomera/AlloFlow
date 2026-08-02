import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL_FILE = 'stem_lab/stem_tool_cellatlas.js';
const PUBLIC_FILE = 'desktop/web-app/public/stem_lab/stem_tool_cellatlas.js';
const TOOL_ID = 'cellAtlasLab';

describe('Cell Atlas reproducibility audit packet', () => {
  beforeEach(() => {
    resetStemLab();
    delete window.__alloCellAtlasPure;
    delete window.__alloCellAtlasRealSnapshots;
    new Function(readFileSync(resolve(process.cwd(), 'stem_lab/stem_data_cellatlas_muraro.js'), 'utf8'))();
    loadTool(TOOL_FILE, TOOL_ID);
  });

  it('renders a provenance-aware, sequence-free audit action', () => {
    const html = renderTool(TOOL_ID, {
      cellAtlasLab: {
        tissue: 'pancreas',
        view: 'map',
        evidenceMode: 'real',
        replicateId: 'replicate_b',
        replicateCell: 'endothelial',
        replicateGene: 'KDR',
        replicateMetric: 'detectionPct',
        replicatesVisited: { replicate_a: true, replicate_b: true },
        reproducibilityInterpretation: 'external-study',
      },
    });
    expect(html).toContain('Copy reproducibility audit');
    expect(html).toContain('External study status: not included');
    const source = readFileSync(resolve(process.cwd(), TOOL_FILE), 'utf8');
    expect(source).toContain("'Dataset version: ' + realSnapshot.source.datasetVersionId");
    expect(source).toContain('No source donor identifiers are included');
  });

  it('keeps the deployed mirror exact and the packet sequence-free', () => {
    const source = readFileSync(resolve(process.cwd(), TOOL_FILE), 'utf8');
    const mirror = readFileSync(resolve(process.cwd(), PUBLIC_FILE), 'utf8');
    expect(mirror).toBe(source);
    expect(source).toContain('function reproducibilityPacket()');
    expect(source).toContain('sequence-free reproducibility audit');
    expect(source).not.toMatch(/reproducibilityPacket[\s\S]{0,1800}\bsequence\s*:/i);
  });
});
