import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

// Send and the review checkbox looked dead while errors kept arriving: each new
// entry rebuilt the panel, so a press and its release landed on different nodes
// and the browser dropped the click. A cut URL also lengthened under redaction,
// so the first confirm falsely reported removed credentials.
const source = readFileSync(process.env.REPORTER_SOURCE || 'error_reporter_module.js', 'utf8');
const windows = [];

function boot(record) {
  const w = new JSDOM('<html><body></body></html>', {
    url: 'https://example.test/app/', runScripts: 'outside-only', virtualConsole: new VirtualConsole(),
  }).window;
  windows.push(w);
  w.setTimeout = globalThis.setTimeout;
  w.clearTimeout = globalThis.clearTimeout;
  w.fetch = vi.fn(() => new Promise(() => {}));
  w.eval(source);
  const api = w.AlloModules.ErrorReporter;
  record(api);
  api.openPanel('errors');
  return { w, api, $: id => w.document.getElementById(id) };
}
const press = (w, node, type) => node.dispatchEvent(new w.Event(type, { bubbles: true }));

afterEach(() => {
  for (const w of windows.splice(0)) w.close();
  vi.useRealTimers();
});

describe('diagnostics Send while log entries keep arriving', () => {
  it('keeps the pressed control in place until release, then catches up', async () => {
    vi.useFakeTimers();
    const { w, api, $ } = boot(a => a.record('error', 'first'));
    const checkbox = $('aer-review-confirm');
    press(w, checkbox, 'pointerdown');
    api.record('error', 'arrives mid-press');
    expect($('aer-review-confirm')).toBe(checkbox);
    expect(checkbox.isConnected).toBe(true);
    press(w, w.document, 'pointerup');
    checkbox.click();
    expect(checkbox.checked).toBe(true);
    expect($('aer-send').disabled).toBe(false);
    await vi.runAllTimersAsync();
    expect($('aer-review-confirm')).not.toBe(checkbox);
    expect($('aer-error-content').textContent).toContain('arrives mid-press');
    expect($('aer-send').disabled).toBe(false);

    const send = $('aer-send');
    press(w, send, 'pointerdown');
    api.record('error', 'arrives while Send is held');
    expect($('aer-send')).toBe(send);
    press(w, w.document, 'pointerup');
    send.click();
    expect(w.fetch).toHaveBeenCalledTimes(1);
  });

  it('confirms in one click when the 8,000-character cut lands inside a URL', () => {
    const stack = Array.from({ length: 25 }, (_, i) => `    at fn${i} (https://alloflow.org/static/js/main.abc123.js:${i + 1}:${i * 7})`).join('\n');
    const { $ } = boot(a => { for (let i = 0; i < 15; i++) a.record('error', 'Uncaught TypeError #' + i, 'main.js', 10, 2, 'Error: boom\n' + stack); });
    expect($('aer-report-what').value.length).toBeLessThanOrEqual(8000);
    $('aer-review-confirm').click();
    expect($('aer-review-confirm').checked).toBe(true);
    expect($('aer-review-notice').textContent).toBe('');
    expect($('aer-send').disabled).toBe(false);
  });
});
