import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { sliceTopLevelBlock } from './helpers/host_source.js';
import { createRealDaWorkspaceFixture } from './helpers/dynamic_assessment_workspace_fixture.js';
const require = createRequire(import.meta.url), React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const canary = 'SYNTHETIC PRIVATE STUDENT CUSTOM PROMPT';
const source = readFileSync('dynamic_assessment_module.js', 'utf8');
const playerSource = sliceTopLevelBlock(readFileSync('AlloFlowANTI.txt', 'utf8'), "if (typeof window !== 'undefined' && !window.AlloSpeechPlayer)", { file: 'AlloFlowANTI.txt' });
const active = []; let realWorkspaceApi;
beforeAll(() => { globalThis.React = window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true; loadAlloModule('sensitive_workspace_module.js'); realWorkspaceApi = window.AlloModules.SensitiveWorkspace; loadAlloModule('identifier_redaction_module.js'); loadAlloModule('dynamic_assessment_module.js'); });
afterEach(async () => {
  for (const h of active.splice(0)) { if (h.root) await React.act(async () => h.root.unmount()); h.player.stop(); h.fixture.dispose(); h.node.remove(); }
  delete window.AlloSpeechPlayer; delete window.__alloIsGlobalMuted; delete window.__alloPlaybackRate; delete window.__alloVoiceVolume;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
async function fixture(options = {}) {
  window.AlloModules.SensitiveWorkspace = realWorkspaceApi;
  let complete;
  const callTTS = vi.fn(() => new Promise(resolve => { complete = resolve; }));
  const localVoice = { voiceURI: 'synthetic-local-en', name: 'Synthetic local voice', lang: 'en-US', localService: true };
  const spoken = [], speak = vi.fn(utterance => { spoken.push(utterance); }), cancel = vi.fn(), getVoices = vi.fn(() => options.voices || [localVoice]);
  class Utterance { constructor(text) { this.text = text; } }
  vi.stubGlobal('speechSynthesis', { speak, cancel, getVoices }); vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  const player = new Function('window', 'CustomEvent', 'Audio', 'SpeechSynthesisUtterance', 'AbortController', 'isGlobalMuted', 'callTTS', playerSource + '\nreturn window.AlloSpeechPlayer;')(window, window.CustomEvent, class {}, Utterance, AbortController, () => false, callTTS);
  const f = await createRealDaWorkspaceFixture(React, { policy: { version: 1, allowExternalAi: [] } });
  window.AlloModules.SensitiveWorkspace = { ...f.realApi, Boundary: props => React.createElement(f.realApi.Boundary, { ...props, service: f.service }) };
  const item = { id: 'synthetic-private-item', domain: 'custom', construct: 'Synthetic task', difficulty: 'easy', gradeBand: 'K-2', prompt: canary, correctAnswer: '4', promptLadder: [{ level: 1, type: 'cue', text: 'Synthetic hint' }] };
  const session = { id: 'synthetic-session', studentNickname: 'Synthetic Otter', domain: 'custom', difficulty: 'easy', mode: 'clinician', isCustomBank: true, customBankSnapshot: [item], dateStarted: '2026-10-26T10:00:00.000Z', sessionItemIds: [item.id], currentPhase: 'pretest', currentItemIdx: 0, itemResults: [], currentLadderLevel: 0 };
  f.session.storage.setItem('alloflow_dynamic_assessment_v1', JSON.stringify({ sessions: [], activeSession: session, onboardingSeen: true, savedProbeTemplates: [] }));
  const node = document.createElement('div'); document.body.appendChild(node); const root = createRoot(node), onClose = vi.fn();
  let props = { React, onClose, addToast() {}, outputLanguage: options.language || 'English' };
  const h = { node, root, player, fixture: f, callTTS, speak, cancel, getVoices, spoken, localVoice, onClose,
    complete: () => complete('blob:synthetic-speech'),
    async render(next = {}) { props = { ...props, ...next }; await React.act(async () => root.render(React.createElement(window.AlloModules.DynamicAssessment, props))); },
    async read() { const button = node.querySelector('button[aria-label="Read this item aloud"]'); expect(button).toBeTruthy(); await React.act(async () => button.click()); }
  }; active.push(h); await h.render(); return h;
}
describe('protected DA on-device read-aloud', () => {
  it('uses an explicitly local voice with clinical AI disabled and keeps text out of the shared player', async () => {
    const h = await fixture(); expect(() => h.fixture.session.assertCanTransmit()).toThrow();
    window.__alloPlaybackRate = 1.4; window.__alloVoiceVolume = 0.35; await h.read();
    expect(h.speak).toHaveBeenCalledOnce(); expect(h.spoken[0]).toMatchObject({ text: canary, voice: h.localVoice, lang: 'en-US', rate: 1.4, volume: 0.35 });
    expect(h.callTTS).not.toHaveBeenCalled(); expect(h.player.getCurrentText()).toBeNull();
  });
  it.each([
    ['remote-only', [{ lang: 'en-US', localService: false }]],
    ['truthy local flag', [{ lang: 'en-US', localService: 'true' }]],
    ['wrong language', [{ lang: 'fr-FR', localService: true }]],
    ['missing voice', []]
  ])('refuses %s voices with a visible reason and no fallback', async (_label, voices) => {
    const h = await fixture({ voices }); await h.read();
    expect(h.speak).not.toHaveBeenCalled(); expect(h.callTTS).not.toHaveBeenCalled(); expect(h.node.textContent).toContain('No on-device voice is available for this language.');
  });
  it('does not substitute another dialect for an explicitly requested locale', async () => {
    const h = await fixture({ language: 'fr-CA', voices: [{ lang: 'fr-FR', localService: true }] }); await h.read(); expect(h.speak).not.toHaveBeenCalled();
    h.getVoices.mockReturnValue([{ lang: 'fr-CA', localService: true }]); await h.read(); expect(h.spoken[0].lang).toBe('fr-CA');
  });
  it('does not treat an unknown language as English', async () => {
    const h = await fixture({ language: 'Synthetic unknown language' }); await h.read(); expect(h.speak).not.toHaveBeenCalled(); expect(h.callTTS).not.toHaveBeenCalled();
  });
  it('waits for a fresh user action when local voices become available', async () => {
    const h = await fixture({ voices: [] }); await h.read(); h.getVoices.mockReturnValue([h.localVoice]);
    window.dispatchEvent(new Event('voiceschanged')); expect(h.speak).not.toHaveBeenCalled(); await h.read(); expect(h.speak).toHaveBeenCalledOnce();
  });
  it.each(['lock', 'unmount', 'pause', 'case'])('cancels owned speech and clears its retained utterance on %s', async transition => {
    const h = await fixture(); await h.read(); const utterance = h.spoken[0], lateStart = utterance.onstart;
    if (transition === 'lock') await React.act(async () => h.fixture.service.lock('synthetic-speech-audit'));
    else if (transition === 'unmount') { await React.act(async () => h.root.unmount()); h.root = null; }
    else if (transition === 'pause') await React.act(async () => h.node.querySelector('button[aria-label="Pause this session — return to start screen, session preserved"]').click());
    else await h.render({ studentNickname: 'Synthetic Beaver' });
    expect(h.cancel).toHaveBeenCalledOnce(); expect(utterance.text).toBe(''); expect(utterance.onstart).toBeNull(); lateStart();
    expect(h.speak).toHaveBeenCalledOnce(); expect(h.callTTS).not.toHaveBeenCalled(); expect(h.player.getCurrentText()).toBeNull();
  });
  it('stops on mute and blocks new utterances while muted', async () => {
    const h = await fixture(); await h.read(); window.__alloIsGlobalMuted = () => true;
    window.dispatchEvent(new CustomEvent('alloflow-mute-changed', { detail: { muted: true } })); expect(h.cancel).toHaveBeenCalledOnce(); expect(h.spoken[0].text).toBe('');
    await h.read(); expect(h.speak).toHaveBeenCalledOnce(); expect(h.node.textContent).toContain('Read-aloud is muted.');
  });
  it('does not call a remote fallback when a local utterance errors', async () => {
    const h = await fixture(); await h.read(); await React.act(async () => h.spoken[0].onerror({ error: 'synthesis-failed' }));
    expect(h.spoken[0].text).toBe(''); expect(h.callTTS).not.toHaveBeenCalled(); expect(h.node.textContent).toContain('No cloud voice was used.');
  });
  it('does not cancel or clear unrelated shared speech when DA owns no utterance', async () => {
    const h = await fixture(); h.player.speak('SYNTHETIC ORDINARY LESSON'); const signal = h.callTTS.mock.calls[0][3].signal;
    await React.act(async () => h.root.unmount()); h.root = null;
    expect(h.cancel).not.toHaveBeenCalled(); expect(signal.aborted).toBe(false); expect(h.player.getCurrentText()).toBe('SYNTHETIC ORDINARY LESSON');
  });
  it('reports missing browser speech APIs without calling the shared player', async () => {
    const h = await fixture(); vi.stubGlobal('SpeechSynthesisUtterance', undefined); await h.read();
    expect(h.speak).not.toHaveBeenCalled(); expect(h.callTTS).not.toHaveBeenCalled(); expect(h.node.textContent).toContain('On-device read-aloud is unavailable in this browser.');
  });
  it('fails closed if the browser does not retain the explicitly selected local voice', async () => {
    const h = await fixture();
    vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(text) { this.text = text; } set voice(_value) {} get voice() { return { localService: false, lang: 'en-US' }; } });
    await h.read(); expect(h.speak).not.toHaveBeenCalled(); expect(h.callTTS).not.toHaveBeenCalled(); expect(h.node.textContent).toContain('No cloud voice was used.');
  });
});

describe('local speech adapter operation checks', () => {
  it('rejects stale callbacks and stops a queued utterance when its context changes before start', () => {
    const start = source.indexOf('  function daCreateLocalReadAloud('), end = source.indexOf('  // ── Host theme detection', start);
    const create = new Function(source.slice(start, end) + '\nreturn daCreateLocalReadAloud;')();
    let epoch = 1; const speak = vi.fn(), cancel = vi.fn();
    const host = { speechSynthesis: { speak, cancel, getVoices: () => [{ localService: true, lang: 'en-US' }] }, SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } } };
    const adapter = create(host, { capture: () => { const captured = epoch; return () => { if (epoch !== captured) throw new Error('stale'); }; }, notice: vi.fn() });
    expect(adapter.speak(canary, 'en')).toBe(true); const utterance = speak.mock.calls[0][0]; epoch++; utterance.onstart();
    expect(cancel).toHaveBeenCalledOnce(); expect(utterance.text).toBe(''); adapter.dispose(); expect(adapter.speak(canary, 'en')).toBe(false); expect(speak).toHaveBeenCalledOnce();
  });
});
