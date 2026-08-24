/**
 * word_sounds_di_script.test.js
 *
 * Pins the Direct Instruction script generator in word_sounds_di_loader.js.
 *
 * The thing under test is a printed page a teacher reads aloud to a child, so
 * the assertions are mostly about the *sentences*, not the data structure. A
 * script that parses fine and says "Storm and  rhyme" is a failure, and only a
 * text-level assertion catches it.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const LOADER = path.join(ROOT, 'word_sounds_di_loader.js');

let DI;
beforeAll(() => {
  // The loader is an IIFE that assigns window.AlloWordSoundsDI and also does a
  // CommonJS export. Load it through require so the test exercises the same
  // file the browser gets, byte for byte.
  DI = require(LOADER);
});

// U+0101 a-macron: the long-a token the pack generator is prompted to emit.
// Built from a code point rather than typed, for the reason the loader states.
const A_MACRON = String.fromCharCode(0x101);

function w(word, phonemes, graphemes, extra) {
  return Object.assign({ word, phonemes, graphemes, syllables: [word] }, extra || {});
}

// An r-controlled pack, which is the shape a real Word Sounds set usually has:
// one vowel pattern repeated, plus a couple of words that do not carry it.
const OR_PACK = [
  w('corn', ['k', 'or', 'n'], ['c', 'or', 'n'], {
    rhymeWord: 'horn', familyEnding: '-orn', sentence: 'I can see the corn.',
    manipulationTask: { instruction: "Say 'corn'. Now say it again, but leave out the /k/ sound.", answer: 'orn' }
  }),
  w('horn', ['h', 'or', 'n'], ['h', 'or', 'n'], { rhymeWord: 'corn', familyEnding: '-orn' }),
  w('fork', ['f', 'or', 'k'], ['f', 'or', 'k']),
  w('storm', ['s', 't', 'or', 'm'], ['s', 't', 'or', 'm']),
  w('cat', ['k', 'a', 't'], ['c', 'a', 't']),
  Object.assign(w('rabbit', ['r', 'a', 'b', 'i', 't'], ['r', 'a', 'bb', 'i', 't']), { syllables: ['rab', 'bit'] }),
];

const PLAN = {
  masteryThreshold: 3,
  activities: [
    { id: 'counting', count: 3 },
    { id: 'manipulation', count: 2 },
    { id: 'syllable_counting', count: 2 },
    { id: 'mapping', count: 2 },
    { id: 'rhyming', count: 2 },
    { id: 'read_sentence', count: 1 },
  ],
};

function scriptFor(words, plan) {
  const analysis = DI.analyzeWordSet(words, { language: 'en', grade: 'Grade 1' });
  // plan is passed through verbatim, including an explicit null, so the
  // no-lesson-plan path is genuinely covered rather than silently defaulted.
  const effective = plan === undefined ? PLAN : plan;
  return { analysis, script: DI.buildLessonScript(analysis, effective) };
}
function allSayLines(script) {
  return script.sections.flatMap((s) => s.teacherSays || []);
}

describe('phoneme classification', () => {
  it('treats r-controlled vowels as one vowel, not vowel plus r', () => {
    expect(DI._classifyPhoneme('or')).toMatchObject({ kind: 'vowel', sub: 'r_controlled' });
    expect(DI._classifyPhoneme('ur')).toMatchObject({ kind: 'vowel', sub: 'r_controlled' });
  });

  it('treats macron vowels as long vowels', () => {
    expect(DI._classifyPhoneme(A_MACRON)).toMatchObject({ kind: 'vowel', sub: 'long' });
  });

  it('accepts a decomposed macron, because not every source is NFC', () => {
    const decomposed = 'a' + String.fromCharCode(0x304);
    expect(DI._classifyPhoneme(decomposed)).toMatchObject({ kind: 'vowel', sub: 'long' });
  });

  it('treats consonant digraphs as one consonant', () => {
    expect(DI._classifyPhoneme('sh')).toMatchObject({ kind: 'consonant', sub: 'digraph' });
    expect(DI._classifyPhoneme('ck')).toMatchObject({ kind: 'consonant', sub: 'digraph' });
  });
});

describe('word set analysis', () => {
  it('counts sounds, not letters', () => {
    const { analysis } = scriptFor(OR_PACK);
    const ship = DI._analyzeWord(w('ship', ['sh', 'i', 'p'], ['sh', 'i', 'p']));
    expect(ship.phonemeCount).toBe(3);
    expect(ship.shape).toBe('CVC');
    expect(analysis.wordCount).toBe(OR_PACK.length);
  });

  it('names the vowel pattern as the focus, not a common consonant', () => {
    // Regression: /t/ spelled t recurs in three of these six words, which beat
    // the r-controlled vowel on raw frequency and put the wrong pattern in the
    // printed objective.
    const { analysis } = scriptFor(OR_PACK);
    const focus = analysis.focusGpcs.map((g) => `${g.grapheme}->${g.phoneme}`);
    expect(focus).toContain('or->or');
    expect(focus).not.toContain('t->t');
    expect(analysis.gpcs.find((g) => g.grapheme === 't').focusEligible).toBe(false);
  });

  it('classifies syllable types and reports multisyllabic words honestly', () => {
    const { analysis } = scriptFor(OR_PACK);
    const byWord = Object.fromEntries(analysis.words.map((x) => [x.word, x.syllableType]));
    expect(byWord.corn).toBe('r-controlled');
    expect(byWord.cat).toBe('closed');
    expect(byWord.rabbit).toBe('multisyllabic (2)');
  });

  it('detects a silent-e word as silent-e, not as a vowel team', () => {
    const cake = DI._analyzeWord(w('cake', ['k', A_MACRON, 'k'], ['c', 'a', 'ke']));
    expect(cake.syllableType).toBe('silent-e');
  });

  it('finds an initial blend but does not call a digraph a blend', () => {
    const { analysis } = scriptFor(OR_PACK);
    expect(analysis.blends.map((b) => b.blend)).toContain('st (initial)');
    const ship = DI._analyzeWord(w('ship', ['sh', 'i', 'p'], ['sh', 'i', 'p']));
    expect(ship.initialBlend).toEqual([]);
  });

  it('flags spelling-estimated words so the printed script can warn', () => {
    const shaky = [Object.assign(w('yacht', ['y', 'a', 'c', 'h', 't'], null), { _fallbackUsed: true, _phonemeSource: 'estimated' })];
    const { script } = scriptFor(shaky, { masteryThreshold: 3, activities: [{ id: 'counting', count: 1 }] });
    expect(script.caveats.join(' ')).toMatch(/estimated from spelling/i);
  });
});

describe('the printed script', () => {
  it('states an objective naming the focus pattern and the mastery criterion', () => {
    const { script } = scriptFor(OR_PACK);
    expect(script.objective).toContain('/or/');
    expect(script.objective).toContain('3 consecutive correct');
  });

  it('follows model, then lead, then test, then correction', () => {
    const { script } = scriptFor(OR_PACK);
    const ids = script.sections.map((s) => s.id);
    expect(ids.indexOf('model')).toBeLessThan(ids.indexOf('lead'));
    expect(ids.indexOf('lead')).toBeLessThan(ids.indexOf('test_counting'));
    expect(ids.indexOf('test_read_sentence')).toBeLessThan(ids.indexOf('correction'));
    expect(ids[ids.length - 1]).toBe('close');
  });

  it('carries the full model, lead, test, delayed-test correction procedure', () => {
    const { script } = scriptFor(OR_PACK);
    const correction = script.sections.find((s) => s.id === 'correction');
    expect(correction.steps.map((s) => s.step)).toEqual(['Model', 'Lead', 'Test', 'Delayed test']);
    expect(correction.notes.join(' ')).toMatch(/Do not say "no" or "wrong"/);
  });

  it('models on words that carry the pattern, not whatever sorted first', () => {
    const { script } = scriptFor(OR_PACK);
    const model = script.sections.find((s) => s.id === 'model');
    model.items.forEach((item) => {
      expect(['corn', 'horn', 'fork', 'storm']).toContain(item.primary);
    });
  });

  it('one activity block per planned activity, in the teacher order', () => {
    const { script } = scriptFor(OR_PACK);
    const tests = script.sections.filter((s) => s.id.indexOf('test_') === 0);
    expect(tests.map((s) => s.id.replace('test_', ''))).toEqual(PLAN.activities.map((a) => a.id));
  });

  it('gives each activity the number of words the plan asked for', () => {
    const { script } = scriptFor(OR_PACK);
    PLAN.activities.forEach((a) => {
      const sec = script.sections.find((s) => s.id === 'test_' + a.id);
      expect(sec.items.length).toBe(a.count);
    });
  });
});

describe('the teacher wording', () => {
  it('reads as real sentences, with no unfilled blanks left on the page', () => {
    // The whole point of a printed DI script is that the teacher reads a
    // sentence. A stray '___' or '/_/' means the generator gave up and the
    // teacher has to improvise at the table.
    const { script } = scriptFor(OR_PACK);
    const lines = allSayLines(script);
    expect(lines.length).toBeGreaterThan(0);
    lines.forEach((line) => {
      expect(line, `blank left in: ${line}`).not.toContain('___');
      expect(line, `blank left in: ${line}`).not.toContain('/_/');
    });
  });

  it('never leaves a gap where a missing field should have been', () => {
    // Regression: 'storm' has no rhymeWord, and scripting rhyming from it
    // printed "Storm and  rhyme. They both end with orm."
    const { script } = scriptFor(OR_PACK);
    allSayLines(script).forEach((line) => {
      expect(line, `double space in: ${line}`).not.toMatch(/\s{2,}/);
      expect(line, `dangling connective in: ${line}`).not.toMatch(/\band\s+(rhyme|is|has)\b/);
    });
  });

  it('scripts rhyming from a word that actually has a rhyme', () => {
    const { script } = scriptFor(OR_PACK);
    const rhyming = script.sections.find((s) => s.id === 'test_rhyming');
    expect(rhyming.teacherSays[0]).toMatch(/^My turn\. (Corn and horn|Horn and corn) rhyme\./);
    expect(rhyming.teacherSays[0]).toContain('-orn');
  });

  it('takes the rime from the vowel, not by chopping one letter', () => {
    // 'storm' minus one grapheme is 'torm', which is not a rime and is not
    // anything a child has been taught.
    const storm = DI._analyzeWord(w('storm', ['s', 't', 'or', 'm'], ['s', 't', 'or', 'm']));
    const { script } = scriptFor([Object.assign(storm, { rhymeWord: 'form' })].map(() =>
      w('storm', ['s', 't', 'or', 'm'], ['s', 't', 'or', 'm'], { rhymeWord: 'form' })
    ), { masteryThreshold: 3, activities: [{ id: 'rhyming', count: 1 }] });
    const line = script.sections.find((s) => s.id === 'test_rhyming').teacherSays[0];
    expect(line).toMatch(/both end with orm./);
    expect(line).not.toMatch(/both end with torm/);
  });

  it('capitalizes the target word at a sentence start and not mid-sentence', () => {
    const { script } = scriptFor(OR_PACK);
    const counting = script.sections.find((s) => s.id === 'test_counting');
    expect(counting.teacherSays[0]).toBe('My turn. Corn. /k/ /or/ /n/. Three sounds.');
    expect(counting.teacherSays[1]).toBe('Your turn. How many sounds do you hear in corn?');
  });

  it('says the sounds of the modelled word, in order', () => {
    const { script } = scriptFor(OR_PACK);
    const model = script.sections.find((s) => s.id === 'model');
    expect(model.teacherSays.join(' ')).toContain('/k/ /or/ /n/. Corn.');
  });

  it('maps each sound to its own spelling in the mapping block', () => {
    const { script } = scriptFor(OR_PACK);
    const mapping = script.sections.find((s) => s.id === 'test_mapping');
    expect(mapping.teacherSays[0]).toContain('/or/ is spelled or');
    expect(mapping.teacherSays[0]).toContain('One box for each sound');
  });

  it('uses the pack manipulation task rather than inventing a deletion', () => {
    const { script } = scriptFor(OR_PACK);
    const swap = script.sections.find((s) => s.id === 'test_manipulation');
    expect(swap.teacherSays[0]).toContain('leave out the /k/ sound');
    expect(swap.teacherSays[0]).toContain('The answer is orn');
  });

  it('divides syllables with a hyphen, not with something that reads as a full stop', () => {
    const { script } = scriptFor(OR_PACK);
    const syll = script.sections.find((s) => s.id === 'test_syllable_counting');
    expect(syll.teacherSays[0]).toContain('Rab - bit');
    expect(syll.teacherSays[0]).not.toContain('Rab ... Bit');
  });
});

describe('degenerate inputs', () => {
  it('builds a script with no lesson plan at all', () => {
    const { script } = scriptFor(OR_PACK, null);
    expect(script.generatedFrom.planned).toBe(false);
    expect(script.sections.some((s) => s.id === 'correction')).toBe(true);
    expect(DI.scriptToText(script)).toContain('OBJECTIVE');
  });

  it('does not throw on an empty word list', () => {
    expect(() => {
      const a = DI.analyzeWordSet([], { language: 'en' });
      DI.scriptToText(DI.buildLessonScript(a, PLAN));
    }).not.toThrow();
  });

  it('survives words with no graphemes and no extras', () => {
    const bare = [{ word: 'dog', phonemes: ['d', 'o', 'g'] }];
    const { script } = scriptFor(bare, { masteryThreshold: 3, activities: [{ id: 'mapping', count: 1 }] });
    expect(DI.scriptToText(script)).toContain('dog');
  });

  it('repeats words evenly when the plan asks for more items than there are words', () => {
    const { script } = scriptFor(OR_PACK, { masteryThreshold: 3, activities: [{ id: 'counting', count: 10 }] });
    const items = script.sections.find((s) => s.id === 'test_counting').items;
    expect(items.length).toBe(10);
    expect(new Set(items.map((i) => i.primary)).size).toBe(OR_PACK.length);
  });

  it('is deterministic: the same pack produces the same script', () => {
    const a = DI.scriptToText(scriptFor(OR_PACK).script);
    const b = DI.scriptToText(scriptFor(OR_PACK).script);
    expect(a).toBe(b);
  });
});

describe('language gating', () => {
  it('supports English and refuses everything else', () => {
    expect(DI.supportsLanguage('en')).toBe(true);
    expect(DI.supportsLanguage('en-US')).toBe(true);
    expect(DI.supportsLanguage('')).toBe(true);
    expect(DI.supportsLanguage('es')).toBe(false);
    expect(DI.supportsLanguage('fr-CA')).toBe(false);
  });
});

describe('source shape', () => {
  it('does not hand-type macron letters, which every pack gate is blind to', () => {
    const src = fs.readFileSync(LOADER, 'utf8');
    const nonAscii = new Set([...src].filter((c) => c.charCodeAt(0) > 0x7f));
    // Box-drawing, arrow and middot are decoration in comments and separators.
    // Any *letter* above ASCII would mean a literal was typed rather than built
    // from a code point.
    [...nonAscii].forEach((c) => {
      expect(/\p{L}|\p{M}/u.test(c), `literal letter U+${c.codePointAt(0).toString(16)} in source`).toBe(false);
    });
  });

  it('every activity in the setup screen lesson plan has a skill entry', () => {
    const setup = fs.readFileSync(path.join(ROOT, 'word_sounds_setup_source.jsx'), 'utf8');
    const start = setup.indexOf('const [lessonPlan, setLessonPlan] = React.useState({');
    expect(start).toBeGreaterThan(-1);
    const block = setup.slice(start, setup.indexOf('});', start));
    const ids = [...block.matchAll(/^\s{12}([a-z_]+):\s*\{ enabled/gm)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(10);
    ids.forEach((id) => {
      expect(DI.ACTIVITY_SKILLS[id], `no DI skill entry for activity "${id}"`).toBeTruthy();
      expect(DI.ACTIVITY_SKILLS[id].teaches.length).toBeGreaterThan(10);
    });
  });
});
