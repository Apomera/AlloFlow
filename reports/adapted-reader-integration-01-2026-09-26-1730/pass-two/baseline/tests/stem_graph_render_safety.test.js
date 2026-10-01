import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOLS = [
  { file: 'stem_lab/stem_tool_graphcalc.js', id: 'graphCalc' },
  { file: 'stem_lab/stem_tool_funcgrapher.js', id: 'funcGrapher' },
  { file: 'stem_lab/stem_tool_algebraCAS.js', id: 'algebraCAS' },
  { file: 'stem_lab/stem_tool_calculus.js', id: 'calculus' },
  { file: 'stem_lab/stem_tool_probability.js', id: 'probability' },
  { file: 'stem_lab/stem_tool_logiclab.js', id: 'logicLab' },
  { file: 'stem_lab/stem_tool_unitconvert.js', id: 'unitConvert' },
  { file: 'stem_lab/stem_tool_geo.js', id: 'geoQuiz' },
  { file: 'stem_lab/stem_tool_geo.js', id: 'geometryProver' },
  { file: 'stem_lab/stem_tool_dataplot.js', id: 'dataPlot' },
  { file: 'stem_lab/stem_tool_datastudio.js', id: 'dataStudio' },
  { file: 'stem_lab/stem_tool_inequality.js', id: 'inequality' },
];

function renderWithWarnings(tool) {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  let html;
  let messages;

  try {
    loadTool(tool.file, tool.id);
    html = renderTool(tool.id, {});
    messages = errorSpy.mock.calls.concat(warnSpy.mock.calls).map((args) => args.join(' ')).join('\n');
  } finally {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  }

  return { html, messages };
}

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.4242);
});

afterAll(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

beforeEach(() => resetStemLab());

describe('STEM graph tool render safety', () => {
  for (const tool of TOOLS) {
    it('does not emit non-finite SVG warnings for ' + tool.id, () => {
      const { html, messages } = renderWithWarnings(tool);

      expect(typeof html).toBe('string');
      expect(messages).not.toMatch(/Received NaN|Received Infinity|non-finite/i);
      expect(html).not.toMatch(/(?:x1|x2|y1|y2|cx|cy|points|d|width|height)="[^"]*(?:NaN|Infinity)/);
    });
  }
});
