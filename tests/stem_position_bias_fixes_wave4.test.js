import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Wave 4 of the answer-position-bias sweep, found by teaching the scanner the
// `answer:` schema and the rotation fingerprint (it previously only knew
// `correct:` banks and shuffle idioms):
//   - fireecology: 24 of 32 correct answers at B, none at A or D
//   - bridgelab:    9 of 15 correct answers at B, none at D
//   - rocks:       all 18 QUIZ_BANK answers authored FIRST ("always pick A")
//   - music:       all 27 MUSIC_QUIZ answers authored FIRST, plus biased
//                  Math.random()-0.5 sorts in the chord-detection builder
// fireecology and bridgelab grade by index (rotation remaps `answer`); rocks
// and music grade by TEXT (no remap; rocks' position-keyed wrongFeedback
// rotates in lockstep).

const fire = fs.readFileSync('stem_lab/stem_tool_fireecology.js', 'utf8');
const bridge = fs.readFileSync('stem_lab/stem_tool_bridgelab.js', 'utf8');
const rocks = fs.readFileSync('stem_lab/stem_tool_rocks.js', 'utf8');
const music = fs.readFileSync('stem_lab/stem_tool_music.js', 'utf8');
const pub = (f) => fs.readFileSync('desktop/web-app/public/stem_lab/' + f, 'utf8');
// Single-arg t(key) calls must yield the key, not undefined — rocks' options
// mix t('stem.rocks.igneous') category refs with plain strings.
const T = (k, fb) => (fb === undefined ? k : fb);

function slice(src, startNeedle, endNeedle, varName, params) {
  const start = src.indexOf(startNeedle);
  const end = src.indexOf(endNeedle, start);
  expect(start, startNeedle).toBeGreaterThan(-1);
  expect(end, endNeedle).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  const fn = new Function(...(params || []), src.slice(start, end) + '\nreturn ' + varName + ';');
  return fn(...(params || []).map(() => T));
}

function rotate(arr, shift) {
  return arr.slice(shift).concat(arr.slice(0, shift));
}

describe('Fire Ecology quiz rotation (index-graded)', () => {
  // The bank lives in TWO segments: the QUIZ_QUESTIONS literal plus a
  // QUIZ_QUESTIONS.push(...) block ~250 lines later that appends 16 more
  // questions (14 of them correct-at-B). The rotation must sit BELOW the
  // push — this loader stitches both segments so the raw/rotated comparison
  // covers the full 32.
  function loadFire(withRotation) {
    const seg = (a, b) => {
      const s = fire.indexOf(a);
      const anchor = fire.indexOf(b, s);
      expect(s, a).toBeGreaterThan(-1);
      expect(anchor, b).toBeGreaterThan(s);
      // Back up to the line start so a mid-comment anchor can't leave a
      // dangling `// ` that comments out the next stitched segment.
      const e = fire.lastIndexOf('\n', anchor);
      return fire.slice(s, e) + '\n';
    };
    let src = seg('var QUIZ_QUESTIONS = [', 'PRESCRIBED BURN PLANNER')
      + seg('QUIZ_QUESTIONS.push(', '// The authored bank put 24 of 32');
    if (withRotation) src += seg('// The authored bank put 24 of 32', 'BEAVER & FIRE RESILIENCE');
    // eslint-disable-next-line no-new-func
    return new Function(src + '\nreturn QUIZ_QUESTIONS;')();
  }
  const raw = loadFire(false);
  const rotated = loadFire(true);

  it('the authored bank put 24 of 32 answers at B, none at A or D (the tell)', () => {
    const slots = [0, 0, 0, 0];
    raw.forEach((q) => slots[q.answer]++);
    expect(slots[0] + slots[3]).toBe(0);
    expect(slots[1]).toBeGreaterThanOrEqual(24);
    expect(raw.length).toBe(32);
  });

  it('rotation matches the recipe and preserves answer text', () => {
    raw.forEach((q, i) => {
      const shift = (i * 7 + 3) % q.choices.length;
      expect(rotated[i].choices).toEqual(rotate(q.choices, shift));
      expect(rotated[i].choices[rotated[i].answer]).toBe(q.choices[q.answer]);
    });
    expect(new Set(rotated.map((q) => q.answer)).size).toBeGreaterThanOrEqual(3);
  });

  it('fire-ecology answers hold', () => {
    const correctOf = (needle) => {
      const q = rotated.find((qq) => qq.q.includes(needle));
      return q.choices[q.answer];
    };
    expect(correctOf('serotinous')).toMatch(/heat|fire/i);
    expect(correctOf('terra preta')).toMatch(/fertile|dark/i);
    expect(correctOf('Garry oak')).toContain('Douglas-fir');
  });
});

describe('Bridge Lab quiz rotation (index-graded)', () => {
  const raw = slice(bridge, 'var QUIZ_QUESTIONS = [', '// The authored bank put 9 of 15', 'QUIZ_QUESTIONS');
  const rotated = slice(bridge, 'var QUIZ_QUESTIONS = [', 'Truss force analysis', 'QUIZ_QUESTIONS');

  it('the authored bank put 9 of 15 answers at B, none at D (the tell)', () => {
    const slots = [0, 0, 0, 0];
    raw.forEach((q) => slots[q.answer]++);
    expect(slots[1]).toBeGreaterThanOrEqual(9);
    expect(slots[3]).toBe(0);
    expect(raw.length).toBe(15);
  });

  it('rotation matches the recipe and preserves answer text', () => {
    raw.forEach((q, i) => {
      const shift = (i * 7 + 3) % q.choices.length;
      expect(rotated[i].choices).toEqual(rotate(q.choices, shift));
      expect(rotated[i].choices[rotated[i].answer]).toBe(q.choices[q.answer]);
    });
    expect(new Set(rotated.map((q) => q.answer)).size).toBeGreaterThanOrEqual(3);
  });

  it('structural-engineering answers hold', () => {
    const correctOf = (needle) => {
      const q = rotated.find((qq) => qq.q.includes(needle));
      return q.choices[q.answer];
    };
    expect(correctOf('suspension bridge')).toBe('Tension');
    expect(correctOf('Euler buckling')).toContain('1/L²');
    expect(correctOf('triangles the basic unit')).toContain("can't change shape");
  });
});

describe('Rocks QUIZ_BANK rotation (text-graded, lockstep wrongFeedback)', () => {
  const raw = slice(rocks, 'const QUIZ_BANK = [', '// The authored bank put every correct answer FIRST', 'QUIZ_BANK', ['__alloT', 't']);
  const rotated = slice(rocks, 'const QUIZ_BANK = [', 'const selRock = ', 'QUIZ_BANK', ['__alloT', 't']);

  it('every authored answer was FIRST in its options (the tell)', () => {
    expect(raw.length).toBeGreaterThanOrEqual(18);
    raw.forEach((q) => expect(q.options.indexOf(q.a), q.q).toBe(0));
  });

  it('rotation matches the recipe; wrongFeedback follows its option', () => {
    raw.forEach((q, i) => {
      const shift = (i * 7 + 3) % q.options.length;
      const rq = rotated[i];
      expect(rq.options).toEqual(rotate(q.options, shift));
      expect(rq.a).toBe(q.a);
      expect(rq.options).toContain(rq.a);
      if (Array.isArray(q.wrongFeedback) && q.wrongFeedback.length === q.options.length) {
        rq.options.forEach((opt, j) => {
          expect(rq.wrongFeedback[j], q.q + ' / ' + opt).toBe(q.wrongFeedback[q.options.indexOf(opt)]);
        });
      }
    });
    const positions = rotated.map((q) => q.options.indexOf(q.a));
    expect(new Set(positions).size).toBeGreaterThanOrEqual(3);
  });

  it('geology answers hold', () => {
    const byNeedle = (needle) => rotated.find((qq) => (qq.a || '').includes(needle));
    expect(byNeedle('Compaction and cementation')).toBeTruthy();
    const lith = byNeedle('Compaction and cementation');
    expect(lith.options.indexOf(lith.a)).toBeGreaterThan(-1);
  });
});

describe('Music MUSIC_QUIZ rotation and chord-detect Fisher-Yates', () => {
  const raw = slice(music, 'var MUSIC_QUIZ = [', '// The authored bank put every correct answer FIRST', 'MUSIC_QUIZ', ['t', '__alloT']);
  const rotated = slice(music, 'var MUSIC_QUIZ = [', '═══ STATE ═══', 'MUSIC_QUIZ', ['t', '__alloT']);

  it('every authored answer was FIRST in its opts (the tell)', () => {
    expect(raw.length).toBe(27);
    raw.forEach((q) => expect(q.opts.indexOf(q.a), q.q).toBe(0));
  });

  it('rotation matches the recipe and keeps the answer present', () => {
    raw.forEach((q, i) => {
      const shift = (i * 7 + 3) % q.opts.length;
      expect(rotated[i].opts).toEqual(rotate(q.opts, shift));
      expect(rotated[i].opts).toContain(rotated[i].a);
    });
    const positions = rotated.map((q) => q.opts.indexOf(q.a));
    expect(new Set(positions).size).toBeGreaterThanOrEqual(3);
  });

  it('music-theory answers hold', () => {
    const answerOf = (needle) => rotated.find((qq) => qq.q.includes(needle)).a;
    expect(answerOf('ONLY the fundamental')).toBe('Sine');
    expect(answerOf('semitones in an octave')).toBe('12');
    expect(answerOf('3:2 frequency ratio')).toBe('Perfect Fifth');
    expect(answerOf('NO sharps or flats')).toBe('C Major');
  });

  it('chord-detect uses Fisher-Yates; no biased comparator sorts remain', () => {
    expect(/\.sort\(function\s*\(\)\s*\{\s*return\s+Math\.random/.test(music)).toBe(false);
    expect(music.includes('var fy = function (arr)')).toBe(true);
  });
});

describe('deployment copies', () => {
  it('public mirrors are byte-identical to the root copies', () => {
    expect(pub('stem_tool_fireecology.js')).toBe(fire);
    expect(pub('stem_tool_bridgelab.js')).toBe(bridge);
    expect(pub('stem_tool_rocks.js')).toBe(rocks);
    expect(pub('stem_tool_music.js')).toBe(music);
  });
});
