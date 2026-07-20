// @vitest-environment jsdom
// Error Reporter — read-aloud/TTS diagnostics tab (2026-07-20).
// The reporter's red badge only appears after an error is captured, but a
// stuck read-aloud rarely throws — so the panel must be openable with ZERO
// captured errors, straight onto the TTS trace tab, from the AI backend
// settings entry point (window.__alloOpenDiagnosticsLog).
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

beforeAll(() => {
  window.__alloTtsTrace = [
    { at: Date.now(), event: 'pk:seq', detail: { idx: 0, source: 'fresh' } },
    { at: Date.now(), event: 'fetch:timeout', detail: { afterMs: 60000 } },
  ];
  const src = fs.readFileSync(path.join(ROOT, 'error_reporter_module.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(src)();
});

describe('error reporter TTS tab', () => {
  it('loads and exposes the deep-link API + global hook', () => {
    expect(window.AlloModules && window.AlloModules.ErrorReporter).toBeTruthy();
    expect(typeof window.AlloModules.ErrorReporter.openReadAloudLog).toBe('function');
    expect(typeof window.__alloOpenDiagnosticsLog).toBe('function');
  });

  it('opens the read-aloud tab with zero captured errors and renders the trace', () => {
    window.AlloModules.ErrorReporter.openReadAloudLog();
    const panel = document.getElementById('allo-err-panel');
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain('pk:seq');
    expect(panel.textContent).toContain('fetch:timeout');
    expect(document.getElementById('aer-tts-copy')).toBeTruthy();
    expect(document.getElementById('aer-tts-clear')).toBeTruthy();
  });

  it('switches between Errors and Read-aloud tabs in place', () => {
    document.getElementById('aer-tab-errors').click();
    expect(document.getElementById('aer-send')).toBeTruthy(); // errors tab footer
    document.getElementById('aer-tab-tts').click();
    expect(document.getElementById('aer-tts-copy')).toBeTruthy();
  });

  it('clear trace empties the shared ring buffer', () => {
    document.getElementById('aer-tts-clear').click();
    expect(window.__alloTtsTrace.length).toBe(0);
    const panel = document.getElementById('allo-err-panel');
    expect(panel.textContent).toContain('No read-aloud activity');
  });

  it('a tab request on an open panel switches tabs instead of toggling closed', () => {
    window.__alloOpenDiagnosticsLog('errors');
    expect(document.getElementById('allo-err-panel')).toBeTruthy();
    expect(document.getElementById('aer-send')).toBeTruthy();
  });
});
