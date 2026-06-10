// Render goldens for the career/nature LONG-TAIL cluster — the final breadth
// wave of the 2026-06 polish program (pets, decomposer, companion planting,
// migration, renewables, stewardship, evolution, economics, auto repair, bike
// lab, first response, life skills, oratory, singing, typing, play lab,
// coding, LLM literacy, world builder, behavior lab). None had digest
// coverage before; this pins a deterministic render DIGEST per tool.
//
// Same pattern as the other stem_*_golden files. Re-baseline INTENTIONAL
// changes with: npx vitest -u tests/stem_longtail_tools_golden.test.js

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOLS = [
  { file: 'stem_lab/stem_tool_pets.js', id: 'petsLab' },
  { file: 'stem_lab/stem_tool_decomposer.js', id: 'decomposer' },
  { file: 'stem_lab/stem_tool_companionplanting.js', id: 'companionPlanting' },
  { file: 'stem_lab/stem_tool_migration.js', id: 'migration' },
  { file: 'stem_lab/stem_tool_renewables.js', id: 'renewablesLab' },
  { file: 'stem_lab/stem_tool_stewardship.js', id: 'stewardshipHub' },
  { file: 'stem_lab/stem_tool_evolab.js', id: 'evoLab' },
  { file: 'stem_lab/stem_tool_economicslab.js', id: 'economicsLab' },
  { file: 'stem_lab/stem_tool_autorepair.js', id: 'autoRepair' },
  { file: 'stem_lab/stem_tool_bikelab.js', id: 'bikeLab' },
  { file: 'stem_lab/stem_tool_firstresponse.js', id: 'firstResponse' },
  { file: 'stem_lab/stem_tool_lifeskills.js', id: 'lifeSkills' },
  { file: 'stem_lab/stem_tool_oratory.js', id: 'oratory' },
  { file: 'stem_lab/stem_tool_singing.js', id: 'singing' },
  { file: 'stem_lab/stem_tool_typingpractice.js', id: 'typingPractice' },
  { file: 'stem_lab/stem_tool_playlab.js', id: 'playlab' },
  { file: 'stem_lab/stem_tool_coding.js', id: 'codingPlayground' },
  { file: 'stem_lab/stem_tool_llm_literacy.js', id: 'llmLiteracy' },
  { file: 'stem_lab/stem_tool_worldbuilder.js', id: 'worldBuilder' },
  { file: 'stem_lab/stem_tool_behaviorlab.js', id: 'behaviorLab' },
];

function digest(html) {
  const count = (re) => (html.match(re) || []).length;
  return {
    lengthBucket: Math.round(html.length / 200),
    buttons: count(/role="button"|<button/g),
    svgs: count(/<svg/g),
    inputs: count(/<input/g),
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

describe('career/nature long-tail render goldens (default state)', () => {
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
