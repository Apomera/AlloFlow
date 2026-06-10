// Integration tests for the 2026-06-09 auth-error UX fix (gemini_api): a single/transient 401 must
// NOT raise the alarming auth banner (it's usually a brief rate-limit, esp. in Canvas where the key
// is auto-injected); the banner only appears after several CONSECUTIVE auth failures, and ANY
// success clears it + shows a "responding again" recovery note. Also: the auth message is
// Canvas-aware (no "regenerate your key" advice in Canvas) and jargon-light.
//
// Drives the REAL built module (gemini_api_module.js) in jsdom (window/document available) with a
// stubbed fetch, exercising callGemini end-to-end through _classifyGeminiError -> _showQuotaBanner /
// _noteApiSuccess.
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MOD = fs.readFileSync(path.resolve(__dirname, '../gemini_api_module.js'), 'utf8');
const GEMINI_MODELS = { default: 'm', fallback: 'm', vision: 'm', flash: 'm', image: 'm' };

function makeApi(isCanvas, fetchRef) {
  delete window.AlloModules;
  // eslint-disable-next-line no-eval
  (0, eval)(MOD); // registers window.AlloModules.createGeminiAPI
  return window.AlloModules.createGeminiAPI({
    apiKey: 'k', _isCanvasEnv: isCanvas, GEMINI_MODELS,
    fetchWithExponentialBackoff: (...a) => fetchRef.fn(...a),
    optimizeImage: async (u) => u, warnLog: () => {}, debugLog: () => {}, getAbortSignal: () => null,
  });
}
const auth401 = () => { const e = new Error('401 Unauthorized: API authentication failed.'); e.isFatal = true; e.isAuth = true; throw e; };
// callGemini reads the body as TEXT first (empty/truncated-body hardening,
// 2026-06-10) — real fetch Responses always have .text(); the mock must too.
const okResp = () => {
  const payload = { candidates: [{ content: { parts: [{ text: 'hello world' }] } }] };
  return { ok: true, json: async () => payload, text: async () => JSON.stringify(payload) };
};
const banner = () => document.getElementById('alloflow-quota-banner');
async function failOnce(api) { try { await api.callGemini('x'); } catch (_) { /* expected reject */ } }

beforeEach(() => {
  const b = banner(); if (b) b.remove();
  try { window.sessionStorage && window.sessionStorage.removeItem('__alloflowQuotaBannerDismissed'); } catch (_) {}
  window.__alloflowQuotaState = undefined;
});

describe('auth message is Canvas-aware + jargon-light', () => {
  it('Canvas: frames a 401 as a transient hiccup, NOT "regenerate your key"', () => {
    const api = makeApi(true, { fn: okResp });
    const cls = api._classifyGeminiError(new Error('401 Unauthorized'));
    expect(cls.kind).toBe('auth');
    expect(cls.userMessage).toMatch(/manages the AI key|clears on its own|brief rate-limit/i);
    expect(cls.userMessage).not.toMatch(/regenerat/i); // wrong advice in Canvas
  });
  it('non-Canvas: still mentions the key (a 401 there usually IS a key problem)', () => {
    const api = makeApi(false, { fn: okResp });
    const cls = api._classifyGeminiError(new Error('401 Unauthorized'));
    expect(cls.userMessage).toMatch(/key/i);
  });
});

describe('auth banner debounce + recovery', () => {
  it('stays silent for the first couple of 401s, then shows the banner', async () => {
    const ref = { fn: auth401 };
    const api = makeApi(true, ref);
    await failOnce(api);
    expect(banner(), 'no banner after 1 transient 401').toBeNull();
    await failOnce(api);
    expect(banner(), 'no banner after 2').toBeNull();
    await failOnce(api);
    expect(banner(), 'banner appears once auth failures are sustained (>=3)').toBeTruthy();
    expect(window.__alloflowQuotaState && window.__alloflowQuotaState.active).toBe(true);
  });

  it('a success after the banner shows clears it + flips to a recovery note', async () => {
    const ref = { fn: auth401 };
    const api = makeApi(true, ref);
    await failOnce(api); await failOnce(api); await failOnce(api);
    expect(banner()).toBeTruthy();
    ref.fn = okResp; // the 401 resolves
    const out = await api.callGemini('x');
    expect(out).toBe('hello world');
    expect(window.__alloflowQuotaState.active, 'recovery clears the active state').toBe(false);
    const b = banner();
    if (b) expect((b.textContent || '')).toMatch(/responding again/i); // green recovery note (auto-removes after a few s)
  });

  it('a single 401 followed by a success never alarms the user', async () => {
    const ref = { fn: auth401 };
    const api = makeApi(true, ref);
    await failOnce(api);                 // one transient 401
    ref.fn = okResp;
    await api.callGemini('x');           // immediately succeeds
    expect(banner(), 'a lone transient 401 should never raise the banner').toBeNull();
  });
});
