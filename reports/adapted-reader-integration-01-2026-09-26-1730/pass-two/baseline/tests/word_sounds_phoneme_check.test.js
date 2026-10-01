import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const moduleSource = fs.readFileSync('word_sounds_module.js', 'utf8');
const setupSource = fs.readFileSync('word_sounds_setup_source.jsx', 'utf8');

describe('Word Sounds per-word phoneme check', () => {
  it('keeps audio regeneration and phoneme checking as separate controls', () => {
    // The LIVE panel (misc_components — the setup fossil was deleted
    // 2026-08-11) accepts both props and prefers the tri-source checker.
    const miscSource = fs.readFileSync('misc_components_source.jsx', 'utf8');
    expect(miscSource).toContain('onRegenerateWord,');
    expect(miscSource).toContain('onCheckPhonemes,');
    expect(miscSource).toContain('onClick={() => (onCheckPhonemes || onRegenerateWord) && (onCheckPhonemes || onRegenerateWord)(idx)}');
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
