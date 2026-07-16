import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('word_sounds_setup_source.jsx', 'utf8');
const audioBank = JSON.parse(fs.readFileSync('audio_bank.json', 'utf8'));

describe('Word Sounds voice-pack phoneme aliases', () => {
  it('shows only unique recording slots', () => {
    expect(source).toContain("const PHONEME_PACK_ALIASES = { ai: 'ay', ea: 'ee' };");
    expect(source).toContain("'Long Vowels': ['ee','oo','ue','aw','oa']");
    expect(source).not.toContain("'Long Vowels': ['ee','oo','ue','aw','ai','ea','oa']");
  });

  it('migrates legacy alias clips and history to canonical sounds', () => {
    expect(source).toContain('if (!clips[canonical] && clips[alias]) clips[canonical] = clips[alias]');
    expect(source).toContain('delete clips[alias]');
    expect(source).toContain('delete out[alias]');
  });

  it('reuses the shared long-A recording for the rain demo', () => {
    expect(source).toContain("{ word: 'rain', keys: ['r','ay','n'] }");
    expect(source).toContain("ay: 'Long /a/ (play/rain), say the letter A.'");
    expect(source).toContain("ee: 'Big smile, long /ee/ (tree/leaf). Stretch it.'");
  });

  it('exposes the existing voiced-TH reference as its own recording target', () => {
    expect(source).toContain("'Digraphs': ['sh','zh','ch','th','dh','wh','ph','ck','ng','q']");
    expect(source).toContain("dh:'this'");
    expect(source).toContain("key === 'dh' ? '\u00f0' : key");
    expect(source).toContain("key === 'dh' ? 'th' : key");
    expect(audioBank.phonemes.dh).toMatch(/^data:audio\//);
  });
});