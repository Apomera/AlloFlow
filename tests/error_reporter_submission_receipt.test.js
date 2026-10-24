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
const description = w => element(w, 'aer-description');
const enterDescription = (w, value) => {
  const field = description(w);
  expect(field).toBeTruthy();
  field.value = value;
  field.dispatchEvent(new w.Event('input', { bubbles: true }));
  return field;
};
const sentPayload = (w, index = 0) => JSON.parse(w.fetch.mock.calls[index][1].body);

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
  it.each(['pending', 'saved', 'failed', 'timeout'])('keeps keyboard focus and dialog shortcuts after focused Send becomes disabled: %s', async outcome => {
    let finish;
    const { w, api } = boot(() => new Promise(resolve => { finish = resolve; }));
    const send = element(w, 'aer-send');
    send.focus();
    expect(w.document.activeElement).toBe(send);
    send.click();
    expect(element(w, 'aer-send').disabled).toBe(true);
    expect(w.document.activeElement).toBe(element(w, 'aer-close'));
    api.record('error', 'Synthetic event while sending');
    if (outcome === 'saved' || outcome === 'failed') {
      finish(response({ ok: outcome === 'saved', id: 'mocked-focus-receipt' }, outcome === 'saved'));
      await flush();
    } else if (outcome === 'timeout') await vi.advanceTimersByTimeAsync(20000);
    const panel = element(w, 'allo-err-panel');
    expect(panel.contains(w.document.activeElement)).toBe(true);
    expect(w.document.activeElement).toBe(element(w, 'aer-close'));
    const backwards = new w.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    w.document.activeElement.dispatchEvent(backwards);
    expect(backwards.defaultPrevented).toBe(true);
    expect(panel.contains(w.document.activeElement)).toBe(true);
    expect(w.document.activeElement.disabled).not.toBe(true);
    expect(w.document.activeElement).not.toBe(element(w, 'aer-close'));
    const forwards = new w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    w.document.activeElement.dispatchEvent(forwards);
    expect(forwards.defaultPrevented).toBe(true);
    expect(w.document.activeElement).toBe(element(w, 'aer-close'));
    w.document.activeElement.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(element(w, 'allo-err-panel')).toBeNull();
    expect(w.document.activeElement).toBe(element(w, 'trigger'));
    expect(w.fetch).toHaveBeenCalledTimes(1);
  });

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
    expect(w.document.activeElement).toBe(description(w));
    w.fetch.mockResolvedValueOnce(response({ ok: true, id: 'next-receipt' }));
    click(w, 'aer-send');
    await flush();
    expect(element(w, 'aer-receipt-id').textContent).toBe('next-receipt');
    expect(status(w)).not.toContain('bug-receipt-123');
    expect(w.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('optional error report description', () => {
  it('repairs focus after the launching dialog closes without hijacking later navigation', async () => {
    const { w, api } = boot();
    // Match browsers' animation-frame path while retaining deterministic timers.
    w.requestAnimationFrame = callback => w.setTimeout(callback, 16);
    api.openManualReport();
    element(w, 'trigger').focus();
    await vi.advanceTimersByTimeAsync(16);
    expect(w.document.activeElement).toBe(description(w));

    api.openManualReport();
    element(w, 'aer-close').focus();
    await vi.advanceTimersByTimeAsync(16);
    expect(w.document.activeElement).toBe(element(w, 'aer-close'));

    api.openManualReport();
    api.openReadAloudLog();
    element(w, 'aer-tab-tts').focus();
    await vi.advanceTimersByTimeAsync(16);
    expect(w.document.activeElement).toBe(element(w, 'aer-tab-tts'));

    api.openManualReport();
    click(w, 'aer-close');
    await vi.advanceTimersByTimeAsync(16);
    expect(element(w, 'allo-err-panel')).toBeNull();
    expect(w.document.activeElement).toBe(element(w, 'trigger'));
    expect(w.fetch).not.toHaveBeenCalled();
  });

  it('opens a manual report on Errors with zero captured errors and focuses the description', () => {
    const { w, api } = boot();
    api.clearBuffer();
    api.openReadAloudLog();
    click(w, 'aer-close');
    element(w, 'trigger').focus();
    api.openManualReport();
    expect(element(w, 'aer-tab-errors').getAttribute('aria-selected')).toBe('true');
    expect(element(w, 'aer-tab-tts').getAttribute('aria-selected')).toBe('false');
    expect(w.document.activeElement).toBe(description(w));
    expect(api.getBuffer()).toHaveLength(0);
    expect(w.fetch).not.toHaveBeenCalled();
    click(w, 'aer-close');
    expect(w.document.activeElement).toBe(element(w, 'trigger'));
  });

  it('keeps repeated manual entry open with its draft while preserving diagnostic tab and toggle behavior', () => {
    const { w, api } = boot();
    const draft = 'I expected the card to stay where I placed it.';
    enterDescription(w, draft);
    api.openReadAloudLog();
    expect(element(w, 'aer-tab-tts').getAttribute('aria-selected')).toBe('true');
    const panel = element(w, 'allo-err-panel');
    api.openManualReport();
    expect(element(w, 'allo-err-panel')).toBe(panel);
    expect(description(w).value).toBe(draft);
    expect(w.document.activeElement).toBe(description(w));
    api.openManualReport();
    expect(element(w, 'allo-err-panel')).toBe(panel);
    expect(description(w).value).toBe(draft);
    expect(w.document.activeElement).toBe(description(w));
    api.openSearchLog();
    expect(element(w, 'aer-tab-search').getAttribute('aria-selected')).toBe('true');
    api.openPanel();
    expect(element(w, 'allo-err-panel')).toBeNull();
    api.openPanel();
    expect(element(w, 'aer-tab-search').getAttribute('aria-selected')).toBe('true');
    expect(w.fetch).not.toHaveBeenCalled();
  });

  it('labels an optional bounded field and still allows a report without a description', async () => {
    const { w } = boot();
    const field = description(w);
    expect(field).toBeTruthy();
    expect(field.labels[0].textContent).toMatch(/what happened/i);
    expect(field.labels[0].textContent).toMatch(/optional/i);
    expect(field.required).toBe(false);
    expect(field.maxLength).toBe(2000);
    expect(field.readOnly).toBe(false);
    expect(field.getAttribute('aria-describedby').split(/\s+/)).toContain('aer-description-help');
    expect(element(w, 'aer-description-help').textContent.trim()).not.toBe('');
    click(w, 'aer-send');
    await flush();
    expect(sentPayload(w).what).toContain(logCanary);
    expect(sentPayload(w).what).not.toContain('== What happened? ==');
    expect(status(w)).toContain('Report saved');
  });

  it('includes a manual description in the private payload and Copy log when no errors were captured', async () => {
    const { w, api, clipboard } = boot();
    api.clearBuffer();
    const text = 'The blue button stopped responding after I changed the diagram.';
    enterDescription(w, text);
    click(w, 'aer-copy');
    await flush();
    expect(clipboard.writeText.mock.calls[0][0]).toContain(text);
    expect(clipboard.writeText.mock.calls[0][0]).toContain('No errors captured');
    expect(w.fetch).not.toHaveBeenCalled();
    click(w, 'aer-send');
    await flush();
    expect(sentPayload(w).what).toMatch(/^== What happened\? ==\n/);
    expect(sentPayload(w).what).toContain(text);
    expect(sentPayload(w).what).toContain('No errors captured');
    expect(w.fetch.mock.calls[0][0]).toMatch(/\/submitBug$/);
    expect(w.fetch.mock.calls[0][0]).not.toContain(encodeURIComponent(text));
    expect(w.open).not.toHaveBeenCalled();
  });

  it('renders drafts as text, keeps them out of storage, and redacts secrets from copied and submitted descriptions', async () => {
    const { w, api, clipboard } = boot();
    const raw = '</textarea><img id="description-injected" src=x onerror="alert(1)">\nhttps://example.test/?allo_mb=DESCRIPTION_JOIN_SECRET&token=DESCRIPTION_TOKEN_SECRET&view=normal';
    enterDescription(w, raw);
    api.record('error', 'Refresh while a description contains markup');
    expect(description(w).value).toBe(raw);
    expect(element(w, 'description-injected')).toBeNull();
    expect(w.alert).not.toHaveBeenCalled();
    const stored = Array.from({ length: w.localStorage.length }, (_, index) => w.localStorage.getItem(w.localStorage.key(index))).join('\n');
    expect(stored).not.toContain('description-injected');
    expect(stored).not.toContain('DESCRIPTION_JOIN_SECRET');
    click(w, 'aer-copy');
    await flush();
    click(w, 'aer-send');
    await flush();
    for (const output of [clipboard.writeText.mock.calls[0][0], w.fetch.mock.calls[0][1].body]) {
      expect(output).toContain('description-injected');
      expect(output).toContain('[redacted]');
      expect(output).toContain('view=normal');
      expect(output).not.toContain('DESCRIPTION_JOIN_SECRET');
      expect(output).not.toContain('DESCRIPTION_TOKEN_SECRET');
      expect(output).not.toContain('JOIN_SECRET');
    }
    expect(element(w, 'description-injected')).toBeNull();
  });

  it('bounds the draft to 2000 characters and preserves it ahead of a full diagnostic log', async () => {
    const { w, api, clipboard } = boot();
    const prefix = 'Description starts here: ';
    const bounded = prefix + 'd'.repeat(2000 - prefix.length - 1) + '!';
    expect(bounded.length).toBe(2000);
    enterDescription(w, bounded + 'DESCRIPTION_OVERFLOW_MUST_NOT_SEND');
    api.record('error', 'Long diagnostic: ' + 'L'.repeat(12000));
    expect(description(w).value).toBe(bounded);
    click(w, 'aer-copy');
    await flush();
    click(w, 'aer-send');
    await flush();
    const what = sentPayload(w).what;
    expect(what.length).toBeLessThanOrEqual(8000);
    expect(what).toContain(bounded);
    expect(what).toContain('Long diagnostic:');
    expect(what.indexOf(bounded)).toBeLessThan(what.indexOf('Long diagnostic:'));
    expect(what).not.toContain('DESCRIPTION_OVERFLOW_MUST_NOT_SEND');
    expect(clipboard.writeText.mock.calls[0][0]).toContain(bounded);
    expect(clipboard.writeText.mock.calls[0][0]).not.toContain('DESCRIPTION_OVERFLOW_MUST_NOT_SEND');
  });

  it('retains the draft across diagnostic refreshes, filters, all tabs, log clearing, and close/reopen', () => {
    const { w, api } = boot();
    const draft = 'I selected a card, then the placement menu disappeared.';
    enterDescription(w, draft);
    api.record('error', 'Diagnostic refresh');
    expect(description(w).value).toBe(draft);
    const filter = element(w, 'aer-filter');
    filter.value = 'all';
    filter.dispatchEvent(new w.Event('change', { bubbles: true }));
    expect(description(w).value).toBe(draft);
    for (const tab of ['tts', 'session', 'search']) {
      click(w, 'aer-tab-' + tab);
      click(w, 'aer-tab-errors');
      expect(description(w).value).toBe(draft);
    }
    click(w, 'aer-clear');
    expect(api.getBuffer()).toHaveLength(0);
    expect(description(w).value).toBe(draft);
    click(w, 'aer-close');
    api.openPanel('errors');
    expect(description(w).value).toBe(draft);
    expect(w.fetch).not.toHaveBeenCalled();
  });

  it.each(['rejected', 'network', 'timeout'])('retains an editable draft after %s and sends edits on deliberate retry', async outcome => {
    const fetchImpl = outcome === 'rejected' ? () => Promise.resolve(response({ ok: false }, false))
      : outcome === 'network' ? () => Promise.reject(new Error('Synthetic disconnected request'))
        : () => new Promise(() => {});
    const { w, api } = boot(fetchImpl);
    const draft = 'The original explanation of the problem.';
    enterDescription(w, draft);
    click(w, 'aer-send');
    if (outcome === 'timeout') await vi.advanceTimersByTimeAsync(20000);
    else await flush();
    expect(description(w).value).toBe(draft);
    expect(description(w).readOnly).toBe(false);
    expect(description(w).disabled).toBe(false);
    const fallback = element(w, 'aer-report-form');
    expect(fallback).toBeTruthy();
    expect(fallback.href).not.toContain('entry.');
    expect(fallback.href).not.toContain(encodeURIComponent(draft));
    api.record('error', 'An event after the failed attempt');
    click(w, 'aer-close');
    api.openPanel('errors');
    expect(description(w).value).toBe(draft);
    const revised = draft + ' It also happens after reopening.';
    enterDescription(w, revised);
    w.fetch.mockResolvedValueOnce(response({ ok: true, id: 'description-retry-receipt' }));
    click(w, 'aer-send');
    await flush();
    expect(sentPayload(w).what).toContain(draft);
    expect(sentPayload(w).what).not.toContain('It also happens');
    expect(sentPayload(w, 1).what).toContain(revised);
    expect(element(w, 'aer-receipt-id').textContent).toBe('description-retry-receipt');
    expect(w.fetch).toHaveBeenCalledTimes(2);
  });

  it('locks the pending and saved description snapshot until New report deliberately clears it', async () => {
    let resolve;
    const { w, api, clipboard } = boot(() => new Promise(done => { resolve = done; }));
    const original = 'This explanation belongs only to the first report.';
    const staleField = enterDescription(w, original);
    click(w, 'aer-send');
    expect(description(w).readOnly).toBe(true);
    expect(element(w, 'aer-send').disabled).toBe(true);
    staleField.value = 'A stale input must not change a submitted report';
    staleField.dispatchEvent(new w.Event('input', { bubbles: true }));
    api.record('error', 'New event while sending');
    click(w, 'aer-tab-tts');
    click(w, 'aer-tab-errors');
    click(w, 'aer-close');
    api.openPanel('errors');
    expect(description(w).value).toBe(original);
    expect(description(w).readOnly).toBe(true);
    expect(sentPayload(w).what).toContain(original);
    expect(sentPayload(w).what).not.toContain('A stale input');
    resolve(response({ ok: true, id: 'description-snapshot-receipt' }));
    await flush();
    expect(description(w).value).toBe(original);
    expect(description(w).readOnly).toBe(true);
    enterDescription(w, 'A saved report must remain unchanged');
    expect(description(w).value).toBe(original);
    click(w, 'aer-copy');
    await flush();
    expect(clipboard.writeText.mock.calls[0][0]).toContain(original);
    click(w, 'aer-new-report');
    expect(description(w).value).toBe('');
    expect(description(w).readOnly).toBe(false);
    expect(w.document.activeElement).toBe(description(w));
    expect(element(w, 'aer-receipt-id')).toBeNull();
    expect(element(w, 'aer-send').disabled).toBe(false);
    click(w, 'aer-copy');
    await flush();
    expect(clipboard.writeText.mock.calls[1][0]).not.toContain(original);
    expect(w.fetch).toHaveBeenCalledTimes(1);
    enterDescription(w, 'A new explanation for a different problem.');
    w.fetch.mockResolvedValueOnce(response({ ok: true, id: 'second-description-receipt' }));
    click(w, 'aer-send');
    await flush();
    expect(sentPayload(w, 1).what).toContain('A new explanation for a different problem.');
    expect(sentPayload(w, 1).what).not.toContain(original);
    expect(element(w, 'aer-receipt-id').textContent).toBe('second-description-receipt');
  });

  it('preserves the composing textarea, focus, selection direction, and scroll position when diagnostics refresh', () => {
    const { w, api } = boot();
    const draft = 'First line\nSecond line with text being edited\nThird line';
    const field = enterDescription(w, draft);
    field.focus();
    field.setSelectionRange(12, 23, 'backward');
    field.scrollTop = 24;
    field.dispatchEvent(new w.CompositionEvent('compositionstart', { bubbles: true, data: 'Synthetic composition' }));
    api.record('error', 'Background diagnostic while typing');
    expect(description(w)).toBe(field);
    expect(w.document.activeElement).toBe(field);
    expect(field.value).toBe(draft);
    expect(field.selectionStart).toBe(12);
    expect(field.selectionEnd).toBe(23);
    expect(field.selectionDirection).toBe('backward');
    expect(field.scrollTop).toBe(24);
    field.dispatchEvent(new w.CompositionEvent('compositionend', { bubbles: true, data: 'Synthetic composition' }));
    expect(element(w, 'aer-error-content').textContent).toContain('Background diagnostic while typing');
    api.record('error', 'Another refresh after composition finished');
    expect(description(w)).toBe(field);
    expect(w.document.activeElement).toBe(field);
    expect(field.value).toBe(draft);
    expect(field.selectionStart).toBe(12);
    expect(field.selectionEnd).toBe(23);
    expect(field.selectionDirection).toBe('backward');
    expect(field.scrollTop).toBe(24);
  });
});
