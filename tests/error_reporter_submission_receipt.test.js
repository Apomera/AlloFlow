import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const source = readFileSync(process.env.REPORTER_SOURCE || 'error_reporter_module.js', 'utf8');
const windows = [];
const logCanary = 'PRIVATE_DIAGNOSTIC_CANARY';
const response = (json, ok = true) => ({ ok, json: () => Promise.resolve(json) });
const flush = async () => { for (let index = 0; index < 8; index++) await Promise.resolve(); };
const element = (w, id) => w.document.getElementById(id);
const status = w => element(w, 'aer-submit-status').textContent;
const click = (w, id) => { expect(element(w, id)).toBeTruthy(); element(w, id).click(); };

function boot(fetchImpl = () => Promise.resolve(response({ ok: true, id: 'bug-receipt-123' }))) {
  vi.useFakeTimers();
  const w = new JSDOM('<html><body><button id="trigger">Diagnostics</button></body></html>', {
    url: 'https://example.test/app/?allo_mb=JOIN_SECRET', runScripts: 'outside-only', virtualConsole: new VirtualConsole(),
  }).window;
  windows.push(w);
  w.setTimeout = globalThis.setTimeout;
  w.clearTimeout = globalThis.clearTimeout;
  w.fetch = vi.fn(fetchImpl);
  w.open = vi.fn();
  w.alert = vi.fn();
  const clipboard = { writeText: vi.fn(() => Promise.resolve()) };
  Object.defineProperty(w.navigator, 'clipboard', { value: clipboard });
  w.eval(source);
  const api = w.AlloModules.ErrorReporter;
  api.record('error', logCanary);
  element(w, 'trigger').focus();
  api.openPanel('errors');
  return { w, api, clipboard };
}

afterEach(() => {
  for (const w of windows.splice(0)) w.close();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('error report submission receipts', () => {
  it('keeps a saved receipt visible, distinguishes review, and copies no private log or URL', async () => {
    const { w, api, clipboard } = boot();
    click(w, 'aer-send');
    await flush();
    expect(status(w)).toContain('Report saved');
    expect(status(w)).toContain('not that a developer has reviewed it');
    expect(element(w, 'aer-receipt-id').textContent).toBe('bug-receipt-123');
    expect(element(w, 'aer-send').disabled).toBe(true);
    expect(element(w, 'aer-submit-status').getAttribute('role')).toBe('status');
    await vi.advanceTimersByTimeAsync(60000);
    expect(element(w, 'allo-err-panel')).toBeTruthy();
    expect(element(w, 'aer-receipt-id').textContent).toBe('bug-receipt-123');

    click(w, 'aer-copy-receipt');
    await flush();
    const copied = clipboard.writeText.mock.calls[0][0];
    expect(copied).toContain('Receipt: bug-receipt-123');
    expect(copied).toContain('developer review is not confirmed');
    expect(copied).not.toContain(logCanary);
    expect(copied).not.toContain('JOIN_SECRET');
    expect(copied).not.toContain('http');
    expect(w.open).not.toHaveBeenCalled();
    expect(element(w, 'aer-report-form')).toBeNull();
    expect(w.fetch.mock.calls[0][0]).toMatch(/\/submitBug$/);
    expect(JSON.parse(w.fetch.mock.calls[0][1].body).what).toContain(logCanary);
    expect(w.fetch.mock.calls[0][1].body).not.toContain('JOIN_SECRET');

    // Incoming diagnostics rebuild the DOM without losing the saved receipt.
    api.record('error', 'Another captured event');
    expect(element(w, 'aer-send').disabled).toBe(true);
    element(w, 'aer-send').onclick();
    expect(w.fetch).toHaveBeenCalledTimes(1);
    click(w, 'aer-close');
    expect(element(w, 'allo-err-panel')).toBeNull();
    expect(w.document.activeElement).toBe(element(w, 'trigger'));
    api.openPanel('errors');
    expect(element(w, 'aer-receipt-id').textContent).toBe('bug-receipt-123');
  });

  it('prevents duplicate pending requests across refresh, tab switches, close, and reopen', async () => {
    let resolve;
    const { w, api } = boot(() => new Promise(done => { resolve = done; }));
    const staleSend = element(w, 'aer-send');
    staleSend.click();
    staleSend.onclick();
    expect(element(w, 'aer-send').disabled).toBe(true);
    expect(element(w, 'aer-send').textContent).toContain('Sending');
    api.record('error', 'Event arriving while request is pending');
    element(w, 'aer-send').onclick();
    click(w, 'aer-tab-tts');
    click(w, 'aer-tab-errors');
    expect(element(w, 'aer-send').disabled).toBe(true);
    click(w, 'aer-close');
    expect(w.fetch.mock.calls[0][1].signal.aborted).toBe(false);
    api.openPanel('errors');
    expect(element(w, 'aer-send').disabled).toBe(true);
    click(w, 'aer-close');
    resolve(response({ ok: true, id: 'closed-dialog-receipt' }));
    await flush();
    expect(element(w, 'allo-err-panel'), 'completion does not reopen a dismissed dialog').toBeNull();
    api.openPanel('errors');
    expect(element(w, 'aer-receipt-id').textContent).toBe('closed-dialog-receipt');
    expect(w.fetch).toHaveBeenCalledTimes(1);
  });

  it('states rejection honestly and offers an unsent form without logs in its URL', async () => {
    const { w } = boot(() => Promise.resolve(response({ ok: false }, false)));
    click(w, 'aer-send');
    await flush();
    expect(status(w)).toContain('Report not saved');
    expect(status(w)).toContain('Opening the form does not send your report');
    expect(status(w)).toContain('press Submit there');
    expect(element(w, 'aer-receipt-id')).toBeNull();
    expect(element(w, 'aer-send').disabled).toBe(false);
    const form = element(w, 'aer-report-form');
    expect(form.href).toMatch(/^https:\/\/docs\.google\.com\/forms\//);
    expect(form.href).not.toContain('entry.');
    expect(form.href).not.toContain(logCanary);
    expect(form.getAttribute('target')).toBe('_blank');
    expect(form.getAttribute('rel')).toContain('noopener');
    form.addEventListener('click', event => event.preventDefault());
    form.click();
    expect(status(w)).toContain('cannot confirm a submission made in that form');
    expect(w.open).not.toHaveBeenCalled();
    expect(w.fetch).toHaveBeenCalledTimes(1);
    w.fetch.mockResolvedValueOnce(response({ ok: true, id: 'retry-receipt' }));
    click(w, 'aer-send');
    await flush();
    expect(element(w, 'aer-receipt-id').textContent).toBe('retry-receipt');
    expect(element(w, 'aer-report-form')).toBeNull();
  });

  it('bounds a stalled request, aborts it, and ignores a late success', async () => {
    let resolve;
    const { w } = boot(() => new Promise(done => { resolve = done; }));
    click(w, 'aer-send');
    const signal = w.fetch.mock.calls[0][1].signal;
    await vi.advanceTimersByTimeAsync(19999);
    expect(element(w, 'aer-send').disabled).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(signal.aborted).toBe(true);
    expect(status(w)).toContain('Save not confirmed');
    expect(status(w)).toContain('timed out');
    expect(status(w)).toContain('may have reached the server');
    expect(element(w, 'aer-send').disabled).toBe(false);
    resolve(response({ ok: true, id: 'too-late-receipt' }));
    await flush();
    expect(element(w, 'aer-receipt-id')).toBeNull();
    expect(status(w)).toContain('timed out');
  });

  it('also times out a response whose JSON body never finishes', async () => {
    const { w } = boot(() => Promise.resolve({ ok: true, json: () => new Promise(() => {}) }));
    click(w, 'aer-send');
    await flush();
    await vi.advanceTimersByTimeAsync(20000);
    expect(status(w)).toContain('timed out');
    expect(element(w, 'aer-send').disabled).toBe(false);
  });

  it('marks interrupted connections unconfirmed without inventing a receipt', async () => {
    const { w } = boot(() => Promise.reject(new Error('Network disconnected')));
    click(w, 'aer-send');
    await flush();
    expect(status(w)).toContain('Save not confirmed');
    expect(status(w)).toContain('connection was interrupted');
    expect(element(w, 'aer-receipt-id')).toBeNull();
    expect(element(w, 'aer-send').disabled).toBe(false);
  });

  it('shows legacy confirmed saving without inventing a missing receipt ID', async () => {
    const { w } = boot(() => Promise.resolve(response({ ok: true })));
    click(w, 'aer-send');
    await flush();
    expect(status(w)).toContain('Report saved');
    expect(status(w)).toContain('No receipt ID was returned');
    expect(element(w, 'aer-receipt-id')).toBeNull();
    expect(element(w, 'aer-copy-receipt')).toBeNull();
    expect(element(w, 'aer-send').disabled).toBe(true);
  });

  it.each([null, { ok: 'yes', id: 'unconfirmed-id' }, {}])('does not turn a malformed acknowledgement into success: %j', async json => {
    const { w } = boot(() => Promise.resolve(response(json)));
    click(w, 'aer-send');
    await flush();
    expect(status(w)).toContain('Save not confirmed');
    expect(element(w, 'aer-receipt-id')).toBeNull();
    expect(element(w, 'aer-send').disabled).toBe(false);
  });

  it('renders a returned receipt as text and reports clipboard failure honestly', async () => {
    const receipt = '<img src=x onerror=alert(1)>';
    const { w, clipboard } = boot(() => Promise.resolve(response({ ok: true, id: receipt })));
    clipboard.writeText.mockRejectedValue(new Error('Clipboard blocked'));
    w.document.execCommand = vi.fn(() => false);
    click(w, 'aer-send');
    await flush();
    expect(element(w, 'aer-receipt-id').textContent).toBe(receipt);
    expect(element(w, 'aer-receipt-id').querySelector('img')).toBeNull();
    click(w, 'aer-copy-receipt');
    await flush();
    expect(element(w, 'aer-copy-receipt').textContent).toBe('Copy failed');
    expect(element(w, 'aer-receipt-id').textContent).toBe(receipt);
  });

  it('only begins another report after the deliberate New report action', async () => {
    const { w, api } = boot();
    click(w, 'aer-send');
    await flush();
    element(w, 'aer-send').onclick();
    expect(w.fetch).toHaveBeenCalledTimes(1);
    api.record('error', 'New issue to report');
    click(w, 'aer-new-report');
    expect(element(w, 'aer-receipt-id')).toBeNull();
    expect(element(w, 'aer-copy-receipt')).toBeNull();
    expect(status(w)).not.toContain('bug-receipt-123');
    expect(element(w, 'aer-send').disabled).toBe(false);
    expect(w.document.activeElement).toBe(element(w, 'aer-send'));
    w.fetch.mockResolvedValueOnce(response({ ok: true, id: 'next-receipt' }));
    click(w, 'aer-send');
    await flush();
    expect(element(w, 'aer-receipt-id').textContent).toBe('next-receipt');
    expect(status(w)).not.toContain('bug-receipt-123');
    expect(w.fetch).toHaveBeenCalledTimes(2);
  });
});
