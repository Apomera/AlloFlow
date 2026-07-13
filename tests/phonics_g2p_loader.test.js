// phonics_g2p_loader multilingual upgrade (2026-07-12).
//
// Contract under test:
//  1. ENGLISH BEHAVIOR IS BYTE-IDENTICAL — same voice (en-us), same phonics
//     normalization (flap ɾ→t, ɚ→ɜr), same digraph-aware grapheme alignment.
//  2. Other languages resolve against the VERIFIED espeak-ng voice inventory
//     (enumerated from the real espeak-ng@1.0.2 wasm, 2026-07-12) and receive
//     RAW stress/length-stripped IPA — never the English normalizations
//     (Spanish "perro" keeps its genuine tap /ɾ/).
//  3. Languages with no espeak voice resolve to NULL — the caller keeps its
//     Gemini phonemes. The old code silently ran English G2P for them.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let P;
beforeAll(() => {
  const src = readFileSync(resolve(process.cwd(), 'phonics_g2p_loader.js'), 'utf8');
  delete window.AlloPhonics;
  // eslint-disable-next-line no-new-func
  new Function(src)();
  P = window.AlloPhonics;
  if (!P) throw new Error('loader did not register window.AlloPhonics');
});

describe('voice resolution (verified inventory, honest null)', () => {
  const cases = [
    // English: unchanged legacy behavior incl. the empty default
    [null, 'en-us'], ['', 'en-us'], ['en-US', 'en-us'], ['english', 'en-us'], ['en-AU', 'en-us'], ['en-gb', 'en-gb'],
    // friendly names → verified voices
    ['Spanish', 'es'], ['French', 'fr-fr'], ['Portuguese', 'pt-br'], ['Cantonese', 'yue'],
    ['Dari', 'fa'], ['Burmese', 'my'], ['Haitian Creole', 'ht'], ['Nepali', 'ne'],
    // BCP-47 codes the Word Sounds selector actually emits (getSpeechLangCode)
    ['es-ES', 'es'], ['es-419', 'es-419'], ['pt-BR', 'pt-br'], ['zh-CN', 'cmn'],
    ['zh-HK', 'yue'], ['no-NO', 'nb'], ['prs-AF', 'fa'], ['vi-VN', 'vi'],
    ['uk-UA', 'uk'], ['am-ET', 'am'], ['sw-KE', 'sw'],
    // no espeak voice → NULL (Gemini-only), never silent English
    ['Tagalog', null], ['fil-PH', null], ['Somali', null], ['so-SO', null],
    ['Khmer', null], ['km-KH', null], ['Lao', null], ['Yoruba', null],
    ['Hmong', null], ['Pashto', null], ['ps-AF', null], ['Karen', null],
    ['kar-MM', null], ['Chin (Hakha)', null], ['Maay Maay', null],
    ['Marshallese', null], ['mh-MH', null], ['xx', null], ['zz-ZZ', null],
  ];
  for (const [input, expected] of cases) {
    it(`${JSON.stringify(input)} → ${JSON.stringify(expected)}`, () => {
      expect(P._resolveVoice(input)).toBe(expected);
      expect(P.voiceFor(input)).toBe(expected);
    });
  }
});

describe('IPA selection: English keeps the phonics inventory, others keep raw IPA', () => {
  const parsed = { raw: ['ɾ', 'ˈo'].map((t) => t.replace(/[ˈˌ]/g, '')), norm: ['t', 'o'] };
  it('English voice → normalized (ɾ→t) — the pre-multilingual behavior', () => {
    expect(P._ipaFromParsed({ raw: ['ɾ', 'o'], norm: ['t', 'o'] }, 'en-us')).toEqual(['t', 'o']);
  });
  it('Spanish voice → raw (the tap /ɾ/ is a real phoneme, must survive)', () => {
    expect(P._ipaFromParsed({ raw: ['ɾ', 'o'], norm: ['t', 'o'] }, 'es')).toEqual(['ɾ', 'o']);
  });
  it('empty sequences → null (caller falls back)', () => {
    expect(P._ipaFromParsed({ raw: [], norm: [] }, 'es')).toBeNull();
    expect(P._ipaFromParsed(null, 'es')).toBeNull();
  });
  it('English token normalization itself is unchanged', () => {
    expect(P._normalizeToken('ɾ')).toBe('t');
    expect(P._normalizeToken('ɚ')).toBe('ɜr');
    expect(P._normalizeToken('ˈæ')).toBe('æ');
    expect(P._normalizeToken('ɡ')).toBe('g');
  });
  void parsed;
});

describe('grapheme alignment: English unchanged, accented letters preserved', () => {
  it('English digraph/trigraph grouping is identical', () => {
    expect(P.alignGraphemes('chip', 3)).toEqual(['ch', 'i', 'p']);
    expect(P.alignGraphemes('night', 3)).toEqual(['n', 'igh', 't']);
    expect(P.alignGraphemes('cat', 3)).toEqual(['c', 'a', 't']);
  });
  it("accented letters survive (old [^a-z'] filter deleted them: 'niño'→'nio')", () => {
    expect(P.alignGraphemes('niño', 4)).toEqual(['n', 'i', 'ñ', 'o']);
  });
});

describe('unsupported language short-circuits before any wasm work', () => {
  it('toPhonemes resolves null for a no-voice language without loading espeak', async () => {
    const result = await P.toPhonemes('gato', { lang: 'Somali' });
    expect(result).toBeNull();
    expect(P.ready()).toBe(false); // factory never touched
  });
});

describe('getSpeechLangCode upstream map (source pins)', () => {
  it('previously-unmapped languages now carry real BCP-47 codes', () => {
    const src = readFileSync(resolve(process.cwd(), 'module_scope_extras_source.jsx'), 'utf8');
    for (const pin of ["'somali': 'so-SO'", "'khmer': 'km-KH'", "'nepali': 'ne-NP'", "'pashto': 'ps-AF'", "'dari': 'prs-AF'", "'marshallese': 'mh-MH'"]) {
      expect(src).toContain(pin);
    }
  });
});
