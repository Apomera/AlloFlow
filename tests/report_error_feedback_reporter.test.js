import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const source = readFileSync(resolve('error_reporter_module.js'), 'utf8');
function boot(history = []) {
  const dom = new JSDOM('<!doctype html><html><body><button id="trigger">Diagnostics</button></body></html>', {
    url: 'https://alloflow.example/app/', runScripts: 'outside-only', virtualConsole: new VirtualConsole(),
  });
  const w = dom.window;
  w.__alloApiFeedbackHistory = history;
  w.eval(source);
  return { w, close: () => w.close(), api: w.AlloModules.ErrorReporter };
}
const event = (w, state, overrides = {}) => w.dispatchEvent(new w.CustomEvent('alloflow:api-feedback', { detail: {
  requestId: 'gemini-1-1', operation: 'text', state, kind: 'auth', httpStatus: 401,
  message: 'The connection rejected the request. Retry after checking access.', technical: 'auth / HTTP 401', ...overrides,
} }));
const visibleBadge = w => {
  const badge = w.document.getElementById('allo-err-badge');
  return badge && badge.style.display !== 'none' ? badge.textContent : '';
};

describe('request lifecycle diagnostics', () => {
  it('retains retry diagnostics without an actionable red badge even when warnings are disabled', () => {
    const { w, api, close } = boot();
    try {
      event(w, 'pending'); event(w, 'retrying', { attempt: 1 });
      expect(api.getBuffer()).toHaveLength(1);
      expect(api.getBuffer()[0].api.attempt).toBe(1);
      expect(visibleBadge(w)).toBe('');
      api.openPanel('errors');
      const filter = w.document.getElementById('allo-err-panel').querySelector('select');
      filter.value = [...filter.options].find(option => option.textContent === 'Everything captured').value;
      filter.dispatchEvent(new w.Event('change', { bubbles: true }));
      expect(w.document.getElementById('allo-err-panel').textContent).toContain('attempt diagnostic; request retrying');
    } finally { close(); }
  });
  it('counts a terminal auth failure then retains and labels it after this request succeeds', () => {
    const { w, api, close } = boot();
    try {
      event(w, 'failed'); expect(visibleBadge(w)).toContain('1 error');
      event(w, 'succeeded'); expect(visibleBadge(w)).toBe('');
      expect(api.getBuffer()[0].message).toContain('connection rejected');
      api.openPanel('errors');
      expect(w.document.getElementById('allo-err-panel').textContent).toContain('auth / HTTP 401');
      expect(w.document.getElementById('allo-err-panel').textContent).toContain('recovered: request succeeded');
    } finally { close(); }
  });
  it('does not clear unrelated concurrent or uncaught errors after a successful request', () => {
    const { w, api, close } = boot();
    try {
      event(w, 'failed'); event(w, 'failed', { requestId: 'gemini-2-2', kind: 'quota', httpStatus: 429 });
      w.console.error('independent error'); event(w, 'succeeded');
      expect(visibleBadge(w)).toContain('2 errors');
      expect(api.getBuffer().find(row => row.api?.requestId === 'gemini-2-2').api.recovered).toBeUndefined();
    } finally { close(); }
  });
  it('cancellation resolves only its own attempt and preserves the technical log', () => {
    const { w, api, close } = boot();
    try {
      event(w, 'retrying'); event(w, 'cancelled');
      expect(api.getBuffer()[0].api.recovered).toBe('cancelled');
      expect(api.getBuffer()[0].stack).toBe('auth / HTTP 401');
      expect(visibleBadge(w)).toBe('');
    } finally { close(); }
  });
  it('replays pre-load lifecycle events coherently without leaving a stale badge', () => {
    const { w, api, close } = boot([
      { requestId: 'gemini-pre-1', state: 'failed', kind: 'auth', httpStatus: 403, message: 'Access rejected' },
      { requestId: 'gemini-pre-1', state: 'succeeded' },
      { requestId: 'gemini-pre-2', state: 'failed', kind: 'quota', httpStatus: 429, message: 'Quota exhausted' },
    ]);
    try {
      expect(api.getBuffer()).toHaveLength(2);
      expect(w.document.querySelectorAll('#allo-err-badge')).toHaveLength(1);
      expect(visibleBadge(w)).toContain('1 error');
    } finally { close(); }
  });
  it('redacts event secrets and escapes diagnostic text in the rendered panel', () => {
    const { w, api, close } = boot();
    try {
      event(w, 'failed', { message: '<img src=x onerror=alert(1)> https://x.example/?token=private-token', technical: 'https://x.example/?key=private-key' });
      api.openPanel('errors');
      const panel = w.document.getElementById('allo-err-panel');
      expect(panel.querySelector('img')).toBeNull();
      expect(panel.textContent).not.toContain('private-token');
      expect(w.localStorage.getItem('alloflow_error_log')).not.toContain('private-key');
    } finally { close(); }
  });
  it('preserves focus through live diagnostics updates and Escape returns to the opening control', () => {
    const { w, api, close } = boot();
    try {
      const trigger = w.document.getElementById('trigger'); trigger.focus(); api.openPanel('errors');
      const copy = w.document.getElementById('aer-copy'); copy.focus(); event(w, 'retrying');
      expect(w.document.activeElement.id).toBe('aer-copy');
      w.document.activeElement.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(w.document.getElementById('allo-err-panel')).toBeNull();
      expect(w.document.activeElement).toBe(trigger);
    } finally { close(); }
  });
  it('keeps keyboard Tab and Shift+Tab within the open modal', () => {
    const { w, api, close } = boot();
    try {
      api.openPanel('errors');
      const panel = w.document.getElementById('allo-err-panel');
      const controls = [...panel.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]')].filter(n => n.tabIndex >= 0 && !n.hidden && !n.closest('[hidden]'));
      const first = controls[0], last = controls.at(-1);
      first.focus(); first.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
      expect(w.document.activeElement).toBe(last);
      last.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
      expect(w.document.activeElement).toBe(first);
    } finally { close(); }
  });
});
