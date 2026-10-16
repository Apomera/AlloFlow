import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const bankText = readFileSync('word_audio_kokoro_bank.json', 'utf8');
const bank = JSON.parse(bankText);
const manifest = JSON.parse(readFileSync('dev-tools/word_sounds_syllable_audio_manifest.json', 'utf8'));
const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + '\nreturn createWordSoundsCore;')()();
const sha = value => createHash('sha256').update(value).digest('hex');
const targets = core.syllableWords().sort();
const components = [...new Set(targets.flatMap(word => core.resolveSyllableTask(word, null, 'en').syllables))].sort();
const recordingTargets = core.syllableCountWords().filter(word => !targets.includes(word)).sort();
const required = [...new Set([...targets, ...components, ...recordingTargets])].sort();

describe('bundled syllable word audio', () => {
  it('covers every curated target and component with a real WebM clip', () => {
    expect(targets).toHaveLength(64);
    expect(components).toHaveLength(77);
    expect(recordingTargets).toHaveLength(37);
    expect(manifest.targets).toEqual(targets);
    expect(manifest.components).toEqual(components);
    expect(manifest.recordingTargets).toEqual(recordingTargets);
    for (const word of required) {
      expect(bank.words[word], word).toMatch(/^data:audio\/webm;base64,/);
      const bytes = Buffer.from(bank.words[word].split(',')[1], 'base64');
      expect(bytes.subarray(0, 4).toString('hex'), word).toBe('1a45dfa3');
      expect(bytes.length, word).toBeGreaterThan(1000);
    }
  });

  it('preserves all 951 existing word clips byte for byte', () => {
    const additions = new Set(manifest.clips.map(clip => clip.key));
    expect(additions.size).toBe(121);
    const original = Object.fromEntries(Object.entries(bank.words).filter(([word]) => !additions.has(word)).sort(([a], [b]) => a.localeCompare(b)));
    expect(Object.keys(original)).toHaveLength(951);
    expect(manifest.baseline.wordCount).toBe(951);
    expect(sha(JSON.stringify(original))).toBe(manifest.baseline.wordsSha256);
    expect([...additions].every(word => required.includes(word))).toBe(true);
  });

  it('preserves the prior 1041 clips when adding 31 complete recording-template words', () => {
    const additions = new Set(manifest.recordingExpansion.addedWords);
    expect(additions.size).toBe(31);
    expect([...additions].every(word => recordingTargets.includes(word))).toBe(true);
    const original = Object.fromEntries(Object.entries(bank.words).filter(([word]) => !additions.has(word)).sort(([a], [b]) => a.localeCompare(b)));
    expect(Object.keys(original)).toHaveLength(1041);
    expect(manifest.recordingExpansion.preservedWordCount).toBe(1041);
    expect(sha(JSON.stringify(original))).toBe(manifest.recordingExpansion.preservedWordsSha256);
  });

  it('retains one voice and records measured audibility without claiming human review', () => {
    expect(manifest.engine).toContain('Kokoro-82M-v1.0-ONNX');
    expect(manifest.source).toBe('generated_speech');
    expect(manifest.voice).toBe(bank._meta.voice);
    expect(manifest.voice).toBe('af_heart');
    expect(manifest.language).toBe('en-US');
    expect(manifest.humanReviewed).toBe(false);
    for (const clip of manifest.clips) {
      expect(clip.voice, clip.key).toBe(manifest.voice);
      expect(clip.speed, clip.key).toBe(1);
      expect(clip.source, clip.key).toBe('generated_speech');
      expect(clip.humanReviewed, clip.key).toBe(false);
      expect(clip.durationSeconds, clip.key).toBeGreaterThanOrEqual(0.2);
      expect(clip.durationSeconds, clip.key).toBeLessThanOrEqual(5);
      expect(clip.peak, clip.key).toBeGreaterThan(0.025);
      expect(clip.rms, clip.key).toBeGreaterThan(0.003);
      expect(clip.audibleSeconds, clip.key).toBeGreaterThan(0.07);
      expect(clip.clippedFraction, clip.key).toBeLessThan(0.005);
      const bytes = Buffer.from(bank.words[clip.key].split(',')[1], 'base64');
      expect(bytes.length, clip.key).toBe(clip.bytes);
      expect(sha(bytes), clip.key).toBe(clip.sha256);
    }
  });

  it('ships identical audio through the public mirror and existing pack helper', () => {
    expect(readFileSync('desktop/web-app/public/word_audio_kokoro_bank.json', 'utf8')).toBe(bankText);
    const source = readFileSync('word_sounds_setup_source.jsx', 'utf8');
    const helper = source.match(/const recordedBankAssetFor = \(text\) => \{[\s\S]*?\n {13}\};/);
    expect(helper).toBeTruthy();
    const packed = new Function('packRecordedWordBank', 'normalizePackKey', 'WS_CORE', 'return ' + helper[0].replace('const recordedBankAssetFor = ', ''))(
      bank.words, value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' '), core);
    for (const word of required) {
      expect(packed(word), word).toMatchObject({ mime: 'audio/webm', base64: bank.words[word].split(',')[1] });
    }
  });
});
