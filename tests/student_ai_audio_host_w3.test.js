// Student AI-off sweep, wave 3 AUDIO-HOST lane (2026-11-04).
// Host callGeminiAudio gains a keyless-Canvas path (Canvas injects auth, as for text/vision)
// and a larger output clamp for JSON callers, without widening student access.
// fluency_module.js routes its voice analysis through that host transport instead of a raw fetch.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
// AUDIO_W3_SRC_DIR: point at a pre-fix copy (same layout) to confirm these tests fail first.
const SRC = process.env.AUDIO_W3_SRC_DIR || ROOT;
const anti = readFileSync(resolve(SRC, 'AlloFlowANTI.txt'), 'utf8');

const grabFn = (mark) => {
  const s = anti.indexOf(mark);
  expect(s, mark).toBeGreaterThan(-1);
  return anti.slice(s, anti.indexOf('\n}', s) + 2);
};
const grabAudio = () => {
  const s = anti.indexOf('const callGeminiAudio = async');
  const e = anti.indexOf('const ALLO_QR_STUDENT_AI_OFF_KEY', s);
  expect(s).toBeGreaterThan(-1);
  expect(e).toBeGreaterThan(s);
  return anti.slice(s, e);
};

function liftHost({ canvas = false, key = '', studentEntry = false, qrDisabled = false, caps = {}, win = {} } = {}) {
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }) }));
  const config = { backend: 'gemini', validation: { capabilities: caps } };
  const code = [
    `const _isCanvasEnv = ${JSON.stringify(!!canvas)};`,
    "const GEMINI_MODELS = { flash: 'gemini-test-flash', default: 'gemini-test-flash' };",
    `const _alloHasAnyStudentEntry = () => ${JSON.stringify(!!studentEntry)};`,
    `const _isQrStudentAiDisabled = () => ${JSON.stringify(!!qrDisabled)};`,
    `const _readAlloAiUserConfig = () => (${JSON.stringify(config)});`,
    `const _alloEffectiveGeminiApiKey = () => ${JSON.stringify(key)};`,
    grabFn('function _alloStudentAiCapabilities(config)'),
    grabFn('function _alloResolveGeminiAudioCapability()'),
    grabAudio(),
    'return { callGeminiAudio, resolve: _alloResolveGeminiAudioCapability };',
  ].join('\n');
  const window = { ...win };
  const out = new Function('window', 'fetch', 'console', code)(window, fetchMock, { log() {}, warn() {}, error() {} });
  const body = (n = 0) => JSON.parse(fetchMock.mock.calls[n][1].body);
  const headers = (n = 0) => fetchMock.mock.calls[n][1].headers;
  return { ...out, fetchMock, body, headers, window };
}

describe('host callGeminiAudio: keyless Gemini Canvas', () => {
  it('reports audio available in keyless Canvas and sends without a key header (Canvas injects auth)', async () => {
    const h = liftHost({ canvas: true });
    expect(h.resolve()).toEqual({ available: true, reason: 'canvas' });
    await expect(h.callGeminiAudio('transcribe', 'data:audio/webm;base64,QUJD')).resolves.toBe('{"ok":true}');
    expect(h.fetchMock).toHaveBeenCalledTimes(1);
    expect(String(h.fetchMock.mock.calls[0][0])).toMatch(/^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-test-flash:generateContent$/);
    expect(h.headers()['x-goog-api-key']).toBeUndefined();
    expect(h.body().contents[0].parts[1].inlineData).toEqual({ mimeType: 'audio/webm', data: 'QUJD' });
  });
  it('still sends the key header when a Gemini key is configured', async () => {
    const h = liftHost({ key: 'k-123' });
    await h.callGeminiAudio('p', 'QUJD', { mimeType: 'audio/wav' });
    expect(h.headers()['x-goog-api-key']).toBe('k-123');
  });
  it('outside Canvas without a key it still refuses (no fetch)', async () => {
    const h = liftHost({ canvas: false });
    expect(h.resolve()).toEqual({ available: false, reason: 'missing-gemini-key' });
    await expect(h.callGeminiAudio('p', 'QUJD')).rejects.toThrow(/not configured/);
    expect(h.fetchMock).not.toHaveBeenCalled();
  });
});

describe('host callGeminiAudio: output-token clamp', () => {
  it('keeps the 4096 ceiling for plain-text callers', async () => {
    const h = liftHost({ key: 'k' });
    await h.callGeminiAudio('p', 'QUJD', { maxOutputTokens: 50000 });
    expect(h.body().generationConfig.maxOutputTokens).toBe(4096);
    await h.callGeminiAudio('p', 'QUJD');
    expect(h.body(1).generationConfig.maxOutputTokens).toBe(4096);
  });
  it('lets JSON callers ask for more, up to the advertised maximum', async () => {
    const h = liftHost({ key: 'k' });
    expect(h.callGeminiAudio._alloJsonMaxOutputTokens).toBe(32768);
    await h.callGeminiAudio('p', 'QUJD', { responseMimeType: 'application/json', maxOutputTokens: 32768 });
    expect(h.body().generationConfig).toEqual({ maxOutputTokens: 32768, responseMimeType: 'application/json' });
    await h.callGeminiAudio('p', 'QUJD', { responseMimeType: 'application/json', maxOutputTokens: 1e9 });
    expect(h.body(1).generationConfig.maxOutputTokens).toBe(32768);
    await h.callGeminiAudio('p', 'QUJD', { responseMimeType: 'application/json', maxOutputTokens: 1024 });
    expect(h.body(2).generationConfig.maxOutputTokens).toBe(1024);
  });
});

describe('host callGeminiAudio: student policy is not widened', () => {
  const refused = async (h, reason) => {
    expect(h.resolve()).toMatchObject({ available: false, reason });
    await expect(h.callGeminiAudio('p', 'QUJD')).rejects.toThrow();
    expect(h.fetchMock).not.toHaveBeenCalled();
  };
  it('a QR/link student whose audio is not approved is refused, even in Canvas with a key', async () => {
    await refused(liftHost({ canvas: true, key: 'student-key', studentEntry: true, caps: { text: true, audio: false } }), 'student-audio-not-approved');
  });
  it('a QR/link student gets no keyless Canvas path, even with audio approved', async () => {
    await refused(liftHost({ canvas: true, studentEntry: true, caps: { text: true, audio: true } }), 'missing-gemini-key');
  });
  it('QR student AI off is refused', async () => {
    await refused(liftHost({ canvas: true, key: 'k', studentEntry: true, qrDisabled: true, caps: { audio: true } }), 'student-ai-disabled');
  });
  it('a learner whose AI the host hid (student AI off flag) is refused, keyed or Canvas', async () => {
    await refused(liftHost({ key: 'k', win: { __alloStudentAiDisabled: true } }), 'student-ai-disabled');
    await refused(liftHost({ canvas: true, win: { __alloStudentAiDisabled: true } }), 'student-ai-disabled');
  });
  it('a managed AI deployment blocks the audio route, like every non-text Gemini route', async () => {
    await refused(liftHost({ key: 'k', win: { ALLOFLOW_MANAGED_AI_POLICY: { version: 1, connections: [] } } }), 'managed-ai-blocked');
  });
  it('a refused student call carries the blocked-AI error code', async () => {
    const h = liftHost({ canvas: true, key: 'k', studentEntry: true, caps: { audio: false } });
    await expect(h.callGeminiAudio('p', 'QUJD')).rejects.toMatchObject({ code: 'allo-qr-ai-disabled' });
  });
});

function loadFluency(setup) {
  const win = { AlloModules: {}, console, setTimeout, clearTimeout, ...setup };
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"wordData":[]}' }] } }] }) }));
  win.fetch = fetchMock;
  win.window = win;
  new Function('window', 'fetch', 'console', readFileSync(resolve(SRC, 'fluency_module.js'), 'utf8'))(win, fetchMock, { log() {}, warn() {}, error() {} });
  return { win, fetchMock };
}
const newHostAudio = (impl) => Object.assign(vi.fn(impl), { _alloJsonMaxOutputTokens: 32768 });

describe('analyzeFluencyWithGemini uses the host audio transport', () => {
  it('calls host callGeminiAudio (JSON, large clamp) and makes no direct generativelanguage fetch', async () => {
    const host = newHostAudio(async () => '{"wordData":[{"word":"The","status":"correct"}],"feedback":"ok"}');
    const { win, fetchMock } = loadFluency({ callGeminiAudio: host, __alloAiUsable: (kind) => kind === 'audio' || kind === 'text' });
    const r = await win.analyzeFluencyWithGemini('QUJD', 'audio/webm', 'The cat sat.');
    expect(r).toEqual({ wordData: [{ word: 'The', status: 'correct' }], feedback: 'ok' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(host).toHaveBeenCalledTimes(1);
    const [prompt, audio, opts] = host.mock.calls[0];
    expect(prompt).toContain('REFERENCE TEXT:');
    expect(prompt).toContain('The cat sat.');
    expect(audio).toBe('QUJD');
    expect(opts).toMatchObject({ mimeType: 'audio/webm', responseMimeType: 'application/json', maxOutputTokens: 32768 });
  });
  it('a new host that says audio is not usable gets null: no host call, no raw fetch fallback', async () => {
    const host = newHostAudio(async () => '{}');
    const { win, fetchMock } = loadFluency({
      callGeminiAudio: host,
      __alloAiUsable: (kind) => kind === 'text',
      __alloResolveGeminiAudioCapability: () => ({ available: false, reason: 'missing-gemini-key' }),
      callGemini: async () => '',
    });
    expect(await win.analyzeFluencyWithGemini('QUJD', 'audio/webm', 'The cat sat.')).toBe(null);
    expect(host).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('host errors and unparseable output return null', async () => {
    const boom = loadFluency({ callGeminiAudio: newHostAudio(async () => { throw new Error('quota'); }), __alloAiUsable: () => true });
    expect(await boom.win.analyzeFluencyWithGemini('QUJD', 'audio/webm', 'x')).toBe(null);
    const junk = loadFluency({ callGeminiAudio: newHostAudio(async () => 'not json'), __alloAiUsable: () => true });
    expect(await junk.win.analyzeFluencyWithGemini('QUJD', 'audio/webm', 'x')).toBe(null);
    expect(boom.fetchMock).not.toHaveBeenCalled();
    expect(junk.fetchMock).not.toHaveBeenCalled();
  });
  it('a blocked host fn (student) never reaches the network', async () => {
    const blocked = Object.assign(async () => { throw new Error('off'); }, { _alloQrBlocked: true });
    const { win, fetchMock } = loadFluency({ callGeminiAudio: blocked, __alloAiUsable: () => false, __alloResolveGeminiAudioCapability: () => ({ available: false, reason: 'student-audio-not-approved' }) });
    expect(await win.analyzeFluencyWithGemini('QUJD', 'audio/webm', 'x')).toBe(null);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
