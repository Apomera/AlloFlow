import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const runtime = readFileSync('word_sounds_module.js', 'utf8');
const setup = readFileSync('word_sounds_setup_source.jsx', 'utf8');
function accessibleText(source, component, translate) {
  const componentStart = source.indexOf(component);
  expect(componentStart).toBeGreaterThan(-1);
  const start = source.indexOf('const tr = ', componentStart);
  const end = source.indexOf('\n  const resolved =', start);
  const helperEnd = end > -1 && end - start < 600 ? end : source.indexOf('\n      const [selected', start);
  expect(helperEnd - start).toBeGreaterThan(0);
  expect(helperEnd - start).toBeLessThan(600);
  return Function('translate', source.slice(start, helperEnd) + '; return tr;')(translate);
}

describe('Word Sounds accessible text handoff', () => {
  it.each([
    ['runtime maintenance', runtime, 'const WordSoundsPackMaintenance = '],
    ['runtime editor', runtime, 'function WordSoundsSyllableRecordingEditor('],
    ['setup editor', setup, 'function WordSoundsSyllableRecordingEditor('],
  ])('uses a translation and preserves readable fallbacks for %s', (name, source, component) => {
    expect(accessibleText(source, component, () => 'Translated name')('key', 'English name')).toBe('Translated name');
    for (const translate of [undefined, key => key, () => '', () => null, () => 42, () => { throw new Error('Pack unavailable'); }]) {
      expect(accessibleText(source, component, translate)('key', 'English name')).toBe('English name');
    }
  });

  it('threads the current host translators to the editor and maintenance surfaces', () => {
    expect(runtime).toMatch(/createElement\(WordSoundsPackMaintenance,\s*\{\s*translate: ts,/);
    expect(runtime).toMatch(/createElement\(WordSoundsSyllableRecordingEditor,\s*\{\s*translate: ts,/);
    expect(setup).toMatch(/<WordSoundsSyllableRecordingEditor\s+translate=\{tf\}/);
    expect(runtime).toContain("'aria-label': tr('word_sounds.prepared_audio_repair_label', 'Prepared lesson audio and repair')");
    for (const source of [runtime, setup]) expect(source).toContain("placeholder: tr('word_sounds.written_hint_placeholder', 'Written hint')");
    expect(setup).toContain("placeholder={tf('word_sounds.taught_spellings_placeholder', 's, a, t, p, i, n, sh, ck')}");
  });

  it('keeps canonical runtime and generated setup mirrors exact', () => {
    expect(readFileSync('desktop/web-app/public/word_sounds_module.js', 'utf8')).toBe(runtime);
    expect(readFileSync('desktop/web-app/public/word_sounds_setup_module.js', 'utf8')).toBe(readFileSync('word_sounds_setup_module.js', 'utf8'));
  });
});
