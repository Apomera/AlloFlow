import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { beforeAll, beforeEach, afterEach, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
import { validAudioBase64 } from './lib/audio_fixtures.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, flushSync, root, node, renderHost, enumerateHost;
let env, current, history, owner, storeDB, setResource;
beforeAll(() => {
 React = require(resolve('desktop/web-app/node_modules/react'));
 ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
 ({ flushSync } = require(resolve('desktop/web-app/node_modules/react-dom')));
 act = React.act; global.IS_REACT_ACT_ENVIRONMENT = true; global.React = window.React = React;
 window.AlloIcons = new Proxy({}, { get: () => () => null });
 loadAlloModule('instructional_context_module.js'); loadAlloModule('view_simplified_module.js');
 loadAlloModule('karaoke_audio_store_module.js'); loadAlloModule('read_aloud_audio_service_source.jsx');
 let host = readFileSync(resolve('AlloFlowANTI.txt'), 'utf8');
 const slice = (start, end) => host.slice(host.indexOf(start), host.indexOf(end, host.indexOf(start)));
 const code = slice('  const _karaokePayloadSignature =', '  // Serialize karaoke MP3 work') +
  slice('  const _persistKaraokeAudioField =', '  // Regenerate (or first-generate)') +
  slice('  window.__alloReadAloudLiveHost =', '  // Lesson audio uses');
 renderHost = new Function('env', 'with (env) {' + code + '; return window.__alloGetReadAloudAudioBridge; }');
 enumerateHost = new Function('env', 'with (env) {' + slice('const getSavedResourceLanguage =', 'const getSavedReadingSentenceSegments =') + slice('  const _enumerateReadAloudResourceSegments =', '  const _encodeReadAloudBridgeAudio =') + '; return _enumerateReadAloudResourceSegments; }');
});
beforeEach(() => {
 const KS = window.AlloModules.KaraokeAudioStore; KS.current = null; KS.studentCurrent = null;
 Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:host') });
 Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
 current = { id: 'host-retained', type: 'simplified', data: 'First. Second. Third.' }; history = [current];
 owner = { sequence: 0, chain: Promise.resolve() };
 let saved = { items: [{ ...current, data: JSON.stringify(current.data), dataEncoding: 'json-text/v1' }] };
 storeDB = { get: vi.fn(async () => saved), set: vi.fn(async (_key, value) => { saved = JSON.parse(JSON.stringify(value)); return true; }) };
 const utility = readFileSync(resolve('utils_pure_source.jsx'), 'utf8');
 const writer = utility.slice(utility.indexOf('const writeVerifiedStorageSnapshot ='), utility.indexOf('// RFC 9110 Retry-After'));
 window.AlloModules.UtilsPure = { writeVerifiedStorageSnapshot: new Function(writer + '; return writeVerifiedStorageSnapshot;')() };

 env = { window, CustomEvent, AbortController, WeakMap, Set,
  _aiConfig: { ttsProvider: 'gemini', backend: 'gemini', models: { tts: 'test-model' } }, GEMINI_MODELS: { tts: 'test-model' },
  selectedVoice: 'Kore', voiceSpeed: 1, leveledTextLanguage: 'English', currentUiLanguage: 'English',
  isHistoryLoaded: true, isStorageDisabled: false, isCanvas: false, isTeacherMode: true, activeSessionCode: null,
  offlineHistoryWriteRef: { current: owner }, storageDB: storeDB,
  _ensureGlossaryReadAloudEntryIds: () => current,
  _encodeReadAloudBridgeAudio: async () => ({ b64: validAudioBase64(), mime: 'audio/wav' }),
  _synthSentenceForStore: vi.fn(async () => ({ b64: validAudioBase64(), mime: 'audio/wav' })),
  _normalizeReadAloudBridgeText: value => String(value).trim(), _notifyKaraokeAudioCapture: vi.fn(),
  _enumerateReadAloudResourceSegments: () => ['First.', 'Second.', 'Third.'].map((text, index) => ({ text, segmentId: 'body/0/' + index })),
  setHistory: update => { history = update(history); },
 };
 function Host() {
  const [resource, setter] = React.useState(current); current = resource; setResource = setter;
  renderHost({ ...env, generatedContent: resource, setGeneratedContent: setter }); return null;
 }
 node = document.createElement('div'); document.body.append(node); root = createRoot(node);
 act(() => root.render(React.createElement(Host)));
});
afterEach(() => { act(() => root.unmount()); node.remove(); delete window.__alloReadAloudLiveHost; });
it('keeps a multi-clip preparation bound to the current store through real React rerenders', async () => {
 const bridge = window.__alloGetReadAloudAudioBridge();
 let result; await act(async () => { result = await bridge.prepare(['First.', 'Second.', 'Third.']); });
 expect(result).toMatchObject({ generated: 3, remaining: 0 });
 expect(bridge.summary()).toMatchObject({ ready: 3 });
 expect(Object.keys(current.karaokeAudio.entries)).toHaveLength(3);
});
it('uses the current host after a retained bridge crosses a render', async () => {
 const bridge = window.__alloGetReadAloudAudioBridge();
 act(() => setResource({ id: 'different', type: 'simplified', data: 'First. Second. Third.' }));
 await act(async () => { await bridge.prepare(['First.']); });
 expect(Object.values(current.karaokeAudio.entries)[0].identity.spokenText).toBe('First.');
});
it('returns durable success only after an eligible exact queued device retry', async () => {
 const bridge = window.__alloGetReadAloudAudioBridge();
 await act(async () => { await bridge.prepare(['First.']); });
 let result; await act(async () => { result = await bridge.retryPersistence('reference'); });
 expect(result).toBe(true); expect(storeDB.set).toHaveBeenCalledTimes(1);
 expect((await storeDB.get()).items[0].karaokeAudio).toEqual(current.karaokeAudio);
});
it('leaves Canvas attachment unverified without writing the offline history namespace', async () => {
 env.isCanvas = true; act(() => setResource({ ...current }));
 const bridge = window.__alloGetReadAloudAudioBridge();
 await act(async () => { await bridge.prepare(['First.']); });
 expect(await bridge.retryPersistence('reference')).toBe(false); expect(storeDB.set).not.toHaveBeenCalled();
});
it('rejects a device write whose readback no longer matches', async () => {
 const bridge = window.__alloGetReadAloudAudioBridge();
 await act(async () => { await bridge.prepare(['First.']); });
 storeDB.set.mockResolvedValue(true);
 await expect(bridge.retryPersistence('reference')).rejects.toThrow('could not be verified');
});

it('uses Spanish resource narration and synthesis identity when the host interface is English', async () => {
 const api = window.AlloModules.InstructionalContext, View = window.AlloModules.SimplifiedView;
 const resource = api.createSupportedReading(api.createSourceSnapshot('El caballero llego.', { language: 'Spanish' }),
   { id: 'host-retained', sourceFamilyId: 'spanish-reading', config: { language: 'Spanish' } });
 resource.readingSupports = api.upsertReadingSupport(resource, undefined,
   { id: 'caballero', start: 3, end: 12, quote: 'caballero', text: 'un hombre noble.', kind: 'gloss', origin: 'educator' });
 const enumerate = enumerateHost({ ...env, history: [resource], getSideBySideContent: () => null, splitTextToSentences: window.AlloModules.KaraokeAudioStore.splitSentences });
 env._enumerateReadAloudResourceSegments = enumerate;
 act(() => setResource(resource));
 const line = View.spokenSupportTemplate('Spanish').split('{word}').join('caballero').split('{support}').join('un hombre noble.');
 const support = enumerate(resource).find(entry => entry.text === line);
 expect(support).toMatchObject({ text: line, language: 'Spanish', scopeId: 'main' });
 expect(line).not.toContain('Word support');
 let result; await act(async () => { result = await window.__alloGetReadAloudAudioBridge().prepare([line]); });
 expect(result).toMatchObject({ generated: 1, remaining: 0 });
 const entry = Object.values(current.karaokeAudio.entries).find(entry => entry.identity.spokenText === line);
 expect(entry.identity).toMatchObject({ spokenText: line, segmentId: support.segmentId });
 expect(entry.synthesisProfile.language).toBe('Spanish');
 expect(env._synthSentenceForStore.mock.calls.at(-1)[1].profile.language).toBe('Spanish');
});
it('does not acknowledge a retry retired by a same-ID text edit during the write', async () => {
 const bridge = window.__alloGetReadAloudAudioBridge();
 await act(async () => { await bridge.prepare(['First.']); });
 storeDB.set.mockImplementation(async () => { flushSync(() => setResource({ ...current, data: 'Edited same ID.' })); return true; });
 let result; await act(async () => { result = await bridge.retryPersistence('reference'); });
 expect(result).toBe(false);
 expect(current.data).toBe('Edited same ID.');
});
