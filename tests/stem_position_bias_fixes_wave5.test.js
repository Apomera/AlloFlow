import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Wave 5: the flag schema (`correct: true` on choice objects) — the scanner's
// last documented blind spot, now covered by its bracket-walk schema C.
//   - cephalopodlab: 28 of 40 correct choices at option B
//   - applab: Quiz Engine renderer matched NEITHER bank's schema — object
//     options rendered as [object Object] and never graded correct; the
//     extended bank rendered no buttons at all. Fixed by normalizing both
//     schemas (+ deterministic rotation) at ALL_Q build time.
//   - anatomy: regionProfiles challenges (3/3 correct-first), intervention
//     options (4/4 correct-first), step checkpoints (11/16 at index 0)
//   - titration: incident drills (5/5 correct response authored FIRST)
// machinelab, weldlab, and llm_literacy also have stacked flag banks but are
// carrying another session's uncommitted work — owed, not covered here.

const ceph = fs.readFileSync('stem_lab/stem_tool_cephalopodlab.js', 'utf8');
const app = fs.readFileSync('stem_lab/stem_tool_applab.js', 'utf8');
const ana = fs.readFileSync('stem_lab/stem_tool_anatomy.js', 'utf8');
const titr = fs.readFileSync('stem_lab/stem_tool_titration.js', 'utf8');
const pub = (f) => fs.readFileSync('desktop/web-app/public/stem_lab/' + f, 'utf8');
const T = (k, fb) => (fb === undefined ? k : fb);

// Slice [startNeedle, line-start-of-endNeedle) so a mid-comment end anchor
// can't leave a dangling `// ` that comments out appended code.
function seg(src, startNeedle, endNeedle) {
  const s = src.indexOf(startNeedle);
  const anchor = src.indexOf(endNeedle, s);
  expect(s, startNeedle).toBeGreaterThan(-1);
  expect(anchor, endNeedle).toBeGreaterThan(s);
  return src.slice(s, src.lastIndexOf('\n', anchor)) + '\n';
}

function rotate(arr, shift) {
  return arr.slice(shift).concat(arr.slice(0, shift));
}

describe('Cephalopod Lab quiz rotation (flag-graded)', () => {
  const load = (withRotation) =>
    // eslint-disable-next-line no-new-func
    new Function('__alloT', seg(ceph, 'var QUIZ_QUESTIONS = [', withRotation ? 'Ambient ecological events' : '// The authored bank put 28 of 40') + '\nreturn QUIZ_QUESTIONS;')(T);
  const raw = load(false);
  const rotated = load(true);

  it('the authored bank put 28 of 40 correct choices at option B (the tell)', () => {
    expect(raw.length).toBe(40);
    const positions = raw.map((q) => q.options.findIndex((o) => o.correct));
    expect(positions.filter((p) => p === 1).length).toBeGreaterThanOrEqual(28);
  });

  it('rotation matches the recipe; correct flag and explanation travel with their option', () => {
    raw.forEach((q, i) => {
      const shift = (i * 7 + 3) % q.options.length;
      const rq = rotated[i];
      expect(rq.options.map((o) => o.text)).toEqual(rotate(q.options.map((o) => o.text), shift));
      const rawCorrect = q.options.find((o) => o.correct);
      const rotCorrect = rq.options.filter((o) => o.correct);
      expect(rotCorrect.length, q.id).toBe(1);
      expect(rotCorrect[0].text).toBe(rawCorrect.text);
      expect(rotCorrect[0].explanation).toBe(rawCorrect.explanation);
    });
    const positions = rotated.map((q) => q.options.findIndex((o) => o.correct));
    expect(new Set(positions).size).toBeGreaterThanOrEqual(3);
  });

  it('marine-biology answers hold', () => {
    const q1 = rotated.find((q) => q.question.includes('IS NOT a cephalopod'));
    expect(q1.options.find((o) => o.correct).text).toBe('Sea cucumber');
  });
});

describe('App Lab quiz banks and the normalizing renderer', () => {
  // eslint-disable-next-line no-new-func
  const bank = new Function(seg(app, 'var QUIZ_QUESTIONS = [', 'UI/UX design principles') + '\nreturn QUIZ_QUESTIONS;')();
  // eslint-disable-next-line no-new-func
  const ext = new Function(seg(app, 'var QUIZ_QUESTIONS_EXTENDED = [', 'In-depth deep-dive topics') + '\nreturn QUIZ_QUESTIONS_EXTENDED;')();

  it('the object bank stacked 25 of 30 correct options at B (the tell)', () => {
    expect(bank.length).toBe(30);
    const positions = bank.map((q) => q.options.findIndex((o) => o.correct));
    expect(positions.filter((p) => p === 1).length).toBeGreaterThanOrEqual(25);
    bank.forEach((q) => {
      expect(q.options.filter((o) => o.correct).length, q.id).toBe(1);
    });
  });

  it('every extended question is gradable: `correct` is a valid 1-BASED index into a1..a4', () => {
    expect(ext.length).toBeGreaterThanOrEqual(30);
    ext.forEach((q) => {
      const opts = [q.a1, q.a2, q.a3, q.a4].filter((x) => x !== undefined);
      expect(typeof q.correct, q.id).toBe('number');
      expect(q.correct, q.id).toBeGreaterThanOrEqual(1);
      expect(q.correct, q.id).toBeLessThanOrEqual(opts.length);
      expect(typeof opts[q.correct - 1], q.id).toBe('string');
      // Spot-checked semantics that prove 1-based (0-based would pick
      // <paragraph> and <href> — wrong answers):
      if (q.id === 'q31') expect(opts[q.correct - 1]).toBe('<p>');
      if (q.id === 'q32') expect(opts[q.correct - 1]).toBe('<a>');
    });
    // The normalizer must resolve that index to text (and read `why`).
    expect(app.includes("typeof raw.correct === 'number' ? (opts[raw.correct - 1] || '')")).toBe(true);
    expect(app.includes('raw.explanation || raw.why')).toBe(true);
  });

  it('the renderer normalizes both schemas and rotates (source pins)', () => {
    // Object options are mapped to their text — the old renderer passed the
    // raw objects to React ([object Object]) and graded against '' forever.
    expect(app.includes("return o && typeof o === 'object' ? o.text : o;")).toBe(true);
    // Extended a1..a4 fields become an options array (no buttons rendered before).
    expect(app.includes('[raw.a1, raw.a2, raw.a3, raw.a4]')).toBe(true);
    // Deterministic rotation at normalize time.
    expect(app.includes('(qi * 7 + 3) %')).toBe(true);
    // Text grading now compares strings to strings.
    expect(app.includes('String(options[quizPicked]) === String(correctAnswer)')).toBe(true);
  });
});

describe('Anatomy systems-in-motion rotation (two banks, mixed grading)', () => {
  const load = (withRotation) =>
    // eslint-disable-next-line no-new-func
    new Function('t', '__alloT', seg(ana, 'var SYSTEMS_IN_MOTION_SCENARIOS = {', withRotation ? 'var ANATOMY_LENS_ITEMS = [' : '// Two of this feature') + '\nreturn SYSTEMS_IN_MOTION_SCENARIOS;')(T, T);
  const raw = load(false);
  const rotated = load(true);

  it('every intervention authored its correct option FIRST; 11+ checkpoints at index 0 (the tells)', () => {
    const keys = Object.keys(raw);
    expect(keys.length).toBeGreaterThanOrEqual(4);
    keys.forEach((k) => expect(raw[k].intervention.options[0].correct, k).toBe(true));
    const stepCorrects = keys.flatMap((k) => (raw[k].steps || []).filter((s) => Array.isArray(s.options)).map((s) => s.correct));
    expect(stepCorrects.length).toBeGreaterThanOrEqual(16);
    expect(stepCorrects.filter((c) => c === 0).length).toBeGreaterThanOrEqual(11);
  });

  it('rotation matches the shared-counter recipe for both banks', () => {
    let counter = 0;
    Object.keys(raw).forEach((k) => {
      const rawSc = raw[k];
      const rotSc = rotated[k];
      const iLen = rawSc.intervention.options.length;
      const iShift = (counter++ * 7 + 3) % iLen;
      expect(rotSc.intervention.options.map((o) => o.id)).toEqual(rotate(rawSc.intervention.options.map((o) => o.id), iShift));
      expect(rotSc.intervention.options.filter((o) => o.correct).length, k).toBe(1);
      (rawSc.steps || []).forEach((step, si) => {
        if (!Array.isArray(step.options) || typeof step.correct !== 'number' || step.options.length < 2) return;
        const len = step.options.length;
        const shift = (counter++ * 7 + 3) % len;
        const rotStep = rotSc.steps[si];
        expect(rotStep.options).toEqual(rotate(step.options, shift));
        expect(rotStep.options[rotStep.correct], step.id).toBe(step.options[step.correct]);
      });
    });
    const positions = Object.keys(rotated).flatMap((k) => (rotated[k].steps || []).filter((s) => Array.isArray(s.options)).map((s) => s.correct));
    expect(new Set(positions).size).toBeGreaterThanOrEqual(2);
  });

  it('region challenges: authored correct-first documented; FNV-hash rotation in the mapper', () => {
    const profiles = seg(ana, 'var regionProfiles = {', 'planeDefinition:');
    const firstCorrect = profiles.match(/options: \[\s*\{ id: '[^']+', label: '[^']+', correct: true/g) || [];
    expect(firstCorrect.length).toBe(3);
    expect(ana.includes('Math.imul(hsh ^ seedStr.charCodeAt(ci), 16777619)')).toBe(true);
    expect(ana.includes('return shift ? mapped.slice(shift).concat(mapped.slice(0, shift)) : mapped;')).toBe(true);
  });
});

describe('Titration incident-drill rotation (id-graded)', () => {
  const load = (withRotation) =>
    // eslint-disable-next-line no-new-func
    new Function('__alloT', seg(titr, 'var incidentScenarios = [', withRotation ? 'Lab Equipment Guide Data' : '// Every incident scenario authored') + '\nreturn incidentScenarios;')(T);
  const raw = load(false);
  const rotated = load(true);

  it('every scenario authored its correct response FIRST (the tell)', () => {
    expect(raw.length).toBeGreaterThanOrEqual(5);
    raw.forEach((sc) => expect(sc.options[0].id, sc.id).toBe(sc.correct));
  });

  it('rotation matches the recipe and the correct id survives, spread across slots', () => {
    raw.forEach((sc, i) => {
      const shift = (i * 7 + 3) % sc.options.length;
      expect(rotated[i].options.map((o) => o.id)).toEqual(rotate(sc.options.map((o) => o.id), shift));
      expect(rotated[i].options.filter((o) => o.id === rotated[i].correct).length, sc.id).toBe(1);
    });
    const positions = rotated.map((sc) => sc.options.findIndex((o) => o.id === sc.correct));
    expect(new Set(positions).size).toBeGreaterThanOrEqual(3);
  });

  it('lab-safety answers hold', () => {
    const acid = rotated.find((sc) => sc.id === 'acid_splash');
    const correct = acid.options.find((o) => o.id === acid.correct);
    expect(correct.label).toContain('rinse under running');
    const eye = rotated.find((sc) => sc.id === 'eye_contact');
    expect(eye.options.find((o) => o.id === eye.correct).label.toLowerCase()).toContain('eyewash');
  });
});

describe('deployment copies', () => {
  it('public mirrors are byte-identical to the root copies', () => {
    expect(pub('stem_tool_cephalopodlab.js')).toBe(ceph);
    expect(pub('stem_tool_applab.js')).toBe(app);
    expect(pub('stem_tool_anatomy.js')).toBe(ana);
    expect(pub('stem_tool_titration.js')).toBe(titr);
  });
});
