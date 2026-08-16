// Adventure's gloss target follows the universal translation setting
// (fleet wave 2, W3; L4 inventory row 23).
//
// Adventure makes two language decisions and they belong to different controls:
//
//   WHETHER to gloss  -> adventureLanguageMode, Adventure's own tri-state. It has
//        a "multilingual mix" state no other surface has, and "<Lang> + English"
//        versus bare "<Lang>" is how a teacher asks for a second block or for
//        immersion with none. That control stays authoritative.
//   INTO WHAT         -> the universal setting, via the shared
//        resolveTranslationPolicy. All five prompt builders used to hardcode
//        "English", so a teacher running AlloFlow in Spanish got a Spanish
//        adventure glossed into English.
//
// The behavioural half of this file lifts the helper out of the source and runs
// it against the real resolver lifted out of the monolith, so the two are tested
// as the pair they actually are rather than against a stub of one of them.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

let handlers;
let anti;
let glossLanguage;
let resolveTranslationPolicy;

const lift = (src, startMarker, endMarker, returnName) => {
  const start = src.indexOf(startMarker);
  if (start < 0) throw new Error(`missing: ${startMarker}`);
  const end = src.indexOf(endMarker, start);
  if (end < 0) throw new Error(`missing end: ${endMarker}`);
  return new Function(`${src.slice(start, end)}; return ${returnName};`)();
};

beforeAll(() => {
  handlers = readFileSync('adventure_handlers_source.jsx', 'utf8');
  anti = readFileSync('AlloFlowANTI.txt', 'utf8');

  // The real resolver, not a stand-in. window is absent here, so its
  // TextPipelineHelpers upgrade path falls through to the inline default,
  // which is the same logic the module publishes.
  global.window = global.window || {};
  resolveTranslationPolicy = lift(
    anti,
    "const TRANSLATION_MODE_AUTO = 'auto';",
    'const isTranslationControlRelevant',
    'resolveTranslationPolicy'
  );
  glossLanguage = lift(
    handlers,
    'const adventureGlossLanguage = (deps) => {',
    'let activeAdventureEstablishingShot',
    'adventureGlossLanguage'
  );
});

const gloss = (over = {}) => glossLanguage({
  adventureLanguageMode: 'Spanish + English',
  currentUiLanguage: 'English',
  translationMode: 'auto',
  resolveTranslationPolicy,
  ...over,
});

describe('the gloss target', () => {
  it('is still English for an English UI, which is almost everyone', () => {
    expect(gloss()).toBe('English');
  });

  it('follows the UI language when the teacher runs AlloFlow in another one', () => {
    expect(gloss({ currentUiLanguage: 'Spanish', adventureLanguageMode: 'French + English' })).toBe('Spanish');
    expect(gloss({ currentUiLanguage: 'Vietnamese', adventureLanguageMode: 'French + English' })).toBe('Vietnamese');
  });

  it('covers the multilingual mix, which the resolver alone declines to answer', () => {
    // resolveTranslationPolicy returns {enabled:false} for multi-language output
    // on purpose. Adventure still wants exactly one gloss block, so the helper
    // supplies the UI language rather than dropping to English.
    expect(gloss({ adventureLanguageMode: 'All + English', currentUiLanguage: 'Somali' })).toBe('Somali');
    expect(gloss({ adventureLanguageMode: 'All + English', currentUiLanguage: 'English' })).toBe('English');
  });

  it('does not gloss a language into itself', () => {
    expect(gloss({ adventureLanguageMode: 'Spanish + English', currentUiLanguage: 'Spanish' })).toBe('English');
  });
});

describe('the fallbacks are all the historical behaviour', () => {
  it('translations switched off universally means English, not silence', () => {
    // Adventure's control is authoritative on WHETHER, so 'off' must not delete
    // the block a teacher explicitly asked for. It only stops steering the target.
    expect(gloss({ translationMode: 'off', currentUiLanguage: 'Spanish' })).toBe('English');
    expect(gloss({ translationMode: 'off', adventureLanguageMode: 'All + English', currentUiLanguage: 'Spanish' })).toBe('English');
  });

  it('an older host that passes no resolver still works', () => {
    expect(gloss({ resolveTranslationPolicy: undefined, currentUiLanguage: 'Spanish' })).toBe('English');
  });

  it('a missing or empty UI language works', () => {
    expect(gloss({ currentUiLanguage: '' })).toBe('English');
    expect(gloss({ currentUiLanguage: undefined })).toBe('English');
  });

  it('a throwing resolver cannot take the adventure down', () => {
    const boom = () => { throw new Error('resolver exploded'); };
    expect(gloss({ resolveTranslationPolicy: boom, currentUiLanguage: 'Spanish' })).toBe('English');
  });

  it('no deps at all still returns a usable string', () => {
    expect(glossLanguage(undefined)).toBe('English');
    expect(glossLanguage({})).toBe('English');
  });
});

describe('every prompt builder actually uses it', () => {
  it('leaves no hardcoded English gloss target behind', () => {
    // The five sites from L4's inventory row 23.
    expect(handlers).not.toContain('Provide English translations');
    expect(handlers).not.toContain('provide English translations');
    expect(handlers).not.toContain('concise English translation');
    expect(handlers).not.toContain('without English translations');
    expect(handlers).not.toContain('Do NOT provide English translations');
  });

  it('calls the helper in all five builders', () => {
    const calls = handlers.match(/adventureGlossLanguage\(deps\)/g) || [];
    expect(calls.length).toBe(5);
  });

  it('keeps "Language: English." as a CONTENT language, not a gloss target', () => {
    // These three are the mode === 'English' branch: the adventure itself is in
    // English. Rewriting them would have been the wrong edit.
    const contentDefaults = handlers.match(/let langInstruction = "Language: English\.";/g) || [];
    expect(contentDefaults.length).toBe(3);
  });
});

describe('the plumbing is real', () => {
  it('the host passes both new deps to the handlers module', () => {
    const start = anti.indexOf('const _alloAdventureHandlersDeps = () => ({');
    expect(start).toBeGreaterThan(-1);
    const deps = anti.slice(start, anti.indexOf('});', start));
    expect(deps).toContain('translationMode,');
    expect(deps).toContain('resolveTranslationPolicy,');
  });

  it('translationMode is declared before the deps builder, so there is no TDZ', () => {
    expect(anti.indexOf('const [translationMode, setTranslationMode]'))
      .toBeLessThan(anti.indexOf('const _alloAdventureHandlersDeps = () => ({'));
  });

  it('every handler that glosses destructures what the helper reads', () => {
    // A helper reading deps.resolveTranslationPolicy works whether or not the
    // handler destructures it, but the destructure is what makes it visible to
    // the next reader. Pin the two that needed adding.
    const hint = handlers.slice(handlers.indexOf('const handleAdventureHint = async (deps) => {'));
    expect(hint.slice(0, 900)).toContain('resolveTranslationPolicy,');
    const hand = handlers.slice(handlers.indexOf('const handleGuidingHand = async (item, deps) => {'));
    expect(hand.slice(0, 900)).toContain('resolveTranslationPolicy,');
  });

  it('the built module carries the helper and matches its deploy mirror', () => {
    const built = readFileSync('adventure_handlers_module.js', 'utf8');
    const mirror = readFileSync('desktop/web-app/public/adventure_handlers_module.js', 'utf8');
    expect(built).toContain('adventureGlossLanguage');
    expect(mirror).toBe(built);
  });
});
