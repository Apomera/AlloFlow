import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const moduleSource = fs.readFileSync('word_sounds_module.js', 'utf8');
const setupSource = fs.readFileSync('word_sounds_setup_source.jsx', 'utf8');

describe('Word Sounds per-word phoneme check', () => {
  it('keeps audio regeneration and phoneme checking as separate controls', () => {
    expect(setupSource).toContain('onRegenerateWord,');
    expect(setupSource).toContain('onCheckPhonemes,');
    expect(setupSource).toContain('onClick={() => onCheckPhonemes && onCheckPhonemes(idx)}');
    expect(moduleSource).toContain('const handleRegenerateWord = React.useCallback(');
    expect(moduleSource).toContain('await handleAudio(targetWord, true);');
    expect(moduleSource).toContain('const handleCheckPhonemes = React.useCallback(');
    expect(moduleSource).toContain('onCheckPhonemes: handleCheckPhonemes,');
  });

  it('triangulates pronunciation without invoking the broad word-data generator', () => {
    const start = moduleSource.indexOf('const handleCheckPhonemes = React.useCallback(');
    const end = moduleSource.indexOf('// Regenerate only the Sound Swap task', start);
    const handler = moduleSource.slice(start, end);

    expect(handler).toContain('window.AlloPhonics.toPhonemes');
    expect(handler).toContain('window.AlloPhonics.buildPhonemes');
    expect(handler).toContain('window.AlloDictionary.lookup');
    expect(handler).toContain('const [aiData, espeakData, dictionaryData] = await Promise.all');
    expect(handler).not.toContain('fetchWordData(');
    expect(handler).not.toContain('handleAudio(');
  });

  it('merges the checked phoneme fields into the existing review word', () => {
    const start = moduleSource.indexOf('const handleCheckPhonemes = React.useCallback(');
    const end = moduleSource.indexOf('// Regenerate only the Sound Swap task', start);
    const handler = moduleSource.slice(start, end);

    expect(handler).toContain('...existingWord,');
    expect(handler).toContain('...phonemePatch,');
    expect(handler).toContain('_phonemeCheckedAt: Date.now()');
    expect(handler).toContain('Your edits were kept.');
  });
});
