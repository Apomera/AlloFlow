import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { sliceBetween } from './helpers/anchored_slice.js';

const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + '\nreturn createWordSoundsCore();')();
const context = (extra = {}) => core.createSyllableCountAudioContext({ language: 'en-US', voice: 'original-voice', ...extra });
// A real RIFF/WAVE header ('WAVE' at byte 8), as in every other Word Sounds
// test: playback only uses a clip that passes core.portablePackAsset.
const clip = { mime: 'audio/wav', base64: (() => { const bytes = Buffer.alloc(68); bytes.write('RIFF'); bytes.write('WAVE', 8); return bytes.toString('base64'); })() };
const approval = () => core.createReviewedSyllableCount({ targetWord: 'fire', language: 'en-US', count: 2,
  reviewed: true, revision: 1, audioContext: context() });
const item = () => ({ word: 'fire', ttsReady: false, _preparedActivities: ['syllable_counting'],
  _ttsRequiredKeys: ['fire', 'How many syllables do you hear? Clap for each one'], activityItems: { syllable_counting: approval() } });
const input = (prepared = approval(), audioContext = context()) => ({ language: 'en-US', prepared, audioContext });
const runtime = readFileSync('word_sounds_module.js', 'utf8');
const helperSource = sliceBetween(runtime, '    const syllableCountWordKey =', '    const syllableCountContextKey =', { label: 'syllable count audio lookup' });
const audioFor = host => new Function('WS_CORE', 'window', helperSource + '\nreturn syllableCountAudioFor;')(core, host);

describe('teacher-led syllable counting evidence', () => {
  it('survives packing and a different device default voice without claiming a recorded clip', () => {
    const prepared = JSON.parse(JSON.stringify(approval()));
    expect(core.isTeacherSpokenSyllableCount('fire', input(prepared, context({ voice: 'student-default' })))).toBe(true);
    expect(core.resolveSyllableCount('fire', input(prepared, context({ voice: '' })))).toMatchObject({
      supported: true, deliveryMode: 'teacher_spoken', count: 2, audioContext: { fingerprint: null },
    });
  });
  it('requires fresh review for an actual replacement recording or another locale', () => {
    expect(core.isTeacherSpokenSyllableCount('fire', input(approval(), context({ asset: clip })))).toBe(false);
    expect(core.resolveSyllableCount('fire', input(approval(), context({ asset: clip })))).toMatchObject({ supported: false, reason: 'count_audio_changed' });
    expect(core.isTeacherSpokenSyllableCount('fire', { ...input(), language: 'en-GB', audioContext: context({ language: 'en-GB' }) })).toBe(false);
  });
  it('does not trust a delivery flag, a tampered count, or an old unbound approval', () => {
    expect(core.isTeacherSpokenSyllableCount('inventedzz', { ...input({ deliveryMode: 'teacher_spoken', count: 2 }) })).toBe(false);
    expect(core.isTeacherSpokenSyllableCount('fire', input({ ...approval(), count: 3 }))).toBe(false);
    const old = core.createReviewedSyllableCount({ targetWord: 'fire', language: 'en-US', count: 2, reviewed: true, revision: 1 });
    expect(core.isTeacherSpokenSyllableCount('fire', input(old))).toBe(false);
  });
  it('leaves intentional spoken targets out of repair while preserving prompts and mixed-activity audio', () => {
    const words = [item()];
    const inventory = core.packAudioInventory(words, 'other-voice', 'en-US');
    expect(inventory.some(row => row.key === 'fire')).toBe(false);
    expect(inventory.some(row => row.key === 'how many syllables do you hear? clap for each one')).toBe(true);
    expect(core.packAudioInventory(words, '', 'en-US', [], ['syllable_counting', 'blending']).some(row => row.key === 'fire')).toBe(true);
    expect(core.planPackRepair(words, 'en-US', ['syllable_counting']).missing.some(row => row.key === 'fire')).toBe(false);
    expect(core.planPackRepair(words, 'en-US', ['syllable_counting', 'blending']).missing.some(row => row.key === 'fire')).toBe(true);
    expect(core.packAudioInventory([...words, { word: 'camp', activityItems: { blending: { options: ['fire'] } } }], '', 'en-US').some(row => row.key === 'fire')).toBe(true);
  });
  it('ignores a later background bank or device-library clip in teacher-spoken mode', () => {
    const getAudio = audioFor({ _CACHE_WORD_AUDIO_BANK: { fire: 'data:audio/wav;base64,' + clip.base64 } });
    expect(getAudio('fire', 'en-US', item(), [], { fire: 'blob:device' }, 'new-voice')).toMatchObject({ source: null, context: { fingerprint: null } });
  });
  it('does not hide actual packed replacements, including later per-word asset buckets', () => {
    const getAudio = audioFor({});
    const words = [item(), { word: 'camp', _ttsAssets: { fire: clip } }];
    const found = getAudio('fire', 'en-US', words[0], words, {}, 'new-voice');
    expect(found.source).toBe('data:audio/wav;base64,' + clip.base64);
    expect(core.isTeacherSpokenSyllableCount('fire', input(approval(), found.context))).toBe(false);
  });
  it('does not play a packed entry that is not real audio, and keeps the lesson teacher-led', () => {
    const broken = { mime: 'audio/wav', base64: Buffer.from('RIFF' + ' '.repeat(40) + 'WAVE').toString('base64') };
    expect(core.portablePackAsset(broken)).toBe(false);
    const found = audioFor({})('fire', 'en-US', item(), [item(), { word: 'camp', _ttsAssets: { fire: broken } }], {}, 'new-voice');
    expect(found.source).toBeNull();
    expect(core.isTeacherSpokenSyllableCount('fire', input(approval(), found.context))).toBe(true);
  });
});
