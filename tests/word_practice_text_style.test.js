import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

function core() {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync('word_practice_core.js', 'utf8'), context);
  return context.AlloWordPracticeCore;
}
const reader = { fontFamily: "'Andika', sans-serif", fontClass: 'font-andika-bold-italic' };

describe('explicit card text styles', () => {
  it.each(['default', 'georgia'])('preserves automatic hierarchy and reader precedence with the %s face', cardFont => {
    const api = core();
    expect(api.normalizeOptions({}).cardTextStyle).toBe('default');
    expect(api.cardAppearance({ cardFont }, reader)).toMatchObject(cardFont === 'default'
      ? { fontFace: 'Andika', fontStyle: 'italic', fontWeight: 700 }
      : { fontFace: 'Georgia', fontStyle: 'normal', fontWeight: null });
    expect(api.cardAppearance({ cardFont })).toMatchObject({ fontStyle: 'normal', fontWeight: null });
  });
  it.each([
    ['regular', 'normal', 400], ['bold', 'normal', 700],
    ['italic', 'italic', 400], ['bold-italic', 'italic', 700],
  ])('applies %s to any chosen face independently of the reader variant', (cardTextStyle, fontStyle, fontWeight) => {
    const api = core();
    for (const cardFont of ['default', 'arial', 'verdana', 'georgia']) {
      const options = { cardFont, cardTextStyle, cardTextScale: 1.2, translationTextScale: 1.4, cardTheme: 'cream' };
      expect(api.cardAppearance(options, reader)).toMatchObject({ fontStyle, fontWeight, textScale: 1.2 });
      const pack = { words: [{ word: 'ورقة', termLanguage: 'Arabic', translations: { Japanese: '葉' } }], options };
      const saved = JSON.parse(api.serializePack(pack));
      expect(saved.options).toMatchObject(options);
      expect(api.cardAppearance(api.normalizeOptions({ ...saved.options, cardTheme: 'mist' }), reader)).toMatchObject({ fontStyle, fontWeight });
    }
  });
  it('rejects arbitrary CSS styles in imported options', () => {
    const api = core();
    expect(api.normalizeOptions({ cardTextStyle: 'oblique; color:red' }).cardTextStyle).toBe('default');
    expect(api.cardAppearance({ cardTextStyle: 'oblique; color:red' })).toMatchObject({ fontStyle: 'normal', fontWeight: null });
  });
});
