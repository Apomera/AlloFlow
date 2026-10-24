// Math-tool autosave stores PROGRESS, never student work (math review 3).
//
// AlloFlow runs on shared school devices. Whatever the STEM hub writes to
// localStorage ('alloflow_stemlab_v2') is there for the next student, so the
// math buckets may hold badges, counters, bests and seen-maps only: no typed
// answers, guesses, inputs, free text, plotted points, built models, current
// problems, feedback, or data a student entered.
//
// The fixture plants a unique marker in every work field of all 22 math tools
// (helpers/math_review3_autosave_fixtures.js), runs the hub's REAL payload
// function, and looks for every marker in what would be written.
import { describe, it, expect } from 'vitest';
import {
  loadHub, MATH_TOOLS, fullBucket, fullToolData, allKeys, PLANTED_NUMBERS, FORBIDDEN_KEY, FORBIDDEN_KEY_EXEMPT,
} from './helpers/math_review3_autosave_fixtures.js';

function savedText(hub, toolData) {
  return JSON.stringify(hub.payload(Object.assign({ _persisted: true }, toolData)));
}
function firstMarker(text) {
  const at = text.indexOf('PLANT-');
  return at === -1 ? null : text.slice(at, at + 40);
}
function plantedNumbersIn(text) {
  return [...PLANTED_NUMBERS].filter((n) => text.includes(String(n)));
}

describe('nothing a student typed, plotted or built is written to the device', () => {
  it('a toolData full of answers, guesses, inputs and points for every math tool saves none of them', () => {
    const hub = loadHub();
    const text = savedText(hub, fullToolData());
    expect(firstMarker(text), 'planted work string reached storage').toBe(null);
    expect(plantedNumbersIn(text), 'planted work numbers reached storage').toEqual([]);
  });

  it.each(MATH_TOOLS.map((t) => [t.key, t]))('%s saves only its progress fields', (key, tool) => {
    const hub = loadHub();
    const saved = JSON.parse(savedText(hub, { [key]: fullBucket(tool) }));
    const fields = Object.keys(saved[key] || {});
    // Not vacuous: the bucket IS saved (progress), just without the work.
    expect(fields.length, key + ' saved nothing at all').toBeGreaterThan(0);
    const extra = fields.filter((f) => !Object.prototype.hasOwnProperty.call(tool.progress, f));
    expect(extra, key + ' saved non-progress fields').toEqual([]);
    const named = fields.filter((f) => FORBIDDEN_KEY.test(f) && !FORBIDDEN_KEY_EXEMPT.has(f));
    expect(named, key + ' saved work-named fields').toEqual([]);
  });

  it('every saved value is a progress shape: true, a count, an id list, a tally, or a map of those', () => {
    const hub = loadHub();
    const saved = JSON.parse(savedText(hub, fullToolData()));
    const scalar = (v) => v === true || (typeof v === 'number' && Number.isFinite(v) && v >= 0);
    const bad = [];
    MATH_TOOLS.forEach((tool) => {
      Object.entries(saved[tool.key] || {}).forEach(([field, value]) => {
        const where = tool.key + '.' + field;
        if (scalar(value)) return;
        if (Array.isArray(value)) {
          if (!value.every((x) => (typeof x === 'string' && x.length <= 120) || scalar(x))) bad.push(where);
          return;
        }
        if (value && typeof value === 'object') {
          Object.values(value).forEach((v) => {
            const tally = v && typeof v === 'object' && Object.keys(v).sort().join() === 'attempts,correct' && scalar(v.attempts) && scalar(v.correct);
            if (!scalar(v) && !tally) bad.push(where);
          });
          return;
        }
        bad.push(where);
      });
    });
    expect(bad, 'free-form values in the saved payload').toEqual([]);
  });

  it('session buckets and hub bookkeeping are never saved', () => {
    const hub = loadHub();
    const saved = JSON.parse(savedText(hub, Object.assign(fullToolData(), { _stemProgressPending: { statsLab: { testsRun: 2 } } })));
    expect(saved).not.toHaveProperty('_multTimer');
    expect(saved).not.toHaveProperty('_stemProgressPending');
    // No key at any depth is named like work (map keys of ids aside, which the
    // value checks above cover).
    const topFields = MATH_TOOLS.flatMap((t) => Object.keys(saved[t.key] || {}));
    expect(topFields.filter((f) => FORBIDDEN_KEY.test(f) && !FORBIDDEN_KEY_EXEMPT.has(f))).toEqual([]);
  });

  it('seen-map keys that carry typed text are left out (Logic Lab claims and AI proofs, bad elapsed signatures)', () => {
    const hub = loadHub();
    const ll = MATH_TOOLS.find((t) => t.key === 'logicLab');
    const ts = MATH_TOOLS.find((t) => t.key === '_timeSchedule');
    const saved = JSON.parse(savedText(hub, { logicLab: fullBucket(ll), _timeSchedule: fullBucket(ts) }));
    expect(Object.keys(saved.logicLab.xpCredited).some((k) => k.startsWith('claim:'))).toBe(false);
    expect(Object.keys(saved.logicLab.solvedProofs)).toEqual(['L0', 'L1', 'L2']);
    expect(Object.keys(saved._timeSchedule.elapsedModelSignatures).sort()).toEqual(['480|45|1', '600|30|-1', '720|90|1']);
  });

  it('Inequality keeps no seen-map keyed by the typed inequality (testsRun, solverSolved)', () => {
    const hub = loadHub();
    const iq = MATH_TOOLS.find((t) => t.key === 'inequality');
    const saved = JSON.parse(savedText(hub, { inequality: fullBucket(iq) }));
    expect(saved.inequality).not.toHaveProperty('testsRun');
    expect(saved.inequality).not.toHaveProperty('solverSolved');
    expect(saved.inequality.testCount).toBe(4);
  });

  it('badge timestamps are stored as plain "earned" (true), not as when the student earned them', () => {
    const hub = loadHub();
    const saved = JSON.parse(savedText(hub, {
      _manipulatives: { earnedBadges: { first_build: 1771234567890 } },
      protractor: { earnedBadges: { right_on: 1771234567891 } },
      dataPlot: { earnedBadges: { firstPoint: 1771234567892 } },
    }));
    expect(saved._manipulatives.earnedBadges).toEqual({ first_build: true });
    expect(saved.protractor.earnedBadges).toEqual({ right_on: true });
    expect(saved.dataPlot.earnedBadges).toEqual({ firstPoint: true });
  });
});

describe('old saved data is scrubbed on the next visit', () => {
  it('a legacy whole Calculus bucket (typed answers, reflections) restores as progress only', () => {
    const hub = loadHub();
    const calc = MATH_TOOLS.find((t) => t.key === 'calculus');
    const frac = MATH_TOOLS.find((t) => t.key === '_fractions');
    // What the old hub wrote for Calculus, plus a hand-edited work-laden bucket.
    const legacy = JSON.parse(JSON.stringify({ calculus: fullBucket(calc), _fractions: fullBucket(frac), wave: { frequency: 2 } }));
    const next = hub.hydrate({}, legacy);
    const text = JSON.stringify(next);
    expect(firstMarker(text), 'legacy work string restored').toBe(null);
    expect(plantedNumbersIn(text), 'legacy work numbers restored').toEqual([]);
    expect(next.calculus).toEqual(calc.progress);
    expect(next.wave).toEqual({ frequency: 2 });
    // And the next save writes none of it back.
    expect(firstMarker(savedText(hub, next))).toBe(null);
  });
});
