// SkySchool (flightSim) all-views + all-learn-topics render smoke.
//
// The tool has 9 top-level views, but the real coverage surface is the LEARN
// view: a ~100-entry topic registry (LEARN_TOPICS, function-local) that fans
// out over the module's educational tables. Both the view list AND the topic
// id list are re-derived from the SOURCE at test time, so adding a view or a
// topic without smoke coverage fails the suite (completeness gates).
//
// Unlike roadReady, flightSim's render has NO internal error boundary — a
// crash in any branch throws straight out of renderToStaticMarkup, which is
// exactly what we want a test to catch.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_flightsim.js';
const SRC = readFileSync(FILE, 'utf8');

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-15T15:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.4242);
});
afterAll(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'flightSim');
});

const DEBRIEF = {
  flightTime: 312, distance: 42, maxAlt: 8200, maxSpeed: 130,
  airports: 2, discovered: 3, badges: 1, bestLanding: 140, aircraft: 'Cessna 172 Skyhawk',
};

const VIEWS = {
  menu: { d: {}, sig: 'SkySchool' },
  flying: { d: {}, sig: null },
  learn: { d: {}, sig: null },
  lesson: { d: { selectedLesson: 'lift' }, sig: 'How Wings Create Lift' },
  preflight: { d: {}, sig: null },
  quiz: { d: {}, sig: null },
  calculator: { d: {}, sig: null },
  debrief: { d: { lastDebrief: DEBRIEF }, sig: null },
  stallHunt: { d: {}, sig: null },
};

function extractViewIds() {
  const found = new Set();
  const re = /view === '([A-Za-z0-9_]+)'/g;
  let m;
  while ((m = re.exec(SRC))) found.add(m[1]);
  return found;
}

function extractLearnTopicIds() {
  // LEARN_TOPICS is function-local, so enumerate its ids from the source: the
  // array literal between "var LEARN_TOPICS = [" and the closing "];".
  const start = SRC.indexOf('var LEARN_TOPICS = [');
  expect(start, 'LEARN_TOPICS registry not found in source').toBeGreaterThan(-1);
  const end = SRC.indexOf('];', start);
  const block = SRC.slice(start, end);
  const ids = [];
  const re = /\{ id: '([a-zA-Z0-9_]+)'/g;
  let m;
  while ((m = re.exec(block))) ids.push(m[1]);
  return ids;
}

describe('completeness gates', () => {
  it('every view branch in the source has a fixture (and none are stale)', () => {
    const found = extractViewIds();
    const fixtures = new Set(Object.keys(VIEWS));
    const missing = [...found].filter((v) => !fixtures.has(v));
    const stale = [...fixtures].filter((v) => !found.has(v));
    expect(missing, 'views without a smoke fixture').toEqual([]);
    expect(stale, 'fixtures for removed views').toEqual([]);
  });
  it('the learn-topic registry is large and its ids are unique', () => {
    const ids = extractLearnTopicIds();
    expect(ids.length).toBeGreaterThan(80);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('every view renders real content', () => {
  for (const [view, spec] of Object.entries(VIEWS)) {
    it(view, () => {
      const d = Object.assign({ view }, spec.d);
      const html = renderTool('flightSim', { flightSim: d });
      expect(html, view + ': fell through to the loading fallback').not.toContain('Loading SkySchool');
      expect(html.length, view + ': suspiciously little markup').toBeGreaterThan(300);
      if (spec.sig) expect(html, view + ': signature missing').toContain(spec.sig);
    });
  }

  it('the lesson view exposes the Mark-lesson-complete affordance (dead-quest regression)', () => {
    const html = renderTool('flightSim', { flightSim: { view: 'lesson', selectedLesson: 'lift' } });
    expect(html).toContain('Mark lesson complete');
    const done = renderTool('flightSim', {
      flightSim: { view: 'lesson', selectedLesson: 'lift', completedLessons: { lift: true }, lessonsCompleted: 1 },
    });
    expect(done).toContain('Lesson completed');
  });

  it('debrief tolerates a legacy partial shape (maxAlt missing used to throw)', () => {
    const html = renderTool('flightSim', { flightSim: { view: 'debrief', lastDebrief: { flightTime: 60 } } });
    expect(html.length).toBeGreaterThan(300);
  });
});

describe('every LEARN topic renders', () => {
  const ids = extractLearnTopicIds();
  for (const id of ids) {
    it('learn/' + id, () => {
      const html = renderTool('flightSim', { flightSim: { view: 'learn', learnTopic: id } });
      expect(html, 'learn topic ' + id + ' fell to fallback').not.toContain('Loading SkySchool');
      expect(html.length, 'learn topic ' + id + ' rendered almost nothing').toBeGreaterThan(400);
    });
  }
});
