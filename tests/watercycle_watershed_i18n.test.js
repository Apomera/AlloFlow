// The Maine watershed module shipped ~30 paragraphs of student-facing prose
// hardcoded in English. This pins the extraction that made it translatable.
//
// Two invariants matter here and they pull in opposite directions:
//   1. Display prose (role/desc/knowledge/casework/modernContext) MUST go
//      through t(), or a non-English student reads English.
//   2. `name` MUST NOT. Component and technique names are written into the
//      student's saved action log and used as lookup keys
//      (stem_tool_watercycle.js: actionLog = { tech: tech.name, target: ...name }),
//      so translating them would break a campaign saved in another language.
import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

let src;
let localize;
let rawComponents;

function grabBalanced(text, startIndex, open, close) {
  let i = text.indexOf(open, startIndex);
  let depth = 0, j = i, str = null, prev = '';
  for (; j < text.length; j++) {
    const ch = text[j];
    if (str) { if (ch === str && prev !== '\\') str = null; }
    else if (ch === '"' || ch === "'" || ch === '`') str = ch;
    else if (ch === open) depth++;
    else if (ch === close) { depth--; if (!depth) { j++; break; } }
    prev = ch;
  }
  return text.slice(i, j);
}

beforeAll(() => {
  src = readFileSync(resolve(process.cwd(), PATHS[0]), 'utf8');

  const grabFn = (name) => {
    const at = src.indexOf('function ' + name + '(');
    expect(at, 'missing function ' + name).toBeGreaterThan(-1);
    return src.slice(at, at + grabBalanced(src, at, '{', '}').length + (src.indexOf('{', at) - at));
  };
  const arrayAt = src.search(/var\s+MAINE_WATERSHED_COMPONENTS\s*=\s*\[/);

  const sandbox = { Object, Array, String };
  vm.createContext(sandbox);
  vm.runInContext(
    'var MAINE_WATERSHED_COMPONENTS = ' + grabBalanced(src, arrayAt, '[', ']') + ';\n'
    + grabFn('wcWatershedCopy') + '\n'
    + grabFn('localizeWatershedComponents') + '\n',
    sandbox,
  );
  localize = vm.runInContext('localizeWatershedComponents', sandbox);
  rawComponents = vm.runInContext('MAINE_WATERSHED_COMPONENTS', sandbox);
});

const sentinel = (key) => '@' + key;

describe('Maine watershed prose is translatable', () => {
  it('routes every display paragraph through t()', () => {
    // Asserted against the expected SHAPE, not against the constant. The
    // constant no longer carries prose, so deriving the field list from it
    // would silently check nothing and pass.
    const localized = localize(sentinel);
    let keyed = 0;

    expect(localized.length, 'six watershed components').toBe(6);
    localized.forEach((component) => {
      for (const field of ['role', 'desc']) {
        expect(component[field], `${component.id}.${field}`).toMatch(/^@stem\.watercycle\.ws_/);
        keyed++;
      }
      for (const field of ['knowledge', 'casework', 'modernContext']) {
        expect(component.deepDive[field], `${component.id}.deepDive.${field}`).toMatch(/^@stem\.watercycle\.ws_/);
        keyed++;
      }
    });

    expect(keyed, 'every watershed paragraph should be keyed').toBe(30);
  });

  it('leaves names, ids and numbers alone', () => {
    const localized = localize(sentinel);
    localized.forEach((component, index) => {
      const before = rawComponents[index];
      // name is a PERSISTED lookup key — translating it corrupts saved campaigns.
      expect(component.name, 'name must not be translated').toBe(before.name);
      expect(component.id).toBe(before.id);
      expect(component.icon).toBe(before.icon);
      expect(component.color).toBe(before.color);
      expect(component.targets).toEqual(before.targets);
      expect(component.defaultState).toEqual(before.defaultState);
    });
  });

  it('keeps exactly one copy of the English', () => {
    // The prose used to live in the constant AND in the t() fallbacks. Two
    // copies of the same paragraph is how copy silently drifts, so the constant
    // now carries structure only and wcWatershedCopy() owns the words.
    rawComponents.forEach((component) => {
      expect(component.role, `${component.id}.role should live in wcWatershedCopy`).toBeUndefined();
      expect(component.desc, `${component.id}.desc should live in wcWatershedCopy`).toBeUndefined();
      // Kept truthy-but-empty: the UI tests `c.deepDive ?` to offer the button.
      expect(component.deepDive, `${component.id}.deepDive marker`).toEqual({});
    });
  });

  it('falls back to the reviewed English when no translation exists', () => {
    // t(key, fallback) with a translator that knows nothing must yield English,
    // which is now the ONLY place that English lives.
    const missing = (key, fallback) => (fallback == null ? key : fallback);
    const localized = localize(missing);
    expect(localized[0].role).toBe('Cold-water indicator');
    expect(localized[0].desc).toMatch(/^High-elevation forested streams\./);
    expect(localized[0].deepDive.casework).toMatch(/Eastern Brook Trout Joint Venture/);
  });

  it('uses literal keys so the string extractors can see them', () => {
    // A computed key (t('prefix.' + id)) never reaches a language pack.
    const copyStart = src.indexOf('function wcWatershedCopy(');
    const copyBody = grabBalanced(src, copyStart, '{', '}');
    expect(copyBody).not.toMatch(/t\(\s*['"][^'"]*['"]\s*\+/);
    expect((copyBody.match(/t\('stem\.watercycle\.ws_/g) || []).length).toBe(30);
  });

  it('keeps the shipped copy and the desktop mirror identical', () => {
    const [a, b] = PATHS.map((p) => readFileSync(resolve(process.cwd(), p), 'utf8'));
    expect(a === b, 'desktop mirror drifted').toBe(true);
  });
});

describe('Quiz bank is translatable', () => {
  // Grading is snapshot-based: the drawn question (q, a, opts, wrongFeedback)
  // is copied into state together and every comparison is stored-against-stored,
  // so translating the bank cannot desync an answer from its options.
  let bank;

  beforeAll(() => {
    const qStart = src.indexOf('function wcQuizQuestion(');
    const bankStart = src.indexOf('function wcQuizBank(');
    const bankEnd = src.indexOf('\n  }', src.indexOf('    };', bankStart));
    expect(qStart, 'missing wcQuizQuestion').toBeGreaterThan(-1);
    expect(bankStart, 'missing wcQuizBank').toBeGreaterThan(-1);
    bank = new Function(
      src.slice(qStart, bankStart) + '\n' + src.slice(bankStart, bankEnd + 4)
      + '\nreturn wcQuizBank;',
    )();
  });

  it('keys every question, option and piece of feedback', () => {
    const keyed = bank((key) => '@' + key);
    let strings = 0;
    for (const band of Object.keys(keyed)) {
      for (const item of keyed[band]) {
        expect(item.q).toMatch(/^@stem\.watercycle\.quiz_/);
        strings++;
        for (const opt of item.opts) {
          expect(opt).toMatch(/^@stem\.watercycle\.quiz_/);
          strings++;
        }
        strings += Object.keys(item.wrongFeedback).length;
      }
    }
    expect(strings, 'translatable quiz strings').toBe(256);
  });

  it('makes the bank invariants structural, not conventional', () => {
    // wcQuizQuestion picks the answer BY INDEX and skips that slot when building
    // feedback, so these two can no longer be violated by an authoring slip.
    const english = bank((key, fallback) => (fallback == null ? key : fallback));
    for (const band of Object.keys(english)) {
      for (const item of english[band]) {
        expect(item.opts, item.q).toContain(item.a);
        expect(new Set(item.opts).size, item.q).toBe(4);
        for (const key of Object.keys(item.wrongFeedback)) {
          expect(item.opts, item.q).toContain(key);
          expect(key, 'feedback must never target the correct answer').not.toBe(item.a);
        }
      }
    }
  });

  it('keeps the answer tied to its option after translation', () => {
    // The failure this guards: translating options but not `a` (or keying them
    // separately) would leave no option matching the correct answer, and every
    // student answer would grade as wrong.
    const translated = bank((key) => 'XX' + key + 'XX');
    for (const band of Object.keys(translated)) {
      for (const item of translated[band]) {
        expect(item.opts, 'answer must still be one of the translated options').toContain(item.a);
      }
    }
  });
});

describe('Glossary definitions are translatable', () => {
  // WATER_CYCLE_VOCAB was a map from concept id -> definition, looked up by id
  // (waterCycleVocab()[d.wcQuiz.concept]). Only the definitions are shown, so
  // unlike the quiz bank there is no display-string-as-key problem here.
  let vocab;

  beforeAll(() => {
    const at = src.indexOf('function wcVocabCopy(');
    expect(at, 'missing wcVocabCopy').toBeGreaterThan(-1);
    const body = grabBalanced(src, at, '{', '}');
    const sandbox = { Object };
    vm.createContext(sandbox);
    vm.runInContext('function wcVocabCopy(t) ' + body + '; this.__copy = wcVocabCopy;', sandbox);
    vocab = sandbox.__copy;
  });

  it('routes every definition through t()', () => {
    const keyed = vocab((key) => '@' + key);
    const values = Object.values(keyed);
    expect(values.length).toBe(15);
    for (const value of values) expect(value).toMatch(/^@stem\.watercycle\.vocab_/);
  });

  it('slugifies keys that contain punctuation', () => {
    // One term is "Darcy's Law" — an apostrophe in a key name is a syntax error
    // waiting to happen, and a space makes a poor pack key.
    const keyed = vocab((key) => key);
    const keys = Object.values(keyed);
    for (const key of keys) expect(key).toMatch(/^stem\.watercycle\.vocab_[a-z0-9_]+$/);
    expect(keys).toContain('stem.watercycle.vocab_darcy_s_law');
  });

  it('keeps the concept ids as lookup keys, untranslated', () => {
    const keyed = vocab((key, fallback) => fallback);
    expect(Object.keys(keyed)).toEqual(expect.arrayContaining([
      'evaporation', 'condensation', 'precipitation', 'collection', 'transpiration', 'infiltration',
    ]));
    expect(keyed.evaporation).toMatch(/^The process where liquid water/);
  });
});

describe('Steward campaign prose is translatable', () => {
  const constantBlock = (text, name, open, close) => {
    const at = text.search(new RegExp('var\\s+' + name + '\\s*=\\s*\\' + open));
    expect(at, 'missing constant ' + name).toBeGreaterThan(-1);
    return grabBalanced(text, at, open, close);
  };
  const count = (text, re) => (text.match(re) || []).length;

  it('keys the technique, feedback, cascade and difficulty copy', () => {
    const body = src.slice(src.indexOf('function wcStewardCopy('), src.indexOf('function applyStewardCopy('));
    // 28 technique/feedback/cascade/difficulty strings + 20 event strings.
    expect(count(body, /t\('stem\.watercycle\.sw_/g), 'keyed steward strings').toBe(48);
    // A computed key never reaches a language pack.
    expect(count(body, /t\(\s*'[^']*'\s*\+/g), 'no computed keys').toBe(0);
  });

  it('leaves exactly one copy of each string', () => {
    // Prose lives in wcStewardCopy() only; the constants keep behaviour.
    expect(count(constantBlock(src, 'STEWARD_TECHNIQUES', '[', ']'), /desc:/g)).toBe(0);
    expect(count(constantBlock(src, 'STEWARD_FEEDBACK_RULES', '[', ']'), /msg:/g)).toBe(0);
    const hints = constantBlock(src, 'STEWARD_CASCADE_HINTS', '[', ']');
    expect(count(hints, /fired:/g)).toBe(0);
    expect(count(hints, /near:/g)).toBe(0);
    const diff = constantBlock(src, 'STEWARD_DIFFICULTIES', '{', '}');
    expect(count(diff, /label:/g)).toBe(0);
    expect(count(diff, /desc:/g)).toBe(0);
  });

  it('does NOT translate names that are live lookup keys', () => {
    // technique.name is written to the action log AND read back as a lookup key
    // (techByName[a.tech] on the year-review screen), so it is a real
    // identifier. Same for component names via compByName[a.target].
    expect(count(constantBlock(src, 'STEWARD_TECHNIQUES', '[', ']'), /name:/g)).toBe(10);
    expect(src).toMatch(/techByName\[a\.tech\]/);
    expect(src).toMatch(/compByName\[a\.target\]/);
  });

  it('translates the event copy, which nothing reads back', () => {
    // event/eventIcon/eventDesc are written into the year snapshot but never
    // read (the review screen uses only actions/year/post/cascades), so these
    // are display strings, not identifiers.
    const events = constantBlock(src, 'STEWARD_EVENTS', '[', ']');
    expect(count(events, /name:/g), 'event names moved into wcStewardCopy').toBe(0);
    expect(count(events, /desc:/g), 'event descriptions moved into wcStewardCopy').toBe(0);
    const body = src.slice(src.indexOf('function wcStewardCopy('), src.indexOf('function applyStewardCopy('));
    expect(count(body, /t\('stem\.watercycle\.sw_ev_/g), 'event strings keyed').toBe(20);
  });

  it('records the event id in the year snapshot', () => {
    // So a saved campaign can be re-rendered in the reader's language rather
    // than relying on display text frozen at the moment it was played.
    expect(src).toMatch(/eventId: ev\.id/);
  });

  it('keeps the {v} placeholder inside the translatable string', () => {
    // Reorderable by a translator; splitting it into concatenation would not be.
    const body = src.slice(src.indexOf('function wcStewardCopy('), src.indexOf('function applyStewardCopy('));
    expect(count(body, /\{v\}/g), 'near-miss hints keep their placeholder').toBe(4);
  });

  it('seeds English at load so the constants are never blank', () => {
    expect(src).toMatch(/applyStewardCopy\(_wcT\);/);
    // var hoists the declaration but not the value, so the seed call runs with
    // _wcT still undefined — the guard inside must handle that.
    expect(src).toMatch(/if \(typeof t !== 'function'\) t = function \(key, fallback\)/);
  });
});
