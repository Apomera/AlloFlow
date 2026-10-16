import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
import { React } from './helpers/word_sounds_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act, Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const source = readFileSync('word_sounds_setup_source.jsx', 'utf8');
const coreSource = readFileSync('word_sounds_core.js', 'utf8');
const between = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const core = new Function(coreSource + ';return createWordSoundsCore();')();
const code = transformSync(between('function WordSoundsSyllableCountReview(', 'function buildWordPracticeSelection('), {
  plugins: ['@babel/plugin-transform-react-jsx'], configFile: false, babelrc: false,
}).code;
const readClip = vi.fn();
const cleanClip = vi.fn();
const { Editor, Review, Queue } = new Function('React', 'WS_CORE', 'readWordSoundsSyllableRecording', 'cleanWordSoundsSyllableRecording', 'createWordSoundsReviewedLibrary',
  'let wordSoundsSyllableEditorPlayback = null;' + between('function wordSoundsSyllableDraftBoardIdentity(', '// Conservative, optional edits') + between('function WordSoundsSyllableRecordingEditor(', '// END WORD SOUNDS SYLLABLE RECORDING EDITOR') + code +
  ';return {Editor:WordSoundsSyllableRecordingEditor, Review:WordSoundsSyllableCountReview, Queue:WordSoundsSyllableCountQueue};')(
  React, core, (...args) => readClip(...args), (...args) => cleanClip(...args), () => ({ message: error => error.message }));
const h = React.createElement;
const translate = (_key, fallback, params = {}) => Object.entries(params).reduce((text, [key, value]) => text.replaceAll('{' + key + '}', String(value)), fallback);
const bytes = Buffer.alloc(364);
bytes.write('RIFF'); bytes.writeUInt32LE(356, 4); bytes.write('WAVE', 8); bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16);
bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(1600, 24); bytes.writeUInt32LE(3200, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(320, 40);
const asset = { mime: 'audio/wav', base64: bytes.toString('base64'), durationSeconds: 0.1, decoded: true, source: 'teacher_recording' };
const context = core.createSyllableCountAudioContext({ asset, language: 'en' });
const task = (word = 'fire', revision = 1) => core.createReviewedSyllableTask({ targetWord: word, language: 'en', revision, reviewed: true, syllables: ['fi', 're'], assets: [asset, asset] });
const needsReview = { supported: false, counts: [1, 2], status: 'needs_review' };
const previewWord = async () => ({ source: core.syllableAssetSource(asset), asset, audioContext: context });
let root, container, clips;
const button = text => [...container.querySelectorAll('button')].find(node => node.textContent === text);
const input = text => [...container.querySelectorAll('label')].find(node => node.textContent.includes(text))?.querySelector('input');
const change = (node, value) => act(async () => Simulate.change(node, { target: { value } }));
const check = (text, checked = true) => act(async () => Simulate.change(input(text), { target: { checked } }));
const click = text => act(async () => button(text).click());
const render = node => act(async () => root.render(node));
const lastClip = () => clips[clips.length - 1];
const editLabel = value => change(input('Syllable 1 label'), value);
const fullPreview = async () => {
  await click('Preview syllables in order');
  await act(async () => { lastClip().onended(); await new Promise(resolve => setTimeout(resolve, 375)); });
  await act(async () => lastClip().onended());
};
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  clips = []; readClip.mockReset().mockResolvedValue(asset); cleanClip.mockReset();
  vi.stubGlobal('Audio', class {
    constructor(source) { this.source = source; this.ended = false; clips.push(this); }
    play() { return Promise.resolve(); }
    pause() { this.paused = true; this.onpause?.(); }
  });
});
afterEach(() => {
  act(() => root.unmount()); container.remove(); vi.unstubAllGlobals();
});

describe('session-only count drafts', () => {
  it('restores numeric drafts through Previous, Next, filtering, and hiding without restoring approval', async () => {
    const props = { words: ['apple', 'fire', 'unknown'], translate, contextFor: () => context, previewWord, onSave: vi.fn(),
      resolveWord: word => word === 'apple' ? { supported: true, count: 2, counts: [2], status: 'dictionary' } : needsReview };
    await render(h(Queue, props));
    await change(container.querySelector('input[type="number"]'), '1');
    await click('Listen to whole word'); await act(async () => lastClip().onended()); await check('I checked');
    expect(button('Save reviewed count').disabled).toBe(false);
    await click('Next word'); await change(container.querySelector('input[type="number"]'), '3');
    await click('Previous word');
    expect(container.querySelector('input[type="number"]').value).toBe('1');
    expect(input('I checked').disabled).toBe(true); expect(input('I checked').checked).toBe(false);
    await check('Needs attention only', false); await click('Previous word');
    expect(container.querySelector('legend').textContent).toBe('apple');
    await check('Needs attention only');
    expect(container.querySelector('legend').textContent).toBe('fire');
    expect(container.querySelector('input[type="number"]').value).toBe('1');
    await click('Next word');
    await render(h(Queue, { ...props, isOpen: false })); expect(container.textContent).toBe('');
    await render(h(Queue, props));
    expect(container.querySelector('legend').textContent).toBe('unknown');
    expect(container.querySelector('input[type="number"]').value).toBe('3');
    expect(input('I checked').disabled).toBe(true);
  });

  it('accepts parent draft echoes without loops, keeps edits through dictionary updates, and invalidates changed context', async () => {
    let savedDraft, calls = 0;
    function Host({ audioContext = context, language = 'en', recordedTask, resolution = needsReview }) {
      const [draft, setDraft] = React.useState();
      return h(Review, { word: 'fire', language, recordedTask, resolution, audioContext, translate, previewWord, onSave: vi.fn(), draft,
        onDraftChange: next => { calls++; savedDraft = next; setDraft(next); } });
    }
    await render(h(Host)); await change(container.querySelector('input[type="number"]'), '1');
    expect(calls).toBe(1); expect(Object.keys(savedDraft).sort()).toEqual(['count', 'dirty', 'key', 'version']);
    expect(savedDraft.dirty).toBe(true);
    await render(h(Host, { resolution: { supported: true, count: 2, counts: [2], status: 'dictionary' } }));
    expect(container.querySelector('input[type="number"]').value).toBe('1'); expect(calls).toBe(1);
    await render(h(Host, { audioContext: core.createSyllableCountAudioContext({ audioSource: 'different.wav', language: 'en' }) }));
    expect(container.querySelector('input[type="number"]').value).toBe('');
    await change(container.querySelector('input[type="number"]'), '2');
    await render(h(Host, { language: 'en-GB' })); expect(container.querySelector('input[type="number"]').value).toBe('');
    await change(container.querySelector('input[type="number"]'), '1');
    await render(h(Host, { language: 'en-GB', recordedTask: task('fire', 2) }));
    expect(container.querySelector('input[type="number"]').value).toBe(''); expect(input('I checked').disabled).toBe(true);
  });

  it('keeps a rejected save draft and clears it only after a successful save', async () => {
    let draft; const onSave = vi.fn().mockReturnValue(false), onDraftChange = vi.fn(next => { draft = next; });
    await render(h(Review, { word: 'fire', language: 'en', resolution: needsReview, audioContext: context, previewWord, translate, onSave, onDraftChange }));
    await change(container.querySelector('input[type="number"]'), '1');
    await click('Listen to whole word'); await act(async () => lastClip().onended()); await check('I checked');
    await click('Save reviewed count'); expect(draft.count).toBe('1');
    const key = draft.key; onSave.mockReturnValue(true);
    await click('Save reviewed count'); expect(draft).toBeNull(); expect(onDraftChange).toHaveBeenLastCalledWith(null, key);
  });
});

describe('session-only syllable recording drafts', () => {
  it('retains labels and uploaded clips through queue navigation and Close/reopen, hiding the previous editor', async () => {
    const board = task(), original = JSON.stringify(board), store = new Map();
    const props = { words: ['fire', 'unknown'], translate, contextFor: () => context, previewWord, recordedFor: word => word === 'fire' ? board : null,
      recordingDraftStore: store, onSave: vi.fn(), onSaveRecording: vi.fn(),
      resolveWord: () => ({ ...needsReview, reason: 'count_recording_conflict', reviewedCount: 1, recordedCount: 2 }) };
    await render(h(Queue, props)); await click('Inspect or repair the syllable recording');
    await editLabel('fyre');
    await act(async () => Simulate.change(input('Upload syllable 1'), { target: { files: [new Blob(['clip'])], value: '' } }));
    await click('Next word'); expect(container.querySelector('details')).toBeNull();
    await click('Inspect or repair the syllable recording'); await editLabel('other');
    await click('Previous word'); expect(container.querySelector('details')).toBeNull();
    await click('Inspect or repair the syllable recording');
    expect(input('Syllable 1 label').value).toBe('fyre'); expect(button('Hear syllable 1').disabled).toBe(false);
    expect(input('I listened').disabled).toBe(true);
    await click('Close recording editor'); await click('Inspect or repair the syllable recording');
    expect(input('Syllable 1 label').value).toBe('fyre');
    await check('Needs attention only', false); expect(container.querySelector('details')).toBeNull();
    await click('Inspect or repair the syllable recording'); expect(input('Syllable 1 label').value).toBe('fyre');
    expect(JSON.stringify(board)).toBe(original);
    expect([...store.values()].every(value => !('heard' in value) && !('confirmed' in value))).toBe(true);
  }, 15000);

  it('restores omitted clips but not approval, and clears a draft only when a save is accepted', async () => {
    let draft; const board = task(), onSave = vi.fn().mockReturnValue(false), onDraftChange = vi.fn(next => { draft = next; });
    const props = { word: 'fire', language: 'en', board, translate, onSave, onDraftChange };
    await render(h(Editor, props));
    await change(container.querySelector('select'), '3');
    await change(input('Syllable 3 label'), 'third');
    await act(async () => Simulate.change(input('Upload syllable 3'), { target: { files: [new Blob(['third'])], value: '' } }));
    await change(container.querySelector('select'), '2');
    const storedKey = draft.key;
    await render(null); await render(h(Editor, { ...props, draft }));
    await change(container.querySelector('select'), '3');
    expect(input('Syllable 3 label').value).toBe('third'); expect(button('Hear syllable 3').disabled).toBe(false);
    expect(button('Save reviewed syllables').disabled).toBe(true);
    await change(container.querySelector('select'), '2'); await editLabel('edited');
    await fullPreview(); await check('I listened');
    await click('Save reviewed syllables'); expect(draft.units[0].label).toBe('edited');
    onSave.mockReturnValue(true); await click('Save reviewed syllables');
    expect(draft).toBeNull(); expect(onDraftChange).toHaveBeenLastCalledWith(null, storedKey);
    expect(onSave.mock.calls[1][0].syllables).toEqual(['edited', 're']);
    expect(board.syllables).toEqual(['fi', 're']);
  });

  it('does not restore a recording draft after its saved board or locale changes', async () => {
    let draft;
    const props = { word: 'fire', language: 'en', board: task(), translate, onSave: vi.fn(), onDraftChange: next => { draft = next; } };
    await render(h(Editor, props)); await editLabel('unsaved');
    await render(null); await render(h(Editor, { ...props, board: task('fire', 2), draft }));
    expect(input('Syllable 1 label').value).toBe('fi');
    await render(null); await render(h(Editor, { ...props, language: 'en-GB', draft }));
    expect(input('Syllable 1 label').value).not.toBe('unsaved');
    expect(input('I listened').disabled).toBe(true);
  });

  it('ignores a late upload after navigation and releases a late microphone stream after unmount', async () => {
    let finishUpload, finishMicrophone; const onDraftChange = vi.fn(), stopTrack = vi.fn();
    readClip.mockImplementationOnce(() => new Promise(resolve => { finishUpload = resolve; }));
    const props = { word: 'fire', language: 'en', board: task(), translate, onSave: vi.fn(), onDraftChange };
    await render(h(Editor, props));
    await act(async () => Simulate.change(input('Upload syllable 1'), { target: { files: [new Blob(['late'])], value: '' } }));
    await render(h(Editor, { ...props, word: 'another', board: null }));
    await act(async () => finishUpload(asset));
    expect(onDraftChange).not.toHaveBeenCalled(); expect(button('Hear syllable 1').disabled).toBe(true);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: () => new Promise(resolve => { finishMicrophone = resolve; }) } });
    const recorder = vi.fn(); vi.stubGlobal('MediaRecorder', recorder);
    await render(h(Editor, props)); await click('Record syllable 1'); await render(null);
    await act(async () => finishMicrophone({ getTracks: () => [{ stop: stopTrack }] }));
    expect(stopTrack).toHaveBeenCalledTimes(1); expect(recorder).not.toHaveBeenCalled(); expect(onDraftChange).not.toHaveBeenCalled();
  });

  it('stops active microphone capture on collapse without replacing a checked clip', async () => {
    const stopTrack = vi.fn(), onDraftChange = vi.fn(); let recorder;
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop: stopTrack }] }) } });
    vi.stubGlobal('MediaRecorder', class {
      constructor() { recorder = this; this.state = 'inactive'; }
      start() { this.state = 'recording'; }
      stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['partial']) }); this.onstop?.(); }
    });
    await render(h(Editor, { word: 'fire', language: 'en', board: task(), translate, onSave: vi.fn(), onDraftChange }));
    const details = container.querySelector('details');
    await act(async () => { details.open = true; Simulate.toggle(details, { target: details, currentTarget: details }); });
    await click('Record syllable 1'); expect(recorder.state).toBe('recording');
    await act(async () => { details.open = false; Simulate.toggle(details, { target: details, currentTarget: details }); });
    expect(recorder.state).toBe('inactive'); expect(stopTrack).toHaveBeenCalled();
    expect(readClip).not.toHaveBeenCalled(); expect(onDraftChange).not.toHaveBeenCalled();
    expect(button('Hear syllable 1').disabled).toBe(false); expect(input('I listened').disabled).toBe(true);
  });
});
