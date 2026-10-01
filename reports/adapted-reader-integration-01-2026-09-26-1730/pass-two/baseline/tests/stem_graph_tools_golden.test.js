// Render goldens for the MATH/LOGIC GRAPH cluster — the daily-driver
// function/data/logic tools (graphing calc, function grapher, CAS, calculus,
// probability, logic gates, unit converter, geometry, data plotting,
// inequality). None had golden coverage before the 2026-06-10 graph-cluster
// polish wave; this pins a deterministic render DIGEST per tool so structural
// render regressions fail loudly.
//
// Same pattern as stem_big_tools_golden / stem_math_tools_golden. Re-baseline
// INTENTIONAL changes with: npx vitest -u tests/stem_graph_tools_golden.test.js

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// file (under stem_lab/) + registered tool id. geo registers TWO tools.
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

function digest(html) {
  const count = (re) => (html.match(re) || []).length;
  return {
    lengthBucket: Math.round(html.length / 200),
    buttons: count(/role="button"|<button/g),
    svgs: count(/<svg/g),
    inputs: count(/<input/g),
    paths: count(/<path/g),
    circles: count(/<circle/g),
    sha: crypto.createHash('sha256').update(html).digest('hex').slice(0, 16),
  };
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

describe('math/logic graph cluster render goldens (default state)', () => {
  for (const tool of TOOLS) {
    it('renders + pins a digest for ' + tool.id, () => {
      const cfg = loadTool(tool.file, tool.id);
      expect(typeof cfg.render).toBe('function');
      let html;
      try {
        html = renderTool(tool.id, {});
      } catch (e) {
        throw new Error('render threw for ' + tool.id + ' (' + tool.file + '): ' + (e && e.message ? e.message : e));
      }
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
      expect(digest(html)).toMatchSnapshot();
    });
  }

  it('all tool ids are unique', () => {
    const ids = TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
