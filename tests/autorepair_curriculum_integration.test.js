// Auto Repair Shop — curriculum integration.
//
// Three big 3D modules were added and the tool's own connective tissue did not
// know about any of them: the learning path curated a curriculum that skipped
// them, and the quiz had zero questions on what they teach. A module that the
// curriculum never mentions and the assessment never checks is a module the
// tool does not really believe in.
//
// This file also pins the counts that kept going stale. "55 questions",
// "50 questions", "28 modules" and "18 Learning Path modules" were all wrong at
// the same time because every one of them was hand-typed prose.

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_autorepair.js';
const ID = 'autoRepair';
const SRC = readFileSync(resolve(process.cwd(), FILE), 'utf8');

function extractArray(name) {
  const start = SRC.indexOf('var ' + name + ' = [');
  expect(start, name + ' not found').toBeGreaterThan(-1);
  const open = SRC.indexOf('[', start);
  let depth = 0, end = -1;
  for (let i = open; i < SRC.length; i++) {
    if (SRC[i] === '[') depth++;
    else if (SRC[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  // eslint-disable-next-line no-new-func
  return new Function('return ' + SRC.slice(open, end + 1))();
}

const QUIZ = extractArray('QUIZ');
const PATH = extractArray('LEARNING_PATH');
const pathModuleIds = PATH.flatMap((w) => w.modules.map((m) => m.id));

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('curriculum — the 3D modules are part of it', () => {
  it('places all three in the learning path', () => {
    for (const id of ['underhood', 'repairbay', 'tyre']) {
      expect(pathModuleIds, 'learning path never mentions ' + id).toContain(id);
    }
  });

  it('puts them in pedagogically sensible weeks', () => {
    const weekOf = (id) => PATH.find((w) => w.modules.some((m) => m.id === id)).week;
    expect(weekOf('underhood'), 'part location is foundational').toBe(1);
    expect(weekOf('repairbay'), 'diagnosis belongs with the diagnostic week').toBe(2);
    expect(weekOf('tyre'), 'hands-on procedure belongs with the hands-on week').toBe(3);
  });

  it('explains why each one is there, like every other path entry', () => {
    for (const id of ['underhood', 'repairbay', 'tyre']) {
      const entry = PATH.flatMap((w) => w.modules).find((m) => m.id === id);
      expect(entry.why, id + ' has no rationale').toBeTruthy();
      expect(entry.why.length, id + ' rationale is a stub').toBeGreaterThan(60);
    }
  });

  it('only curates modules that actually exist in the dispatch', () => {
    // A path entry pointing at a view the switch cannot render is a dead link.
    for (const id of pathModuleIds) {
      expect(SRC, 'learning path points at unknown module: ' + id)
        .toMatch(new RegExp("case '" + id + "':"));
    }
  });
});

describe('quiz — covers what the new modules teach', () => {
  // Search the whole question — a fact stated only in the answer options still
  // counts as covered, and several of these live there.
  const asks = (re) => QUIZ.some((q) => re.test([q.stem, q.why].concat(q.choices).join(' ')));

  it('asks about the battery light being a charging fault', () => {
    expect(asks(/battery-shaped warning light/i)).toBe(true);
    expect(asks(/13\.7/)).toBe(true);
  });

  it('asks when lug nuts get loosened', () => {
    expect(asks(/break the lug nuts loose/i)).toBe(true);
  });

  it('asks why the star pattern exists', () => {
    expect(asks(/star \(criss-cross\) pattern/i)).toBe(true);
  });

  it('asks the difference between resting voltage and a load test', () => {
    expect(asks(/load test/i)).toBe(true);
    expect(asks(/state of CHARGE/)).toBe(true);
  });

  it('asks about voltage drop across a bad connection', () => {
    expect(asks(/at the cable CLAMP/i)).toBe(true);
  });

  it('asks where the jack goes', () => {
    expect(asks(/reinforced jack point/i)).toBe(true);
  });

  it('asks about temporary spare limits', () => {
    expect(asks(/donut/i)).toBe(true);
    expect(asks(/50 mph/i)).toBe(true);
  });

  it('asks about opening a hot cooling system', () => {
    expect(asks(/overflow tank/i)).toBe(true);
  });

  it('asks the traffic-vs-highway overheating pattern', () => {
    expect(asks(/stop-start traffic/i)).toBe(true);
  });

  it('keeps every question well formed', () => {
    const ids = new Set();
    for (const q of QUIZ) {
      expect(q.id, 'question missing id').toBeTruthy();
      expect(ids.has(q.id), 'duplicate question id: ' + q.id).toBe(false);
      ids.add(q.id);
      expect(q.choices.length, q.id + ' should offer 4 choices').toBe(4);
      expect(q.correct, q.id + ' correct index out of range').toBeGreaterThanOrEqual(0);
      expect(q.correct, q.id + ' correct index out of range').toBeLessThan(q.choices.length);
      expect(q.why, q.id + ' has no explanation').toBeTruthy();
      expect(q.why.length, q.id + ' explanation is a stub').toBeGreaterThan(40);
    }
  });

  it('does not put the answer in the same position every time', () => {
    // A quiz where `correct` is always 1 is answerable without reading.
    const spread = new Set(QUIZ.map((q) => q.correct));
    expect(spread.size, 'answers are not distributed across positions').toBeGreaterThan(1);
  });
});

describe('counts are computed, not hand-typed', () => {
  it('states the real question count on the quiz tile', () => {
    expect(renderTool(ID, {})).toContain(QUIZ.length + ' questions across the full curriculum');
  });

  it('states the real question count on the quiz badge', () => {
    const html = renderTool(ID, { autoRepair: { view: 'badges' } });
    expect(html).toContain(QUIZ.length + '-question knowledge quiz');
  });

  it('states the real module count on the path badge', () => {
    const html = renderTool(ID, { autoRepair: { view: 'badges' } });
    expect(html).toContain('Mark all ' + pathModuleIds.length + ' Learning Path modules');
  });

  it('has no hard-coded curriculum counts left in prose', () => {
    // These were all wrong simultaneously. If a number must appear, it should
    // come from the data — so none of these literals should return.
    expect(SRC).not.toMatch(/\b55[- ]question/);
    expect(SRC).not.toMatch(/Knowledge Quiz \(\d+ questions\)/);
    expect(SRC).not.toMatch(/\b28 modules\b/);
    expect(SRC).not.toMatch(/all 18 Learning Path modules/);
  });
});
