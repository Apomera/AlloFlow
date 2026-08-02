import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL_FILE = 'stem_lab/stem_tool_cellatlas.js';
const TOOL_ID = 'cellAtlasLab';

describe('Cell Atlas Lab learner packet download', () => {
  beforeEach(() => {
    resetStemLab();
    delete window.__alloCellAtlasPure;
    loadTool(TOOL_FILE, TOOL_ID);
  });

  it('offers a named Markdown CER artifact beside the clipboard export', () => {
    const html = renderTool(TOOL_ID, {
      cellAtlasLab: { tissue: 'lung', view: 'cross', systemLens: 'vascular' },
    });

    expect(html).toContain('Copy cross-tissue CER packet');
    expect(html).toContain('Download CER packet (.md)');
    expect(html).toContain('Download cell-atlas-cross-tissue-cer.md');
  });
});
