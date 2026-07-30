import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL_FILE = 'stem_lab/stem_tool_cellatlas.js';
const DATA_FILE = 'stem_lab/stem_data_cellatlas_muraro.js';
const TOOL_ID = 'cellAtlasLab';

function evaluateSnapshot() {
  new Function(readFileSync(resolve(process.cwd(), DATA_FILE), 'utf8'))();
}

describe('Cell Atlas Lab snapshot dependency loading', () => {
  beforeEach(() => {
    resetStemLab();
    delete window.__alloCellAtlasPure;
    delete window.__alloCellAtlasRealSnapshots;
  });

  it('degrades safely before data arrives and recognizes a late snapshot without re-registering', () => {
    loadTool(TOOL_FILE, TOOL_ID);
    const before = renderTool(TOOL_ID, {
      cellAtlasLab: { tissue: 'pancreas', view: 'map', evidenceMode: 'real' },
    });
    expect(before).toContain('Real snapshot: pancreas only');
    expect(before).not.toContain('Real snapshot provenance summary');

    evaluateSnapshot();
    const after = renderTool(TOOL_ID, {
      cellAtlasLab: { tissue: 'pancreas', view: 'map', evidenceMode: 'real' },
    });
    expect(after).toContain('Real Muraro snapshot');
    expect(after).toContain('Real snapshot provenance summary');
    expect(after).toContain('ac56150b-add4-4336-9059-6d3d3ce17f3b');
  });

  it('orders only the snapshot dependency while leaving unrelated plugins parallel', () => {
    for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(source).toContain(
        "var orderedCellAtlasDependency = mod === 'stem_lab/stem_data_cellatlas_muraro.js' || mod === 'stem_lab/stem_tool_cellatlas.js';",
      );
      expect(source).toContain('s.async = !orderedCellAtlasDependency;');
      expect(source).toContain('every unrelated plugin remains parallel');
    }
  });
});
