import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Complement to the existing bakingscience suites: verifies the diagnosis
// bank, whose authored scenarios ALL listed the correct cause first until the
// deterministic rotation was added ("always pick the first option" won).

const src = fs.readFileSync('stem_lab/stem_tool_bakingscience.js', 'utf8');
const publicSrc = () => fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_bakingscience.js', 'utf8');

function loadScenarios(withRotation) {
  const start = src.indexOf('var DIAGNOSIS_SCENARIOS = [');
  const endMarker = withRotation ? '// ═══════════════════════════════════════════\n  // SCIENCE DATA' : '// Every authored scenario listed';
  const end = src.indexOf(endMarker, start);
  expect(start).toBeGreaterThan(-1);
  expect(end, endMarker.slice(0, 30)).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(src.slice(start, end) + '\nreturn DIAGNOSIS_SCENARIOS;')();
}

describe('diagnosis bank rotation (regression pins)', () => {
  const raw = loadScenarios(false);
  const rotated = loadScenarios(true);

  it('the authored bank really had every correct cause first (the tell)', () => {
    for (const s of raw) {
      expect(s.options[0].correct, s.id).toBe(true);
    }
  });

  it('rotation spreads correct causes across positions and preserves each option set', () => {
    const positions = rotated.map((s) => s.options.findIndex((o) => o.correct));
    expect(new Set(positions).size).toBeGreaterThanOrEqual(2);
    expect(positions.some((p) => p !== 0)).toBe(true);
    rotated.forEach((s, i) => {
      expect(s.options.map((o) => o.id).slice().sort()).toEqual(raw[i].options.map((o) => o.id).slice().sort());
      const correct = s.options.filter((o) => o.correct);
      expect(correct.length, s.id).toBe(1);
      expect(correct[0].id).toBe(raw[i].options.filter((o) => o.correct)[0].id);
    });
  });

  it('every option carries an explanation and every scenario a symptom and tag', () => {
    for (const s of rotated) {
      expect(s.symptom.length, s.id).toBeGreaterThan(10);
      expect(s.tag.length, s.id).toBeGreaterThan(2);
      for (const o of s.options) {
        expect(o.explain.length, s.id + ':' + o.id).toBeGreaterThan(20);
      }
    }
  });

  it('spot-checks the food science', () => {
    const byId = Object.fromEntries(rotated.map((s) => [s.id, s]));
    const correctOf = (id) => byId[id].options.find((o) => o.correct);
    expect(correctOf('flat_cookies').text.toLowerCase()).toContain('butter');
    expect(correctOf('bread_no_rise').text.toLowerCase()).toContain('yeast');
    expect(correctOf('bread_no_rise').explain).toContain('140');
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(publicSrc()).toBe(src);
  });
});
