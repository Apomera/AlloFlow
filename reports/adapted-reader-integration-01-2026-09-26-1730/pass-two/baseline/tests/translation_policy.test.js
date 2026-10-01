import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// The module registers onto window, so evaluate it in a sandbox with a window
// shim and pull the factory out. Same idiom the other module tests use, and it
// means the test exercises the SHIPPED module, not a re-typed copy of the logic.
function loadHelpers() {
  const src = readFileSync('text_pipeline_helpers_module.js', 'utf8');
  const sandbox = { window: {}, console };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  const factory = sandbox.window.AlloModules.createTextPipelineHelpers;
  expect(typeof factory, 'createTextPipelineHelpers exported').toBe('function');
  return factory();
}

const H = loadHelpers();
const resolve = H.resolveTranslationPolicy;

describe('resolveTranslationPolicy — the contract every prompt builder reads', () => {
  it("returns a resolved object, never a bare boolean or string", () => {
    const p = resolve('auto', 'Spanish', 'English');
    expect(p).toMatchObject({ enabled: true, target: 'English', mode: 'auto' });
  });

  it('reproduces the historical default: non-English content, English UI, English gloss', () => {
    for (const mode of ['auto', undefined, null, '']) {
      const p = resolve(mode, 'Spanish', 'English');
      expect(p.enabled, `mode=${String(mode)}`).toBe(true);
      expect(p.target, `mode=${String(mode)}`).toBe('English');
    }
  });

  it('is language-agnostic: auto glosses into the UI language, not into English', () => {
    // A Spanish-interface teacher generating Nahuatl content gets SPANISH
    // glosses. Nothing in the resolver privileges English.
    const p = resolve('auto', 'Nahuatl', 'Spanish');
    expect(p).toMatchObject({ enabled: true, target: 'Spanish' });
  });

  it('the immersion case: content and gloss in the same language means no gloss', () => {
    expect(resolve('auto', 'Spanish', 'Spanish').enabled).toBe(false);
    expect(resolve('Spanish', 'Spanish', 'English').enabled).toBe(false);
    expect(resolve('auto', 'English', 'English').enabled).toBe(false);
  });

  it('an explicit language wins over auto', () => {
    expect(resolve('Haitian Creole', 'Spanish', 'English'))
      .toMatchObject({ enabled: true, target: 'Haitian Creole', mode: 'Haitian Creole' });
  });

  it("'off' is the ONLY value that disables translations", () => {
    expect(resolve('off', 'Spanish', 'English').enabled).toBe(false);
    expect(resolve('OFF', 'Spanish', 'English').enabled).toBe(false);
    expect(resolve(' off ', 'Spanish', 'English').enabled).toBe(false);
  });

  it('non-string values fail to the auto default, never to a lockout', () => {
    // Regression guard for the class of bug where a multi-state setting is read
    // with a truthiness or `!== "off"` check: an unrecognised value there flips
    // behaviour for everyone. Rejected by TYPE, before any string coercion, so
    // nothing becomes a language named "42" or "[object Object]".
    for (const junk of [{}, [], 42, false, true, NaN, () => {}, Symbol('x')]) {
      const p = resolve(junk, 'Spanish', 'English');
      expect(p.enabled, `junk=${String(junk)}`).toBe(true);
      expect(p.target, `junk=${String(junk)}`).toBe('English');
      expect(p.mode, `junk=${String(junk)}`).toBe('auto');
    }
  });

  it('a stored language that is no longer offered falls back to auto', () => {
    // The teacher picked Haitian Creole, then removed it from the shared
    // language list. Without the allow-list the app would keep asking the model
    // for a destination nobody can see or change.
    const offered = ['English', 'Spanish'];
    const p = resolve('Haitian Creole', 'Portuguese', 'English', offered);
    expect(p).toMatchObject({ enabled: true, target: 'English', mode: 'auto' });
    // Still on offer: honoured exactly.
    expect(resolve('Spanish', 'Portuguese', 'English', offered))
      .toMatchObject({ enabled: true, target: 'Spanish', mode: 'Spanish' });
    // Matched case-insensitively, but returned in the list's CANONICAL
    // spelling, so the select still finds its option and does not draw blank.
    expect(resolve('spanish', 'Portuguese', 'English', offered))
      .toMatchObject({ enabled: true, target: 'Spanish', mode: 'Spanish' });
  });

  it('an unrecognised string with no allow-list is trusted as a language name', () => {
    // The shared language list is free text, so the resolver cannot tell an
    // unknown language from junk without being told what is on offer. Callers
    // that have the list pass it; this documents what happens when they do not.
    expect(resolve('Twi', 'Spanish', 'English')).toMatchObject({ enabled: true, target: 'Twi' });
  });

  it("'off' survives an allow-list that does not mention it", () => {
    expect(resolve('off', 'Spanish', 'English', ['English']).enabled).toBe(false);
  });

  it('never claims a target when the output language is unresolved', () => {
    expect(resolve('auto', '', 'English').enabled).toBe(false);
    expect(resolve('auto', null, 'English').enabled).toBe(false);
    // The fan-out placeholder re-enters per language with a concrete override.
    expect(resolve('auto', 'All Selected Languages', 'English').enabled).toBe(false);
    expect(resolve('English', 'All Selected Languages', 'Spanish').enabled).toBe(false);
  });

  it('a disabled policy has an empty target, so an interpolation cannot leak "undefined"', () => {
    const p = resolve('off', 'Spanish', 'English');
    expect(p.target).toBe('');
    expect(`gloss into ${p.target}`.includes('undefined')).toBe(false);
  });

  it('compares language names case- and accent-insensitively', () => {
    expect(H.isSameLanguage('Spanish', 'spanish')).toBe(true);
    expect(H.isSameLanguage('Français', 'Francais')).toBe(true);
    expect(H.isSameLanguage('Spanish', 'Portuguese')).toBe(false);
    expect(H.isSameLanguage('', '')).toBe(false);
    // A free-typed chip must not produce a self-translation.
    expect(resolve('spanish', 'Spanish', 'English').enabled).toBe(false);
  });

  it('falls back to English as the auto target only when no UI language is known', () => {
    expect(resolve('auto', 'Spanish', '').target).toBe('English');
    expect(resolve('auto', 'Spanish', null).target).toBe('English');
  });
});

describe('isTranslationControlRelevant — when the control is worth showing', () => {
  it('stays hidden for the English-in / English-out majority', () => {
    expect(H.isTranslationControlRelevant('auto', 'English', 'English')).toBe(false);
    expect(H.isTranslationControlRelevant(undefined, 'English', 'English')).toBe(false);
    expect(H.isTranslationControlRelevant('auto', '', 'English')).toBe(false);
  });

  it('appears once the output language differs from the gloss language', () => {
    expect(H.isTranslationControlRelevant('auto', 'Spanish', 'English')).toBe(true);
    // Symmetric: a Spanish-interface teacher generating English content.
    expect(H.isTranslationControlRelevant('auto', 'English', 'Spanish')).toBe(true);
  });

  it('stays visible once a teacher has set it, so the choice is reversible', () => {
    // Otherwise 'off' would be a one-way door: the control that set it would
    // vanish the moment the output language went back to English.
    expect(H.isTranslationControlRelevant('off', 'English', 'English')).toBe(true);
    expect(H.isTranslationControlRelevant('Spanish', 'Spanish', 'Spanish')).toBe(true);
  });
});

describe('translationTargetChoices — the picker offers real destinations only', () => {
  it('never offers the language the content is already in', () => {
    const choices = H.translationTargetChoices('Spanish', 'English', ['Spanish', 'Haitian Creole']);
    expect(choices).not.toContain('Spanish');
    expect(choices).toContain('English');
    expect(choices).toContain('Haitian Creole');
  });

  it('leads with the UI language, and does not duplicate it', () => {
    expect(H.translationTargetChoices('Nahuatl', 'Spanish', ['Spanish', 'English'])[0]).toBe('Spanish');
    const choices = H.translationTargetChoices('Nahuatl', 'Spanish', ['Spanish']);
    expect(choices.filter((c) => c === 'Spanish').length).toBe(1);
  });

  it('offers English as one candidate among others, not a privileged first', () => {
    const choices = H.translationTargetChoices('English', 'Spanish', ['Haitian Creole']);
    expect(choices).toEqual(['Spanish', 'Haitian Creole']);
  });

  it('tolerates a missing or malformed language list', () => {
    expect(H.translationTargetChoices('Spanish', 'English', null)).toEqual(['English']);
    expect(H.translationTargetChoices('Spanish', 'English', undefined)).toEqual(['English']);
    expect(H.translationTargetChoices('Spanish', 'English', ['', '  ', 'All Selected Languages'])).toEqual(['English']);
  });
});

describe('generateBilingualText honours the policy', () => {
  const calls = [];
  const fakeGemini = async (prompt) => {
    calls.push(prompt);
    return prompt.includes('|||BEGIN') ? 'GLOSS BODY' : 'TARGET BODY';
  };

  it('emits one block and no delimiter when translations are off', async () => {
    calls.length = 0;
    const out = await H.generateBilingualText('base', 'Spanish', fakeGemini, { enabled: false, target: '', mode: 'off' });
    expect(out).toBe('TARGET BODY');
    expect(out).not.toContain('--- ENGLISH TRANSLATION ---');
    expect(calls.length, 'no second round trip is spent').toBe(1);
  });

  it('emits the delimiter and asks for the resolved target when translations are on', async () => {
    calls.length = 0;
    const out = await H.generateBilingualText('base', 'Nahuatl', fakeGemini, { enabled: true, target: 'Spanish', mode: 'Spanish' });
    expect(out).toContain('--- ENGLISH TRANSLATION ---');
    expect(calls.length).toBe(2);
    expect(calls[1]).toContain('into Spanish');
    expect(calls[1]).not.toContain('into English');
  });

  it('a caller that passes no policy still gets the historical English gloss', async () => {
    calls.length = 0;
    const out = await H.generateBilingualText('base', 'Spanish', fakeGemini);
    expect(out).toContain('--- ENGLISH TRANSLATION ---');
    expect(calls[1]).toContain('into English');
  });
});
