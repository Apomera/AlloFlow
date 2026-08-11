import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Quiz-bank verification for Astronomy, Nutrition Lab, and Raptor Hunt.
// Astronomy's authored bank never put a correct answer at choice 0 (0/6/8/1);
// Nutrition Lab stacked 17 of 22 correct answers file-wide on choice 1
// (labels 8/12, myths 9/10); Raptor Hunt shuffled quiz options with the
// biased `.sort(() => Math.random() - 0.5)` idiom, plus a "deterministic
// shuffle by uid" whose uid never influenced the comparison.

const astro = fs.readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8');
const nut = fs.readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
const rap = fs.readFileSync('stem_lab/stem_tool_raptorhunt.js', 'utf8');
const pub = (f) => fs.readFileSync('desktop/web-app/public/stem_lab/' + f, 'utf8');

function loadAstro(withRotation) {
  const start = astro.indexOf('var QUIZ_QUESTIONS = [');
  const end = astro.indexOf(withRotation ? '// Plugin registration' : '// The authored bank never put', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(astro.slice(start, end) + '\nreturn QUIZ_QUESTIONS;')();
}

function loadLabels(withRotation) {
  const start = nut.indexOf('var LABELS = [');
  const end = nut.indexOf(withRotation ? 'function NutritionFactsPanel(' : '// The authored labels put', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function('__alloT', nut.slice(start, end) + '\nreturn LABELS;')((k, fb) => fb);
}

function loadMyths(withRotation) {
  const start = nut.indexOf('var MYTHS = [');
  const end = nut.indexOf(withRotation ? 'function NutritionMythsLab(' : '// The authored myths put', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(nut.slice(start, end) + '\nreturn MYTHS;')();
}

// The same deterministic rotation the tools apply; asserting rotated banks
// match recipe(raw) proves the in-file IIFEs did exactly this and nothing else.
function rotate(choices, shift) {
  return choices.slice(shift).concat(choices.slice(0, shift));
}

describe('Astronomy quiz rotation', () => {
  const raw = loadAstro(false);
  const rotated = loadAstro(true);

  it('the authored bank never used choice 0 (the tell)', () => {
    const slots = [0, 0, 0, 0];
    raw.forEach((q) => slots[q.answer]++);
    expect(slots[0]).toBe(0);
    expect(slots[1] + slots[2]).toBeGreaterThanOrEqual(14);
    expect(raw.length).toBe(15);
  });

  it('rotation matches the deterministic recipe and preserves answer text', () => {
    raw.forEach((q, i) => {
      const shift = (i * 7 + 3) % q.choices.length;
      expect(rotated[i].choices).toEqual(rotate(q.choices, shift));
      expect(rotated[i].choices[rotated[i].answer]).toBe(q.choices[q.answer]);
    });
    expect(new Set(rotated.map((q) => q.answer)).size).toBeGreaterThanOrEqual(3);
  });

  it('key astronomy answers hold', () => {
    const correctOf = (needle) => {
      const q = rotated.find((qq) => qq.q.includes(needle));
      return q.choices[q.answer];
    };
    expect(correctOf('light from the Sun')).toBe('~8 minutes');
    expect(correctOf('closest star to Earth')).toContain('Proxima');
    expect(correctOf('largest volcano')).toBe('Mars');
    expect(correctOf('Hertzsprung')).toContain('main sequence');
    expect(correctOf('closest star system')).toContain('Alpha Centauri');
  });
});

describe('Nutrition Lab label-reader rotation', () => {
  const raw = loadLabels(false);
  const rotated = loadLabels(true);

  it('the authored labels put 8 of 12 correct answers at choice 1 (the tell)', () => {
    const answers = raw.flatMap((L) => L.questions.map((q) => q.answer));
    expect(answers.length).toBe(12);
    expect(answers.filter((a) => a === 1).length).toBeGreaterThanOrEqual(8);
  });

  it('rotation matches the recipe per (label, question) and preserves answer text', () => {
    raw.forEach((L, li) => {
      L.questions.forEach((q, qi) => {
        const shift = (li * 5 + qi * 7 + 3) % q.choices.length;
        const rq = rotated[li].questions[qi];
        expect(rq.choices).toEqual(rotate(q.choices, shift));
        expect(rq.choices[rq.answer]).toBe(q.choices[q.answer]);
        expect(new Set(rq.choices).size).toBe(q.choices.length);
      });
    });
    const positions = rotated.flatMap((L) => L.questions.map((q) => q.answer));
    expect(new Set(positions).size).toBeGreaterThanOrEqual(3);
  });

  it('FDA label-literacy answers hold', () => {
    const granola = rotated.find((L) => L.id === 'granola');
    const correctOf = (needle) => {
      const q = granola.questions.find((qq) => qq.q.includes(needle));
      return q.choices[q.answer];
    };
    expect(correctOf('ONE bar')).toBe('90 calories');
    expect(correctOf('ADDED sugar')).toBe('6 g (almost all)');
  });
});

describe('Nutrition Lab myths rotation', () => {
  const raw = loadMyths(false);
  const rotated = loadMyths(true);

  it('the authored myths put 9 of 10 correct answers at choice 1 (the tell)', () => {
    const slots = [0, 0, 0, 0];
    raw.forEach((m) => slots[m.answer]++);
    expect(slots[1]).toBe(9);
    expect(slots[0] + slots[3]).toBe(0);
  });

  it('rotation matches the recipe and preserves answer text and citations', () => {
    raw.forEach((m, mi) => {
      const shift = (mi * 7 + 3) % m.choices.length;
      expect(rotated[mi].choices).toEqual(rotate(m.choices, shift));
      expect(rotated[mi].choices[rotated[mi].answer]).toBe(m.choices[m.answer]);
      expect(rotated[mi].cite.length).toBeGreaterThan(5);
    });
    expect(new Set(rotated.map((m) => m.answer)).size).toBeGreaterThanOrEqual(3);
  });

  it('evidence-based myth answers hold', () => {
    const correctOf = (id) => {
      const m = rotated.find((mm) => mm.id === id);
      return m.choices[m.answer];
    };
    expect(correctOf('detox')).toMatch(/^False — your liver and kidneys/);
    expect(correctOf('superfood')).toContain('no FDA definition');
  });
});

describe('Raptor Hunt shuffles', () => {
  it('no biased Math.random comparator sorts remain (jitter preserved)', () => {
    expect(/\)\.sort\(function\(\) \{ return Math\.random/.test(rap)).toBe(false);
    // Physics jitter like `(Math.random() - 0.5) * k` is legitimate and stays.
    expect(rap.split('(Math.random() - 0.5) *').length - 1).toBeGreaterThanOrEqual(30);
  });

  it('rhShuffle is a fair Fisher-Yates (element-preserving, roughly uniform)', () => {
    const start = rap.indexOf('function rhShuffle(list) {');
    const end = rap.indexOf('// ─── Three.js loader', start);
    expect(start).toBeGreaterThan(-1);
    // eslint-disable-next-line no-new-func
    const rhShuffle = new Function(rap.slice(start, end) + '\nreturn rhShuffle;')();
    const input = ['a', 'b', 'c', 'd'];
    const firstSlot = { a: 0, b: 0, c: 0, d: 0 };
    const lastSlot = { a: 0, b: 0, c: 0, d: 0 };
    for (let i = 0; i < 2400; i++) {
      const out = rhShuffle(input);
      expect(out.slice().sort()).toEqual(input);
      firstSlot[out[0]]++;
      lastSlot[out[3]]++;
    }
    expect(input).toEqual(['a', 'b', 'c', 'd']); // input not mutated
    for (const k of input) {
      expect(firstSlot[k]).toBeGreaterThan(480);
      expect(firstSlot[k]).toBeLessThan(720);
      expect(lastSlot[k]).toBeGreaterThan(480);
      expect(lastSlot[k]).toBeLessThan(720);
    }
  });

  it('bone-ID ordering is deterministic per uid and actually varies by uid', () => {
    // The old comparator localeCompared option+uid concatenations, which the
    // uid suffix never influenced — every bone got alphabetical order.
    expect(rap.includes('.localeCompare(b + activeBone.uid)')).toBe(false);
    const m = rap.match(/var rhBoneKey = function\(s\) \{[^\n]*\};/);
    expect(m).not.toBeNull();
    // eslint-disable-next-line no-new-func
    const rhBoneKey = new Function(m[0] + '\nreturn rhBoneKey;')();
    const opts = ['Snowshoe Hare', 'Rock Dove', 'Meadow Vole'];
    const orderFor = (uid) =>
      opts.slice().sort((a, b) => rhBoneKey(uid + '|' + a) - rhBoneKey(uid + '|' + b)).join('/');
    const orders = new Set();
    for (let i = 0; i < 12; i++) {
      const uid = 'bone_' + i;
      expect(orderFor(uid)).toBe(orderFor(uid)); // stable per uid
      orders.add(orderFor(uid));
    }
    expect(orders.size).toBeGreaterThanOrEqual(2);
  });

  it('the anatomy quiz grades by id and both quiz paths use rhShuffle', () => {
    expect(rap.includes('guessId === quizPart')).toBe(true);
    expect(rap.split('rhShuffle(ANATOMY.parts.filter').length - 1).toBe(2);
    expect(rap.split('rhShuffle([pick].concat(wrong))').length - 1).toBe(2);
  });
});

describe('Raptor Hunt Field ID quiz rotation (correctIdx schema)', () => {
  // This 70-question bank uses `correctIdx`, a key none of the scanner's
  // schemas matched until the deep-dive found it — the bank had 46 of 70
  // correct answers at option B.
  function loadFieldId(withRotation) {
    const start = rap.indexOf('var QUIZ_QUESTIONS = [');
    const end = rap.indexOf(withRotation ? 'PELLET LAB DATA' : '// The authored bank put 46 of 70', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const src = rap.slice(start, rap.lastIndexOf('\n', end)) + '\n';
    // eslint-disable-next-line no-new-func
    return new Function(src + '\nreturn QUIZ_QUESTIONS;')();
  }
  const raw = loadFieldId(false);
  const rotated = loadFieldId(true);

  it('the authored bank put 46 of 70 answers at B, only 4 at A (the tell)', () => {
    expect(raw.length).toBe(70);
    const slots = [0, 0, 0, 0];
    raw.forEach((q) => slots[q.correctIdx]++);
    expect(slots[1]).toBeGreaterThanOrEqual(46);
    expect(slots[0]).toBeLessThanOrEqual(4);
  });

  it('rotation matches the recipe and preserves answer text', () => {
    raw.forEach((q, i) => {
      const shift = (i * 7 + 3) % q.options.length;
      expect(rotated[i].options).toEqual(q.options.slice(shift).concat(q.options.slice(0, shift)));
      expect(rotated[i].options[rotated[i].correctIdx], q.id).toBe(q.options[q.correctIdx]);
    });
    expect(new Set(rotated.map((q) => q.correctIdx)).size).toBe(4);
  });

  it('field-ID answers hold', () => {
    const correctOf = (needle) => {
      const q = rotated.find((qq) => qq.q.includes(needle));
      return q.options[q.correctIdx];
    };
    expect(correctOf('paper airplane')).toBe('Falcon');
    expect(correctOf('daylight visible between the primaries')).toContain('Eagle');
  });
});

describe('Raptor Hunt contested-science softening', () => {
  it('the kestrel UV vole-trail story is presented as debated, not fact', () => {
    // The old phrasing stated Viitala 1995 as settled fact; Lind et al. 2013
    // (cited in this file header) found vole urine reflects little UV.
    expect(rap.includes('Vole urine + dung trails reflect UV strongly, so the kestrel sees')).toBe(false);
    expect(rap.includes('Vole urine + dung trails reflect UV strongly, so the kestrel literally sees')).toBe(false);
    expect((rap.match(/Lind et al/g) || []).length).toBeGreaterThanOrEqual(4);
    expect(rap).toMatch(/debated/);
  });

  it('the outdated New World vultures near storks claim is corrected', () => {
    expect(rap.includes("closer to storks than to hawks/falcons")).toBe(false);
    expect(rap.includes('sister group to hawks (Accipitriformes)')).toBe(true);
  });

  it('the ui_strings entries carry the same softening and stay valid JSON', () => {
    const strings = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8'));
    const rh = strings.stem.raptorhunt;
    expect(rh.which_family_of_raptor_can_see_ultravi).toContain('now-debated');
    expect(rh.american_kestrels_falco_sparverius_can).toContain('Lind et al. 2013');
    expect(rh.american_kestrels_falco_sparverius_can).toContain('debated');
  });
});

describe('deployment copies', () => {
  it('public mirrors are byte-identical to the root copies', () => {
    expect(pub('stem_tool_astronomy.js')).toBe(astro);
    expect(pub('stem_tool_nutritionlab.js')).toBe(nut);
    expect(pub('stem_tool_raptorhunt.js')).toBe(rap);
    expect(fs.readFileSync('desktop/web-app/public/ui_strings.js', 'utf8')).toBe(fs.readFileSync('ui_strings.js', 'utf8'));
  });
});
