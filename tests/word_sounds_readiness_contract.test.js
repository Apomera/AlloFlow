import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('word_sounds_readiness_contract.js', 'utf8');
function load(host = {}) {
  const module = { exports: {} };
  new Function('globalThis', 'module', source)({ window: host }, module);
  return { api: module.exports, host };
}
function wav() {
  const bytes = Buffer.alloc(204);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(196, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(160, 40);
  return { mime: 'audio/wav', base64: bytes.toString('base64') };
}
function resource(extra = {}) {
  return { type: 'word-sounds', id: 'lesson', isProbeMode: true, lessonPlanSequence: ['decoding'], data: [{ word: 'cat', activityItems: { decoding: { choices: ['cat'] } }, _ttsAssets: { cat: wav() } }], ...extra };
}
function factory(mode = 'ready', tracker = {}) {
  tracker.active = 0; tracker.maximum = 0; tracker.created = 0; tracker.played = 0;
  return () => {
    tracker.created++; tracker.active++; tracker.maximum = Math.max(tracker.maximum, tracker.active);
    let released = false;
    const audio = {
      readyState: mode === 'metadata' ? 1 : 2, duration: mode === 'zero' ? 0 : 0.01,
      canPlayType: () => mode === 'unsupported' ? '' : 'probably',
      pause: () => {}, play: () => { tracker.played++; },
      removeAttribute: () => { audio.src = ''; if (!released) { released = true; tracker.active--; } },
      load: () => {
        if (!audio.src || mode === 'wait' || mode === 'unsupported') return;
        queueMicrotask(() => {
          if (mode === 'damaged') audio.onerror?.();
          else if (mode === 'metadata') audio.onloadedmetadata?.();
          else audio.oncanplay?.();
        });
      },
    };
    tracker.last = audio;
    return audio;
  };
}
afterEach(() => vi.useRealTimers());

describe('Word Sounds readiness contract', () => {
  it('does not infer ready from a saved flag or nonempty corrupt base64', () => {
    const { api } = load(); const item = resource(); item.data[0].ttsReady = true; item.data[0]._ttsAssets.cat.base64 = 'QUJDRA==';
    expect(api.inspect(item)).toMatchObject({ complete: false, ready: 0, missing: 1 });
    expect(api.inspect(item).clips[0].status).toBe('invalid');
  });
  it('rejects wrong MIME, noncanonical base64, truncated and unsupported containers', () => {
    const { api } = load();
    expect(api.descriptor({ ...wav(), mime: 'audio/mpeg' }).status).toBe('invalid');
    expect(api.descriptor({ mime: 'audio/wav', base64: 'Zh==' }).status).toBe('invalid');
    expect(api.descriptor({ mime: 'audio/wav', base64: 'UklGRg==' }).status).toBe('invalid');
    expect(api.descriptor({ mime: 'audio/unknown', base64: 'AAAA' }).status).toBe('unsupported');
  });
  it('adds target words and selected board choices even when a manifest omits them', () => {
    const { api } = load(); const item = resource(); item.data[0]._ttsRequiredKeys = ['old']; item.data[0].activityItems.decoding.choices.push('dog');
    expect(api.requirements(item).entries.map(x => x.id)).toEqual(expect.arrayContaining(['speech:cat', 'speech:dog', 'speech:old']));
  });
  it('limits board-derived requirements to selected activities', () => {
    const { api } = load(); const item = resource(); item.data[0].activityItems.blending = { options: ['unselected'] };
    expect(api.requirements(item).entries.some(x => x.key === 'unselected')).toBe(false);
  });
  it('includes connected text lines, instructions and manipulation sounds', () => {
    const { api } = load(); const item = resource({ lessonPlanSequence: ['read_passage', 'manipulation'] });
    item.data[0].activityItems.read_passage = { story: 'A cat sat. A dog ran!', options: ['dog'] };
    item.data[0].activityItems.manipulation = { task: { instruction: 'Change the /k/ sound to /m/.' }, options: ['mat'] };
    expect(api.requirements(item).entries.map(x => x.id)).toEqual(expect.arrayContaining(['speech:a cat sat.', 'speech:a dog ran!', 'speech:read the story. which word finishes it?', 'phoneme:k', 'phoneme:m', 'speech:mat']));
  });
  it('separates phoneme, instruction, feedback, isolation and letter-name dependencies', () => {
    const { api } = load(); const item = resource({ isProbeMode: false, lessonPlanSequence: ['counting', 'isolation', 'letter_tracing'] });
    item.data[0].phonemes = ['k', 'a', 't']; item.data[0].activityItems.isolation = { position: 0, options: ['k', 'm'] };
    expect(api.requirements(item).entries.map(x => x.id)).toEqual(expect.arrayContaining(['phoneme:k', 'instruction:inst_counting', 'feedback:fb_correct', 'isolation:1st', 'letter-name:c']));
  });
  it('keeps empty, unknown and oversized requirement sets incomplete', () => {
    const { api } = load();
    expect(api.inspect(resource({ data: [] })).complete).toBe(false);
    expect(api.inspect(resource({ lessonPlanSequence: ['future-activity'] })).complete).toBe(false);
    expect(api.inspect(resource({ data: Array.from({ length: 201 }, () => ({ word: 'cat' })) })).overflow).toBe(true);
  });
  it('requires actual decoded data, not metadata or a byte signature', async () => {
    const { api } = load(); const item = resource();
    expect(api.inspect(item)).toMatchObject({ ready: 0, complete: false });
    const tracker = {}; const result = await api.check(item, { audioFactory: factory('ready', tracker) });
    expect(result).toMatchObject({ ready: 1, complete: false, offlinePortable: false });
    expect(result.dependencies).toContain('instruction: decoding');
    expect(tracker.played).toBe(0);
    expect(api.inspect(item).ready).toBe(1);
  });
  it.each(['metadata', 'zero'])('does not call %s evidence decoded', async mode => {
    vi.useFakeTimers(); const { api } = load();
    const pending = api.check(resource(), { audioFactory: factory(mode), clipTimeoutMs: 5 });
    await vi.advanceTimersByTimeAsync(6);
    expect(await pending).toMatchObject({ ready: 0, complete: false });
  });
  it.each(['damaged', 'unsupported'])('keeps %s decoder results incomplete', async mode => {
    const { api } = load(); const result = await api.check(resource(), { audioFactory: factory(mode) });
    expect(result.complete).toBe(false); expect(result.clips[0].status).toBe(mode);
  });
  it('never promotes loaded teacher bank overrides to student readiness', async () => {
    const host = { __ALLO_INSTRUCTION_AUDIO: { inst_counting: wav(), fb_correct: wav() }, __ALLO_PHONEME_AUDIO_BANK: { k: wav() } };
    const { api } = load(host); const item = resource({ isProbeMode: false, lessonPlanSequence: ['counting'] }); item.data[0].phonemes = ['k'];
    const result = await api.check(item, { audioFactory: factory() });
    expect(result).toMatchObject({ complete: false, offlinePortable: false, ready: 1 });
    expect(result.clips.find(x => x.id === 'phoneme:k')).toMatchObject({ status: 'device-only', checked: false, locallyChecked: true });
    expect(result.dependencies).toContain('instruction: inst_counting');
  });
  it('never fetches HTTPS or blob dependencies while checking', async () => {
    const { api } = load(); const item = resource(); item.data[0]._ttsAssets.cat = 'https://example.test/clip.wav';
    const tracker = {}; await api.check(item, { route: 'preview', audioFactory: factory('ready', tracker) }); expect(tracker.created).toBe(0);
    item.data[0]._ttsAssets.cat = 'blob:local-only';
    expect(await api.check(item, { route: 'preview', audioFactory: factory() })).toMatchObject({ ready: 0, complete: false, deviceOnly: 1 });
  });
  it('bounds concurrency and the whole check at 30 seconds', async () => {
    vi.useFakeTimers(); const { api } = load(); const item = resource();
    item.data[0]._ttsRequiredKeys = Array.from({ length: 40 }, (_, i) => 'word' + i);
    for (const key of item.data[0]._ttsRequiredKeys) item.data[0]._ttsAssets[key] = wav();
    const tracker = {}; const pending = api.check(item, { audioFactory: factory('wait', tracker), totalTimeoutMs: 100000, clipTimeoutMs: 100000 });
    await vi.advanceTimersByTimeAsync(30001);
    expect(await pending).toMatchObject({ complete: false, ready: 0 });
    expect(tracker.maximum).toBeLessThanOrEqual(4); expect(tracker.active).toBe(0);
  });
  it('cancels all active probes and cannot store a ready receipt afterwards', async () => {
    const { api } = load(); const item = resource(), controller = new AbortController(), tracker = {};
    const pending = api.check(item, { signal: controller.signal, audioFactory: factory('wait', tracker) }); controller.abort();
    expect(await pending).toMatchObject({ cancelled: true, complete: false }); expect(tracker.active).toBe(0); expect(api.inspect(item).ready).toBe(0);
    tracker.last.oncanplay?.(); expect(api.inspect(item).ready).toBe(0);
  });
  it.each(['word', 'voice', 'revision', 'manifest', 'bytes', 'route'])('invalidates a receipt after changing %s', async change => {
    const { api } = load(); const item = resource(); await api.check(item, { audioFactory: factory() });
    if (change === 'word') item.data[0].word = 'dog';
    if (change === 'voice') item.sessionConfig = { selectedVoice: 'different' };
    if (change === 'revision') item.revision = 2;
    if (change === 'manifest') item.data[0]._ttsRequiredKeys = ['dog'];
    if (change === 'bytes') item.data[0]._ttsAssets.cat.base64 = 'QUJDRA==';
    expect(api.inspect(item, change === 'route' ? { route: 'mailbox' } : {}).ready).toBe(0);
  });
  it('rejects a result whose resource changed during the probe', async () => {
    const { api } = load(); const item = resource(), tracker = {};
    const pending = api.check(item, { audioFactory: factory('wait', tracker) }); item.data[0].word = 'dog'; tracker.last.oncanplay();
    expect(await pending).toMatchObject({ stale: true, complete: false });
  });
  it('checks the first canonical duplicate that the delivery route actually keeps', async () => {
    const { api } = load(); const item = resource(); item.data[0]._ttsAssets = { cat: { mime: 'audio/wav', base64: 'AAAA' }, ' CAT ': wav() };
    const result = await api.check(item, { audioFactory: factory() }); expect(result.ready).toBe(0); expect(result.clips.find(x => x.id === 'speech:cat').status).toBe('invalid');
    expect(api.portable(item).data[0]._ttsAssets.cat.base64).toBe('AAAA');
  });
  it('uses the actual prioritized preloaded-word layout when both are delivered', async () => {
    const { api } = load(); const item = resource(); item.wsPreloadedWords = [{ word: 'dog', _ttsAssets: { dog: wav() } }]; item.data[0]._ttsAssets.cat.base64 = 'AAAA';
    const result = await api.check(item, { audioFactory: factory() }); expect(result.ready).toBe(1); expect(result.clips.find(x => x.id === 'speech:dog').checked).toBe(true); expect(result.clips.some(x => x.id === 'speech:cat')).toBe(false);
  });
  it('normalizes an alias-only layout without fabricating the missing data array', async () => {
    const { api } = load(); const item = resource(); item.wsPreloadedWords = item.data; delete item.data;
    expect(await api.check(item, { audioFactory: factory() })).toMatchObject({ ready: 1, complete: false }); expect(api.portable(item).data).toBeUndefined();
  });
  it('does not read inherited audio properties as portable assets', () => {
    const { api } = load(); const item = resource(); item.data[0]._ttsAssets = Object.create({ cat: wav() });
    expect(api.inspect(item).clips.find(x => x.id === 'speech:cat').status).toBe('missing');
  });
  it('validates a legitimate constructor word as its own required clip', async () => {
    const { api } = load(); const item = resource(); item.data[0].word = 'constructor'; item.data[0].activityItems.decoding.choices = ['constructor']; item.data[0]._ttsAssets = Object.create(null); item.data[0]._ttsAssets.constructor = wav();
    expect((await api.check(item, { audioFactory: factory() })).clips.find(x => x.id === 'speech:constructor')).toMatchObject({ checked: true, status: 'embedded-portable' });
  });
  it('retains receipts across the two existing builder embeddings', async () => {
    const { api, host } = load(); const item = resource(); await api.check(item, { audioFactory: factory() });
    expect(load(host).api).toBe(api); expect(host.AlloModules.WordSoundsReadiness.inspect(item).ready).toBe(1);
  });
});

describe('Word Sounds portable normalization', () => {
  it('normalizes only tool-owned data audio and leaves authored content/progress unchanged', () => {
    const { api } = load(); const item = resource(); item.progress = { correct: 3 }; item.data[0].notes = 'authored'; item.data[0]._ttsAssets.cat = 'data:audio/wav;base64,' + wav().base64;
    const before = JSON.stringify(item), packed = api.portable(item);
    expect(JSON.stringify(item)).toBe(before); expect(packed.data[0]._ttsAssets.cat).toEqual(wav()); expect(packed.progress).toBe(item.progress); expect(packed.data[0].activityItems).toBe(item.data[0].activityItems);
    expect(api.portable({ type: 'other', data: item.data })).toMatchObject({ type: 'other' });
  });
  it('preserves syntactically portable unsupported bytes while readiness rejects the claim', () => {
    const { api } = load(); const item = resource(); item.data[0]._ttsAssets = { cat: { mime: 'audio/future', base64: 'AAAA' } };
    const packed = api.portable(item); expect(packed.data[0]._ttsAssets.cat.base64).toBe('AAAA'); expect(api.inspect(packed).complete).toBe(false);
  });
  it('adds the target to an incomplete manifest and retains only bounded omission diagnostics', () => {
    const { api } = load(); const item = resource(); item.data[0]._ttsRequiredKeys = [' dog ']; item.data[0]._ttsAssets = { ' CAT ': 'blob:local', dog: wav(), unused: 'invalid' }; item.data[0]._ttsOmittedKeys = ['dog', 'older'];
    const packed = api.portable(item); expect(packed.data[0]._ttsRequiredKeys).toEqual(['cat', 'dog']); expect(packed.data[0]._ttsOmittedKeys).toEqual(['cat', 'unused', 'older']);
    expect(api.inspect(packed).omittedLabels).toContain('unused'); expect(api.requirements(packed).entries.some(x => x.key === 'unused')).toBe(false);
  });
  it('preserves legitimate constructor and prototype-like words as own properties', () => {
    const { api } = load(); const item = resource(); item.data[0].word = 'constructor'; item.data[0]._ttsAssets = JSON.parse('{"constructor":{"mime":"audio/wav","base64":"AAAA"},"__proto__":{"mime":"audio/wav","base64":"AAAA"}}');
    const packed = api.portable(item); expect(Object.getPrototypeOf(packed.data[0]._ttsAssets)).toBeNull(); expect(Object.keys(packed.data[0]._ttsAssets)).toEqual(['constructor', '__proto__']); expect(api.requirements(packed).entries.some(x => x.key === 'constructor')).toBe(true); expect({}.mime).toBeUndefined();
  });
  it('shares one honest budget across both arrays with preloaded words first', () => {
    const { api } = load(); const item = resource(); item.wsPreloadedWords = [{ word: 'dog', notes: 'teacher-authored', activityItems: { counting: { answer: 3 } }, _ttsAssets: Object.fromEntries(Array.from({ length: 512 }, (_, i) => ['word' + i, wav()])) }];
    const before = JSON.stringify(item), packed = api.portable(item); expect(Object.keys(packed.wsPreloadedWords[0]._ttsAssets)).toHaveLength(512); expect(packed.data[0]._ttsAssets).toBeUndefined(); expect(packed.data[0]._ttsOmittedKeys).toContain('cat'); expect(packed.wsPreloadedWords[0].activityItems).toBe(item.wsPreloadedWords[0].activityItems); expect(packed.wsPreloadedWords[0].notes).toBe('teacher-authored'); expect(JSON.stringify(item)).toBe(before);
  });
  it('binds secondary-layout edits even when the prioritized words stay the same', async () => {
    const { api } = load(); const item = resource(); item.wsPreloadedWords = [{ word: 'dog', _ttsAssets: { dog: wav() } }]; await api.check(item, { audioFactory: factory() }); expect(api.inspect(item).ready).toBe(1); item.data[0].activityItems.decoding.choices.push('sun'); expect(api.inspect(item).ready).toBe(0);
  });
  it('enforces the 512 item cap independently of the character budget', () => {
    const { api } = load(); const item = resource(); item.data[0]._ttsAssets = Object.fromEntries(Array.from({ length: 513 }, (_, i) => ['word' + i, { mime: 'audio/wav', base64: 'AAAA' }]));
    const packed = api.portable(item); expect(Object.keys(packed.data[0]._ttsAssets)).toHaveLength(512); expect(packed.data[0]._ttsOmittedKeys).toEqual(['word512']);
  });
  it('enforces per-clip, total-character, item and omission bounds without editing original content', () => {
    const { api } = load(); const item = resource(); const large = 'A'.repeat(512 * 1024);
    item.data[0]._ttsAssets = Object.fromEntries(Array.from({ length: 530 }, (_, i) => ['word' + i, { mime: 'audio/wav', base64: i < 13 ? large : 'AAAA' }]));
    item.data[0]._ttsAssets.cat = { mime: 'audio/wav', base64: large + 'AAAA' };
    const packed = api.portable(item); expect(Object.keys(packed.data[0]._ttsAssets)).toHaveLength(12); expect(packed.data[0]._ttsOmittedKeys.length).toBeLessThanOrEqual(512); expect(packed.data[0]._ttsRequiredKeys).toContain('cat'); expect(item.data[0]._ttsAssets.cat.base64.length).toBe(large.length + 4);
  });
});
