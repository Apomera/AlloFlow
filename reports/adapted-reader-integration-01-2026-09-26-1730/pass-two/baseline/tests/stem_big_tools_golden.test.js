// Render goldens for the BIG STEM tools not covered by stem_tool_golden.test.js.
//
// WHY: the largest, most complex STEM tools (assessmentLiteracy 2.1MB, roadReady,
// printingPress, raptorHunt, cephalopodLab, solarSystem, plateTectonics,
// learningLab, birdLab, beehive, appLab, nutritionLab) had ONLY static crash-smoke
// (check_stem_render.cjs renders default state once). A concurrent session is
// actively editing STEM Lab (AI-gating, pedagogy, contrast, a11y); these goldens
// pin a deterministic render DIGEST so a drive-by edit that structurally breaks one
// of these tools fails loudly instead of silently. Complements (does not overlap)
// the curated set in tests/stem_tool_golden.test.js.
//
// Determinism: Date + Math.random are frozen so the digest is stable run-to-run.
// Re-baseline an INTENTIONAL render change with
//   npx vitest -u tests/stem_big_tools_golden.test.js
//
// SKIP: tools whose render() needs a browser-only global (THREE, AudioContext,
// document.fonts) throw inside jsdom for reasons unrelated to a regression — they
// stay in the suite as .skip with a reason and remain covered by check_stem_render
// + browser_strict_check. (Marked after a first run, not guessed.)

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// file (under stem_lab/) + registered tool id. `skip` set after first run for
// tools that need a browser-only global jsdom doesn't provide.
const TOOLS = [
  { file: 'stem_lab/stem_tool_assessmentliteracy.js', id: 'assessmentLiteracy' },
  { file: 'stem_lab/stem_tool_roadready.js', id: 'roadReady' },
  { file: 'stem_lab/stem_tool_printingpress.js', id: 'printingPress' },
  { file: 'stem_lab/stem_tool_raptorhunt.js', id: 'raptorHunt' },
  { file: 'stem_lab/stem_tool_cephalopodlab.js', id: 'cephalopodLab' },
  { file: 'stem_lab/stem_tool_nutritionlab.js', id: 'nutritionLab' },
  { file: 'stem_lab/stem_tool_solarsystem.js', id: 'solarSystem' },
  { file: 'stem_lab/stem_tool_platetectonics.js', id: 'plateTectonics' },
  { file: 'stem_lab/stem_tool_learning_lab.js', id: 'learningLab' },
  { file: 'stem_lab/stem_tool_birdlab.js', id: 'birdLab' },
  { file: 'stem_lab/stem_tool_beehive.js', id: 'beehive' },
  { file: 'stem_lab/stem_tool_applab.js', id: 'appLab' },
];

function digest(html) {
  const count = (re) => (html.match(re) || []).length;
  return {
    // coarse length bucket: a 1-char copy tweak doesn't churn, a lost/doubled
    // panel does.
    lengthBucket: Math.round(html.length / 200),
    buttons: count(/role="button"|<button/g),
    svgs: count(/<svg/g),
    inputs: count(/<input/g),
    selects: count(/<select/g),
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

describe('big STEM tool render goldens (default state)', () => {
  for (const tool of TOOLS) {
    const testFn = tool.skip ? it.skip : it;
    testFn('renders + pins a digest for ' + tool.id + (tool.skip ? ' [SKIP: ' + tool.skip + ']' : ''), () => {
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

  it('all tool ids are unique (no copy-paste id collisions)', () => {
    const ids = TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
