import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

function core() {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync('word_practice_core.js', 'utf8'), context);
  return context.AlloWordPracticeCore;
}

describe('independent card typography', () => {
  it('leaves existing word sets unchanged visually until a role size is chosen', () => {
    const api = core();
    expect(api.normalizeOptions({ cardTextScale: 1.2 })).toMatchObject({ wordTextScale: 1, meaningTextScale: 1, translationTextScale: 1 });
    expect(api.cardAppearance({ cardTextScale: 1.2 })).toMatchObject({ textScale: 1.2, wordScale: 1.2, meaningScale: 1.2, translationScale: 1.2 });
  });
  it('bounds imported values and preserves three separate choices in saved word sets', () => {
    const api = core();
    expect(api.normalizeOptions({ wordTextScale: Infinity, meaningTextScale: -1, translationTextScale: 99 })).toMatchObject({ wordTextScale: 1, meaningTextScale: .85, translationTextScale: 1.4 });
    const input = { words: [{ word: 'ورقة', termLanguage: 'Arabic', definition: 'A leaf.', definitionLanguage: 'English', translations: { Japanese: '葉' } }], options: { cardTextScale: 1.2, wordTextScale: .85, meaningTextScale: 1.1, translationTextScale: 1.4 } };
    const saved = JSON.parse(api.serializePack(input));
    expect(saved.options).toMatchObject(input.options);
    const appearance = api.cardAppearance(api.normalizeInput(saved).options);
    expect(appearance.wordScale).toBeCloseTo(1.02);
    expect(appearance.meaningScale).toBeCloseTo(1.32);
    expect(appearance.translationScale).toBeCloseTo(1.68);
    expect(api.normalizeInput(saved).items[0].translations[0].text).toBe('葉');
  });
});
