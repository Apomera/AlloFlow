import { describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

describe('Function Grapher accessibility', () => {
  it('provides a named, described static alternative for the Function Zoo canvas', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_funcgrapher.js', 'funcGrapher');

    const html = renderTool('funcGrapher', {
      funcGrapher: {
        type: 'linear', a: 1, b: 0, c: 0,
        showDeriv: false, showArea: false,
        traceX: 0, showTable: false, showLearn: false,
        compare: false, compareType: 'linear', compareA: 1, compareB: 0, compareC: 0,
        aiExplain: '', aiExplainLoading: false,
      },
    });

    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Function Zoo comparison of six common function shapes"');
    expect(html).toContain('aria-describedby="funcgrapher-zoo-description"');
    expect(html).toContain('data-a11y-static="true"');
    expect(html).toContain('id="funcgrapher-zoo-description"');
    expect(html).toContain('linear is a straight rising line');
  });
});
