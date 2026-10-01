// Geometry World: no answer before its question (2026-09-24).
//
// THE BUG: a character's opening line, the lesson objectives or the description often
// stated the RESULT a question then asked for, so the question became a reading check.
// Area & Surface: "Its base has 24 square units" before "What is the base area?", and
// the objective "Connect the blue prism's base area to its 72 cubic units" before
// "24 x 3 = ?". Composite Volume worked out "2 x 5 x 2 = 20" before asking it. Base 10
// spelled out "2 hundred-flats + 3 ten-rods + 4 unit cubes" before asking the sum. The
// new Scale Up description said "it holds 8 times as much" before three questions
// about exactly that.
//
// The rule: givens (a prism's dimensions) may be said. A giveaway is the keyed number
// said with its own unit word ("four layers", "24 square units") when no wrong choice
// is said with that unit, or the keyed number said at all when no wrong choice's
// number is. Digits and number words both count. Activity cards are left out on purpose: they are opened on request and
// carry worked solutions as hints. EXCEPTIONS are reviewed cases: the one source they
// excuse and why. One that no longer matches fails, so the list cannot go stale.

import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest';
import {readFileSync} from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');
const originalLab = window.StemLab;
let lessons;
beforeAll(() => {
  window.StemLab = {registerTool: vi.fn()};
  new Function(source)();
  lessons = window.StemLab.geometryWorldWorksheets.presets();
}, 120000);
afterAll(() => { window.StemLab = originalLab; });

const WORDS = {1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve', 20: 'twenty', 100: 'hundred'};
const numberOf = (text) => { const m = String(text).match(/([0-9]+(?:[.][0-9]+)?)/); return m ? m[1] : null; };
// A number on its own: not part of a longer number, a decimal or a word like "3D".
const numberPattern = (n) => '(?:' + n.replace('.', '[.]') + (WORDS[n] ? '|' + WORDS[n] : '') + ')';
const says = (text, n) => new RegExp('(^|[^0-9.])' + n.replace('.', '[.]') + '(?![0-9A-Za-z]|[.][0-9])').test(text)
  || (WORDS[n] !== undefined && new RegExp('(^|[^a-z])' + WORDS[n] + '(?![a-z])', 'i').test(text));
// The first word after a choice's number: "4 layers" -> "layer", "24 square units" -> "square".
const unitOf = (choice) => { const m = String(choice).match(/[0-9]+(?:[.][0-9]+)?[^a-zA-Z]*([a-zA-Z]+)/); return m ? m[1].toLowerCase().replace(/s$/, '') : ''; };
// The number, then at most two words, then the unit ("four layers", "5 by 5 blocks" is not "5 blocks").
const saysWithUnit = (text, n, unit) => !!unit && new RegExp('(^|[^0-9.a-z])' + numberPattern(n) + '(?![0-9]|[.][0-9])[ -]+(?:[a-z]+[ -]+){0,2}?' + unit + 's?(?![a-z])', 'i').test(text);

const EXCEPTIONS = {
  'areaSurface/Flat Prism Quiz#0 objectives': 'the objective’s 24 is the volume of the student’s own pad model, not this base area',
  'areaSurface/Flat Prism Quiz#1 description': '"three model studies" counts studies, not layers',
  'buildChallenge/Room Inspector#0 objectives': '"walls 4 blocks high" is a height; the question asks the inside length',
  'buildChallenge/Volume Coach#1 objectives': '"walls 4 blocks high" is a height; the question asks the inside width',
  'fractionBuilder/Pizza Professor#0 question': 'the question is the conversion itself: 3 whole pizzas are 3 cubic units',
  'fractionBuilder/Pizza Professor#0 objectives': 'the objective’s 3½ is a building target, not 3 whole pizzas',
  'fractionBuilder/Pizza Professor#1 objectives': 'the objective’s 3½ is a building target the pizza sum happens to share',
  'base10Blocks/Ones Expert#0 dialogue': 'the unit cube is named for being ONE unit; this lesson introduces the names',
  'base10Blocks/Ones Expert#0 question': 'the unit cube is named for being ONE unit; this lesson introduces the names',
  'base10Blocks/Tens Teacher#0 dialogue': 'the ten-rod is named for its 10 cubes; this lesson introduces the names',
  'base10Blocks/Tens Teacher#0 question': 'the ten-rod is named for its 10 cubes; this lesson introduces the names',
  'base10Blocks/Hundreds Hero#1 dialogue': 'the hundred-flat is named for its 100 cubes; this lesson introduces the names',
  'base10Blocks/Hundreds Hero#1 objectives': 'the hundred-flat is named for its 100 cubes; this lesson introduces the names',
  'base10Blocks/Hundreds Hero#1 description': 'the hundred-flat is named for its 100 cubes; this lesson introduces the names',
  'base10Blocks/Build Challenge#0 question': 'the digit asked about is part of the given number 156',
  'base10Blocks/Build Challenge#1 dialogue': 'the task names the number to build; this step checks it the other way round',
  'geometryHarbor/3. Rowan - Garden Design#2 dialogue': '"twelve by two" is a garden size, not the 2-unit difference'
};

function giveaways() {
  const found = [];
  for (const [key, lesson] of Object.entries(lessons)) {
    const objectives = (lesson.objectives || []).map((o) => o.text || o).join(' | ');
    for (const npc of lesson.npcs || []) {
      const flat = (q) => q ? [q, ...(q.followUp || []).flatMap(flat)] : [];
      flat(npc.question).forEach((q, i) => {
        const keyed = numberOf(q.choices[q.correct]);
        if (keyed === null) return;
        const sources = {dialogue: npc.dialogue || '', objectives, description: lesson.description || ''};
        if (i === 0) sources.question = q.text;
        const unit = unitOf(q.choices[q.correct]);
        const others = q.choices.filter((c, ci) => ci !== q.correct).map(numberOf).filter((n) => n !== null && n !== keyed);
        const where = Object.keys(sources).filter((s) =>
          (saysWithUnit(sources[s], keyed, unit) && !others.some((n) => saysWithUnit(sources[s], n, unit)))
          || (says(sources[s], keyed) && !others.some((n) => says(sources[s], n))));
        where.forEach((s) => found.push({id: key + '/' + npc.name + '#' + i + ' ' + s, answer: q.choices[q.correct]}));
      });
    }
  }
  return found;
}

describe('no answer before its question', () => {
  it('no character line, objective or description states the keyed result of a question', () => {
    const found = giveaways();
    expect(found.filter((g) => !EXCEPTIONS[g.id]).map((g) => g.id + ': "' + g.answer + '"'), 'giveaways').toEqual([]);
    expect(Object.keys(EXCEPTIONS).filter((id) => !found.some((g) => g.id === id)), 'exceptions that no longer match: remove them').toEqual([]);
  });

  it('reads numbers the way a student does', () => {
    expect(says('Its base has 24 square units.', '24')).toBe(true);
    expect(says('four layers in all', '4')).toBe(true);
    expect(says('a height of 2.5, halfway', '2.5')).toBe(true);
    expect(says('the volume of 3D shapes', '3')).toBe(false);
    expect(says('a 24-unit model', '4')).toBe(false);
    expect(says('it is 2.5 tall', '2')).toBe(false);
    expect(says('a fourteen-block wall', '4')).toBe(false);
    expect(saysWithUnit('make four layers in all', '4', 'layer')).toBe(true);
    expect(saysWithUnit('Its base has 24 square units', '24', 'square')).toBe(true);
    expect(saysWithUnit('Each layer is 5 by 5 blocks', '5', 'layer')).toBe(false);
    expect(saysWithUnit('walls 4 blocks high', '4', 'layer')).toBe(false);
    expect([unitOf('4 layers'), unitOf('24 square units'), unitOf('3½ pizzas'), unitOf('100')]).toEqual(['layer', 'square', 'pizza', '']);
  });

  it('keeps the givens a student needs', () => {
    const line = (lesson, name) => lessons[lesson].npcs.find((n) => n.name === name).dialogue;
    expect(line('areaSurface', 'Flat Prism Quiz')).toContain('6 blocks long, 4 wide and 3 high');
    expect(line('areaSurface', 'Tall Prism Quiz')).toContain('3 by 3 by 8');
    expect(line('areaSurface', 'Layer Counter')).toContain('5 by 5');
    expect(line('compositeVolume', 'T-Shape Quiz')).toContain('8 by 2 by 3');
    expect(line('compositeVolume', 'T-Shape Quiz')).toContain('2 by 5 by 2');
    expect(line('base10Blocks', 'Build Challenge')).toContain('build the number 156');
  });
});
