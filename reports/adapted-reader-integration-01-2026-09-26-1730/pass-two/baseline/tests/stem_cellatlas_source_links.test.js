import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL_FILE = 'stem_lab/stem_tool_cellatlas.js';
const TOOL_ID = 'cellAtlasLab';

describe('Cell Atlas Lab CER source context links', () => {
  beforeEach(() => {
    resetStemLab();
    delete window.__alloCellAtlasPure;
    loadTool(TOOL_FILE, TOOL_ID);
  });

  it('renders attributed source projects and a direct HCA context link for every displayed organ', () => {
    const html = renderTool(TOOL_ID, {
      cellAtlasLab: { tissue: 'lung', view: 'cross', systemLens: 'vascular' },
    });

    expect(html).toContain('Source: Muraro et al. (2016), Cell Systems');
    expect(html).toContain('Source: Sikkema et al. (2023), Nature Medicine');
    expect(html).toContain('Source: Siletti et al. (2023), Science');
    expect(html).toContain('Open 894ae6ac-5b48-41a8-a72f-315a9b60a62e source context');
    expect(html).toContain('Open HLCA-v1.0 source context');
    expect(html).toContain('Open Human-Brain-v1.0 source context');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener"');
  });
});
