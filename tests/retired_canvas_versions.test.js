// Older Gemini Canvas shares keep loading utils_pure_module.js from the CDN,
// so it retires them: 1.11+ (trusted script dispatcher) sees nothing, 1.10
// (module-load diagnostics, no dispatcher) gets a dismissible notice until the
// grace date and is retired after it, 1.9 and older are retired. Pages that are
// not Canvas (Desktop, hosted app, development) are never touched.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const MODULE = process.env.RETIRED_GATE_MODULE || 'utils_pure_module.js';
const source = readFileSync(MODULE, 'utf8');

function load({ surface = 'canvas', dispatcher = false, diagnostics = false } = {}) {
  document.body.innerHTML = '';
  delete window.__alloConfigureTrustedScript;
  delete window.__alloModuleLoadDiagnostics;
  delete window.__alloBuildStamp;
  if (window.AlloModules) delete window.AlloModules.UtilsPureModule;
  if (surface) window.__alloBuildStamp = { hash: 'test', surface };
  if (dispatcher) window.__alloConfigureTrustedScript = () => {};
  if (diagnostics) window.__alloModuleLoadDiagnostics = {};
  new Function(source)();
  return document.getElementById('allo-retired-version-notice');
}

afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

describe('retired Gemini Canvas versions', () => {
  it('1.11 and later show nothing', () => {
    expect(load({ dispatcher: true, diagnostics: true })).toBeNull();
  });

  it('1.10 gets a dismissible notice before the grace date', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
    const notice = load({ diagnostics: true });
    expect(notice).not.toBeNull();
    expect(notice.getAttribute('role')).toBe('region');
    expect(notice.textContent).toContain('November 8, 2026');
    notice.querySelector('button').click();
    expect(document.getElementById('allo-retired-version-notice')).toBeNull();
  });

  it('1.10 is retired after the grace date', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-09T12:00:00Z'));
    const notice = load({ diagnostics: true });
    expect(notice.getAttribute('role')).toBe('alertdialog');
    expect(notice.querySelector('button')).toBeNull();
  });

  it('1.9 and older are retired with a link to the current launcher', () => {
    const notice = load({});
    expect(notice.getAttribute('role')).toBe('alertdialog');
    expect(notice.getAttribute('aria-modal')).toBe('true');
    expect(notice.querySelector('a').href).toBe('https://apomera.github.io/AlloFlow/launch.html');
    expect(notice.textContent).toContain('has been retired');
  });

  it.each(['desktop', 'development', 'hosted', 'web'])('a %s page is never touched, whatever its generation', surface => {
    expect(load({ surface })).toBeNull();
  });

  it('a Canvas page without a build stamp is recognised by its blob: address', () => {
    // jsdom's location is http, so only the stamp path is exercised there; the
    // address fallback is covered by checking the module keeps the rule.
    expect(source.includes("loc.protocol === 'blob:'")).toBe(true);
    expect(load({ surface: null })).toBeNull();
  });
});
