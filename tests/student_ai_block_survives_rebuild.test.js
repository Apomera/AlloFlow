// Found in a real browser 2026-11-05: with "hide AI" on, a host rebuild of the AI functions
// (late gemini_api_module, key-lock change, local bridge, student config event) put the real
// functions back while __alloStudentAiDisabled stayed true, and a local model answered.
// Lifts the real host functions; only their outer dependencies are stubbed.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';

const host = readFileSync('AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
const cut = (from, to) => {
  const a = host.indexOf(from);
  const b = host.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error('host marker moved: ' + (a < 0 ? from : to));
  return host.slice(a, b);
};
const guards = cut('function _makeQrStudentAiBlockedFn(label, message) {', 'function _alloClearQrStudentAiConfig(');
const bridge = cut('function _installLocalTextBridge(aiInstance, aiConfig) {', 'function _installLocalTextBridgeFromStorage() {');
const upgrade = cut('function _upgradeGeminiAPI() {', "if (typeof window !== 'undefined') window._upgradeGeminiAPI = _upgradeGeminiAPI;");
const effect = cut('  const [, setStudentAiGuardTick] = useState(0);', '  const [showClassAnalytics, setShowClassAnalytics] = useState(false);');

const build = new Function('React', 'env', `
  const { useState, useEffect } = React;
  const ALLO_QR_STUDENT_AI_OFF_KEY = 'off';
  const GEMINI_MODELS = { default: 'm' }, _isCanvasEnv = false, warnLog = () => {}, debugLog = () => {};
  const fetchWithExponentialBackoff = () => {}, optimizeImage = () => {};
  const _alloHasAnyStudentEntry = () => env.qr;
  const _isQrStudentAiDisabled = () => env.qr;
  const _readAlloAiUserConfig = () => env.config;
  const _alloStudentAiCapabilities = () => ({ vision: true, imageEdit: true, audio: true });
  const _alloEffectiveGeminiApiKey = () => '';
  const _usesLocalTextBackend = (c) => Boolean(c && c.backend && c.backend !== 'gemini');
  const _alloWrapCallGeminiForProvenance = (fn) => fn;
  const _installLocalTextBridgeFromStorage = () => _installLocalTextBridge(env.localAi, env.config);
  const _upgradeTTS = () => {};
  const callGeminiAudio = async () => 'audio';
  let callGemini = env.boot, callGeminiSingleAttempt = env.boot, callGeminiVision = env.boot, callGeminiImageEdit = env.boot;
  ${guards}
  ${bridge}
  ${upgrade}
  return {
    rebuild: _upgradeGeminiAPI,
    sync: _syncQrStudentAiAccess,
    bridge: _installLocalTextBridge,
    local: () => ({ callGemini, callGeminiSingleAttempt, callGeminiVision, callGeminiImageEdit }),
    useGuard: () => {
      const studentAiFeaturesHidden = env.hidden;
      const learnerHasNoAiBackend = !!env.noBackend;
      const studentProjectSettings = env.settings || {};
      ${effect}
    },
  };
`);

const NAMES = ['callGemini', 'callGeminiVision', 'callGeminiImageEdit', 'callGeminiAudio', '__alloStudentAiDisabled', '__alloStudentAiCapabilities', '__alloHiddenStudentAiMessage', '__alloActiveAIBackend', '__alloModelProbeFired', 'AlloModules', 'listAvailableGeminiModels', 'probeGeminiModelHealth'];
const reset = () => NAMES.forEach((n) => { delete window[n]; });
const POLICY_MESSAGE = 'AI features are turned off for students in this project.';
let unmount;

function setup(initial = {}) {
  const real = { text: vi.fn(async () => 'real-text'), vision: vi.fn(async () => 'real-vision'), imageEdit: vi.fn(async () => 'real-edit') };
  window.AlloModules = { createGeminiAPI: () => ({ callGemini: real.text, callGeminiVision: real.vision, callGeminiImageEdit: real.imageEdit }) };
  const env = { hidden: false, qr: false, config: null, settings: { hideStudentAiFeatures: true }, boot: async () => 'boot-stub', localAi: { generateText: vi.fn(async () => 'real-local') }, ...initial };
  window.callGemini = env.boot; window.callGeminiVision = env.boot; window.callGeminiImageEdit = env.boot;
  const api = build(React, env);
  function Harness() { api.useGuard(); return null; }
  const el = document.createElement('div');
  document.body.append(el);
  const root = ReactDOMClient.createRoot(el);
  const render = () => act(async () => root.render(React.createElement(Harness, { tick: Math.random() })));
  unmount = () => { act(() => root.unmount()); el.remove(); };
  return { api, env, real, render };
}

const expectBlocked = async (api, message = POLICY_MESSAGE) => {
  expect(window.__alloStudentAiDisabled).toBe(true);
  for (const name of ['callGemini', 'callGeminiVision', 'callGeminiImageEdit']) {
    expect(window[name]._alloQrBlocked, 'window.' + name).toBe(true);
    await expect(window[name]('x')).rejects.toMatchObject({ code: 'allo-qr-ai-disabled', message });
  }
  const local = api.local();
  for (const name of Object.keys(local)) expect(local[name]._alloQrBlocked, 'module-scope ' + name).toBe(true);
};

beforeEach(reset);
afterEach(() => { unmount?.(); unmount = null; reset(); });

describe('hidden student AI stays blocked when the host rebuilds its AI functions', () => {
  it('a late gemini_api_module or key-lock rebuild does not bring the real functions back', async () => {
    const { api, env, real, render } = setup();
    env.hidden = true;
    await render();
    api.rebuild();
    await expectBlocked(api);
    expect(real.text).not.toHaveBeenCalled();
  });

  it('a rebuild for a local backend does not bring the local model back', async () => {
    const { api, env, render } = setup({ config: { backend: 'ollama' } });
    env.hidden = true;
    await render();
    api.rebuild();
    await expectBlocked(api);
    expect(env.localAi.generateText).not.toHaveBeenCalled();
  });

  it('the host-level local bridge effect does not bring the local model back', async () => {
    const { api, env, render } = setup({ config: { backend: 'ollama' } });
    env.hidden = true;
    await render();
    api.bridge(env.localAi, env.config);
    await expectBlocked(api);
    expect(env.localAi.generateText).not.toHaveBeenCalled();
  });

  it('a student AI config event neither clears the flag nor unblocks', async () => {
    const { api, env, render } = setup();
    env.hidden = true;
    await render();
    api.sync();
    await expectBlocked(api);
  });

  it('a student AI config event before the Gemini module arrives keeps the flag set', async () => {
    const { api, env, render } = setup();
    env.hidden = true;
    await render();
    delete window.AlloModules;
    api.sync();
    await expectBlocked(api);
  });

  it('keeps the honest no-connection message rather than the QR one', async () => {
    const { api, env, render } = setup({ noBackend: true, settings: {} });
    env.hidden = true;
    await render();
    api.rebuild();
    await expectBlocked(api, 'AI features need an AI connection on this device.');
  });

  it('a QR-disabled student still gets the QR block', async () => {
    const { api, env, render } = setup({ qr: true });
    api.rebuild();
    env.hidden = true;
    await render();
    expect(window.callGemini._alloQrBlocked).toBe(true);
    await expect(window.callGemini('x')).rejects.toThrow(/QR activity/);
  });
});

describe('the block ends cleanly', () => {
  it('clearing the policy hands back the rebuilt functions, not the boot stubs captured earlier', async () => {
    const { api, env, real, render } = setup();
    env.hidden = true;
    await render();
    api.rebuild();
    env.hidden = false;
    await render();
    expect(window.__alloStudentAiDisabled).not.toBe(true);
    expect(window.__alloHiddenStudentAiMessage).toBeFalsy();
    await expect(window.callGemini('x')).resolves.toBe('real-text');
    expect(api.local().callGemini).toBe(real.text);
    expect(api.local().callGeminiVision).toBe(real.vision);
  });

  it('a rebuild afterwards stays real', async () => {
    const { api, env, real, render } = setup();
    env.hidden = true;
    await render();
    env.hidden = false;
    await render();
    api.rebuild();
    expect(window.callGemini).toBe(real.text);
    expect(api.local().callGemini).toBe(real.text);
  });

  it('never blocks a teacher or an unhidden student', async () => {
    const { api, real, render } = setup();
    await render();
    api.rebuild();
    expect(window.callGemini).toBe(real.text);
    expect(window.__alloStudentAiDisabled).not.toBe(true);
    expect(real.text).not.toHaveBeenCalled();
  });
});
