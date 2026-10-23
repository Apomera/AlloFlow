import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { renderBugInbox } from '../catalog/cloudflare-worker/src/bug_inbox.js';

const pages = [];
const report = (id = 'receipt-1', changes = {}) => ({
  id, submitted_at: '2026-10-21T10:00:00.000Z', type: 'bug', what: 'The diagram did not load.',
  steps: 'Open a lesson.\nSelect the diagram.', browser: 'Test browser', url: 'https://example.test/lesson', ...changes,
});
const response = (reports = [], extra = {}, status = 200) => ({
  ok: status >= 200 && status < 300, status,
  json: async () => ({ ok: true, count: reports.length, reports, ...extra }),
});
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const reviewResponse = (events = []) => ({ ok: true, status: 200, json: async () => ({ ok: true, review: { events } }) });
const savedResponse = event => ({ ok: true, status: 201, json: async () => ({ ok: true, event }) });
function edit(page, id, value, event = 'input') {
  page.byId(id).value = value;
  page.byId(id).dispatchEvent(new page.window.Event(event, { bubbles: true }));
}
function submitReview(page) {
  page.byId('review-form').dispatchEvent(new page.window.Event('submit', { bubbles: true, cancelable: true }));
}

function createPage(fetch = vi.fn().mockResolvedValue(response()), reviewFetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, review: { status: 'new', updated_at: null, note_count: 0, events: [] } }) })) {
  const copy = vi.fn().mockResolvedValue(undefined);
  const dom = new JSDOM(renderBugInbox('test-nonce'), {
    url: 'https://inbox.example.test/bug-inbox', runScripts: 'dangerously',
    beforeParse(window) {
      window.fetch = (url, options) => url.startsWith('/bug-review') ? reviewFetch(url, options) : fetch(url, options);
      Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: copy } });
    },
  });
  pages.push(dom);
  const { window } = dom;
  const byId = id => window.document.getElementById(id);
  const login = async (token = 'test-token') => {
    byId('access-token').value = token;
    byId('login-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await tick();
  };
  return { dom, window, byId, login, fetch, reviewFetch, copy };
}

afterEach(() => {
  pages.splice(0).forEach(dom => dom.window.close());
  vi.useRealTimers();
});

describe('developer bug report inbox', () => {
  it('starts signed out without requests and escapes the CSP nonce attribute', () => {
    const page = createPage();
    expect(page.fetch).not.toHaveBeenCalled();
    expect(page.byId('inbox').hidden).toBe(true);
    expect(page.byId('access-token').type).toBe('password');
    const parsed = new JSDOM(renderBugInbox('nonce" onload="bad<>&'));
    expect(parsed.window.document.querySelectorAll('script')).toHaveLength(1);
    expect(parsed.window.document.querySelector('script').getAttribute('onload')).toBeNull();
    expect(parsed.window.document.querySelector('script').getAttribute('nonce')).toBe('nonce" onload="bad<>&');
    expect(parsed.window.document.querySelector('meta[http-equiv="Cache-Control"]').content).toBe('no-store');
    parsed.window.close();
  });

  it('sends the token only in authorization, clears the form, and keeps no persistent token', async () => {
    const page = createPage(vi.fn().mockResolvedValue(response([report()])));
    await page.login('private-inbox-token');
    expect(page.fetch).toHaveBeenCalledWith('/bugs', expect.objectContaining({
      method: 'GET', headers: { Authorization: 'Bearer private-inbox-token', Accept: 'application/json' },
      cache: 'no-store', credentials: 'omit', redirect: 'error',
    }));
    expect(page.byId('access-token').value).toBe('');
    expect(page.window.localStorage.length).toBe(0);
    expect(page.window.sessionStorage.length).toBe(0);
    expect(page.window.document.cookie).toBe('');
    expect(page.window.location.href).not.toContain('private-inbox-token');
    expect(page.window.document.documentElement.outerHTML).not.toContain('private-inbox-token');
    expect(page.byId('login-panel').hidden).toBe(true);
    expect(page.byId('inbox').hidden).toBe(false);
  });

  it('renders untrusted report text safely, sorts newest first, and copies the selected receipt', async () => {
    const injected = '<img src=x onerror="window.compromised=true">';
    const receipt = 'receipt-<svg onload="window.compromised=true">';
    const page = createPage(vi.fn().mockResolvedValue(response([
      report('older', { submitted_at: '2026-10-20T10:00:00Z' }),
      report(receipt, { what: injected, steps: '</dd><script>window.compromised=true</script>', url: 'javascript:alert(1)' }),
    ])));
    await page.login();
    const buttons = page.byId('report-list').querySelectorAll('button');
    expect(buttons[0].textContent).toContain(receipt);
    buttons[0].click();
    expect(page.byId('detail-what').textContent).toBe(injected);
    expect(page.byId('detail-url').textContent).toBe('javascript:alert(1)');
    expect(page.window.document.querySelector('img, svg, dd script, dd a')).toBeNull();
    expect(page.window.compromised).toBeUndefined();
    expect(page.window.document.activeElement).toBe(page.byId('detail-heading'));
    page.byId('copy-receipt').click();
    await tick();
    expect(page.copy).toHaveBeenCalledWith(receipt);
    expect(page.byId('status').textContent).toBe('Receipt copied.');
  });

  it('searches loaded reports and appends deduplicated older pages without changing credentials', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response([report()], { cursor: 'older/+cursor' }))
      .mockResolvedValueOnce(response([report(), report('receipt-2', { what: 'Keyboard navigation', submitted_at: '2026-10-19T10:00:00Z' })]));
    const page = createPage(fetch);
    await page.login();
    page.byId('load-more').click();
    await tick();
    expect(fetch.mock.calls[1][0]).toBe('/bugs?cursor=older%2F%2Bcursor');
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer test-token');
    expect(page.byId('report-count').textContent).toBe('2 reports loaded');
    expect(page.byId('load-more').hidden).toBe(true);
    page.byId('report-search').value = 'receipt-2';
    page.byId('report-search').dispatchEvent(new page.window.Event('input'));
    expect(page.byId('report-list').children).toHaveLength(1);
    expect(page.byId('report-list').textContent).toContain('Keyboard navigation');
  });

  it.each(['network', 'server', 'malformed'])('keeps loaded reports and authentication after a %s refresh failure', async failure => {
    const fetch = vi.fn().mockResolvedValueOnce(response([report()]));
    if (failure === 'network') fetch.mockRejectedValueOnce(new Error('network disconnected'));
    else if (failure === 'server') fetch.mockResolvedValueOnce(response([], {}, 503));
    else fetch.mockResolvedValueOnce(response([], { reports: null }));
    fetch.mockResolvedValueOnce(response([report()]));
    const page = createPage(fetch);
    await page.login();
    page.byId('report-list').querySelector('button').click();
    page.byId('refresh').click();
    await tick();
    expect(page.byId('inbox').hidden).toBe(false);
    expect(page.byId('detail-id').textContent).toBe('receipt-1');
    expect(page.byId('report-list').children).toHaveLength(1);
    expect(page.byId('status').textContent).toContain('still available');
    expect(page.byId('refresh').disabled).toBe(false);
    page.byId('refresh').click();
    await tick();
    expect(fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer test-token');
  });

  it('clears reports and credentials when authorization expires', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response([report()])).mockResolvedValueOnce(response([], {}, 401));
    const page = createPage(fetch);
    await page.login();
    page.byId('report-list').querySelector('button').click();
    page.byId('refresh').click();
    await tick();
    expect(page.byId('inbox').hidden).toBe(true);
    expect(page.byId('login-panel').hidden).toBe(false);
    expect(page.byId('report-list').children).toHaveLength(0);
    expect(page.byId('detail-id').textContent).toBe('');
    expect(page.byId('status').textContent).toContain('Access denied');
    page.byId('refresh').click();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('clears the page on sign-out and ignores a late in-flight response', async () => {
    let complete;
    const fetch = vi.fn().mockResolvedValueOnce(response([report()])).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    const page = createPage(fetch);
    await page.login();
    page.byId('report-list').querySelector('button').click();
    page.byId('refresh').click();
    const signal = fetch.mock.calls[1][1].signal;
    page.byId('sign-out').click();
    expect(signal.aborted).toBe(true);
    complete(response([report('late-receipt')]));
    await tick();
    expect(page.byId('inbox').hidden).toBe(true);
    expect(page.byId('detail-id').textContent).toBe('');
    expect(page.byId('report-list').textContent).toBe('');
    expect(page.byId('access-token').value).toBe('');
    expect(page.byId('status').textContent).toBe('Signed out.');
    page.byId('refresh').click();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('gives a retry path after initial failure and a manual-copy path when clipboard is denied', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response([report()]));
    const page = createPage(fetch);
    await page.login();
    expect(page.byId('login-panel').hidden).toBe(false);
    expect(page.byId('login-submit').disabled).toBe(false);
    expect(page.byId('access-token').value).toBe('');
    await page.login('retry-token');
    page.copy.mockRejectedValueOnce(new Error('denied'));
    page.byId('report-list').querySelector('button').click();
    page.byId('copy-receipt').click();
    await tick();
    expect(page.byId('status').textContent).toContain('Select and copy');
    expect(page.byId('detail-id').textContent).toBe('receipt-1');
  });

  it.each(['response', 'body'])('times out a stalled initial %s after 20 seconds and ignores a late result', async phase => {
    let complete;
    const pending = new Promise(resolve => { complete = resolve; });
    const fetch = vi.fn().mockImplementation(() => phase === 'response' ? pending : Promise.resolve({ ok: true, status: 200, json: () => pending }));
    const page = createPage(fetch);
    vi.useFakeTimers();
    page.window.setTimeout = globalThis.setTimeout;
    page.window.clearTimeout = globalThis.clearTimeout;
    page.byId('access-token').value = 'timeout-token';
    page.byId('login-form').dispatchEvent(new page.window.Event('submit', { bubbles: true, cancelable: true }));
    await vi.advanceTimersByTimeAsync(19999);
    expect(page.byId('login-submit').disabled).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    expect(page.byId('login-submit').disabled).toBe(false);
    expect(page.byId('sign-out').hidden).toBe(true);
    expect(page.byId('status').textContent).toContain('timed out');
    expect(page.window.document.activeElement).toBe(page.byId('access-token'));
    complete(phase === 'response' ? response([report('late')]) : { ok: true, reports: [report('late')] });
    await vi.advanceTimersByTimeAsync(0);
    expect(page.byId('inbox').hidden).toBe(true);
    expect(page.byId('report-list').textContent).toBe('');
    expect(page.byId('status').textContent).toContain('timed out');
    page.byId('refresh').click();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retains loaded details and authorization after refresh times out, then permits a successful retry', async () => {
    let complete;
    const fetch = vi.fn().mockResolvedValueOnce(response([report()]))
      .mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }))
      .mockResolvedValueOnce(response([report('fresh-receipt')]));
    const page = createPage(fetch);
    await page.login();
    page.byId('report-list').querySelector('button').click();
    vi.useFakeTimers();
    page.window.setTimeout = globalThis.setTimeout;
    page.window.clearTimeout = globalThis.clearTimeout;
    page.byId('refresh').click();
    await vi.advanceTimersByTimeAsync(20000);
    expect(fetch.mock.calls[1][1].signal.aborted).toBe(true);
    expect(page.byId('refresh').disabled).toBe(false);
    expect(page.byId('inbox').hidden).toBe(false);
    expect(page.byId('detail-id').textContent).toBe('receipt-1');
    expect(page.byId('status').textContent).toContain('still available');
    complete(response([report('late-receipt')]));
    await vi.advanceTimersByTimeAsync(0);
    expect(page.byId('detail-id').textContent).toBe('receipt-1');
    page.byId('refresh').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer test-token');
    expect(page.byId('report-list').textContent).toContain('fresh-receipt');
    expect(page.byId('status').textContent).toBe('Reports refreshed.');
  });

  it('filters review statuses among loaded receipts and keeps the selected detail and draft', async () => {
    const page = createPage(vi.fn().mockResolvedValue(response([
      report('new-report'), report('resolved-report', { review: { status: 'resolved', updated_at: '2026-10-22T09:00:00Z', note_count: 2 } }),
    ])));
    await page.login();
    page.byId('report-list').querySelector('button').click();
    await tick();
    edit(page, 'review-note', 'Keep this draft while filtering.');
    edit(page, 'status-filter', 'resolved', 'change');
    expect(page.byId('report-list').querySelectorAll('button')).toHaveLength(1);
    expect(page.byId('report-list').textContent).toContain('resolved-report');
    expect(page.byId('report-count').textContent).toContain('1 matching among loaded reports');
    expect(page.byId('detail-id').textContent).toBe('new-report');
    expect(page.byId('review-note').value).toBe('Keep this draft while filtering.');
  });

  it('groups only conservative timestamp/stack variations while retaining selectable receipts and meaningful error codes', async () => {
    const page = createPage(vi.fn().mockResolvedValue(response([
      report('a', { what: '2026-10-21T10:00:00Z Error 401\n    at load (https://example.test/app.js:10:20)' }),
      report('b', { what: '2026-10-22T11:00:00Z Error 401\n    at load (https://example.test/app.js:30:40)' }),
      report('c', { what: '2026-10-22T11:00:00Z Error 403\n    at load (https://example.test/app.js:30:40)' }),
      report('long', { what: 'Long diagnostic '.repeat(1200) }),
    ])));
    await page.login();
    expect(page.byId('group-reports').checked).toBe(false);
    expect(page.byId('report-list').querySelectorAll('details')).toHaveLength(0);
    page.byId('group-reports').click();
    expect(page.byId('report-list').querySelectorAll('details')).toHaveLength(1);
    expect(page.byId('report-list').querySelector('summary').textContent).toContain('2 similar reports among loaded reports');
    expect(page.byId('report-list').querySelectorAll('button')).toHaveLength(4);
    expect(Array.from(page.byId('report-list').querySelectorAll('.report-summary')).every(node => node.textContent.length <= 180)).toBe(true);
    Array.from(page.byId('report-list').querySelectorAll('button')).find(button => button.dataset.receipt === 'b').click();
    expect(page.byId('detail-id').textContent).toBe('b');
  });

  it('saves a private status/note once, preserves typing during save, and merges acknowledgements across stale reads', async () => {
    let finishSave;
    const savedNote = '<img src=x onerror="window.compromised=true"> Investigated.';
    const acknowledged = { id: 'saved-event', created_at: '2026-10-22T10:00:00.000Z', status: 'resolved', note: savedNote };
    const reviewFetch = vi.fn((url, options) => options.method === 'POST'
      ? new Promise(resolve => { finishSave = resolve; }) : Promise.resolve(reviewResponse([])));
    const page = createPage(vi.fn().mockResolvedValue(response([report()])), reviewFetch);
    await page.login();
    page.byId('report-list').querySelector('button').click();
    await tick();
    edit(page, 'review-status', 'resolved', 'change');
    edit(page, 'review-note', savedNote);
    submitReview(page);
    submitReview(page);
    expect(reviewFetch.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1);
    const [, options] = reviewFetch.mock.calls.find(([, options]) => options.method === 'POST');
    expect(options.headers.Authorization).toBe('Bearer test-token');
    expect(JSON.parse(options.body)).toEqual({ id: 'receipt-1', status: 'resolved', note: savedNote });
    expect(page.byId('save-review').disabled).toBe(true);
    edit(page, 'review-note', 'A next note typed while the save is pending.');
    finishSave(savedResponse(acknowledged));
    await tick();
    expect(page.byId('review-note').value).toBe('A next note typed while the save is pending.');
    expect(page.byId('review-summary').textContent).toContain('resolved · 1 note');
    expect(page.byId('review-history').textContent).toContain(savedNote);
    expect(page.byId('review-history').querySelector('img')).toBeNull();
    page.byId('refresh-review').click();
    await tick();
    page.byId('refresh').click();
    await tick();
    expect(page.byId('review-summary').textContent).toContain('resolved · 1 note');
    expect(page.byId('review-history').textContent).toContain(savedNote);
    expect(page.byId('review-note').value).toBe('A next note typed while the save is pending.');
    expect(page.byId('report-list').textContent).toContain('resolved');
  });

  it('retains unsaved status and note after rejection, and clears only the successfully acknowledged draft', async () => {
    const event = { id: 'event-after-retry', created_at: '2026-10-22T11:00:00Z', status: 'investigating', note: 'Reproduction steps checked.' };
    let reject = true;
    const reviewFetch = vi.fn((url, options) => {
      if (options.method !== 'POST') return Promise.resolve(reviewResponse([]));
      return reject ? Promise.reject(new Error('offline')) : Promise.resolve(savedResponse(event));
    });
    const page = createPage(vi.fn().mockResolvedValue(response([report()])), reviewFetch);
    await page.login();
    page.byId('report-list').querySelector('button').click();
    await tick();
    edit(page, 'review-note', event.note);
    edit(page, 'review-status', event.status, 'change');
    submitReview(page);
    await tick();
    expect(page.byId('review-message').textContent).toContain('Save not confirmed');
    expect(page.byId('review-note').value).toBe(event.note);
    expect(page.byId('review-status').value).toBe(event.status);
    expect(page.byId('save-review').disabled).toBe(false);
    reject = false;
    submitReview(page);
    await tick();
    expect(page.byId('review-message').textContent).toBe('Review saved.');
    expect(page.byId('review-note').value).toBe('');
    expect(page.byId('review-status').value).toBe('investigating');
  });

  it('preserves separate drafts while switching receipts and keeps an older selection during first-page refresh', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response([report('old-a'), report('old-b')], { cursor: 'older' }))
      .mockResolvedValueOnce(response([report('new-c', { submitted_at: '2026-10-22T10:00:00Z' })]));
    const page = createPage(fetch);
    await page.login();
    page.byId('report-list').querySelector('button').click();
    edit(page, 'review-note', 'Draft A');
    Array.from(page.byId('report-list').querySelectorAll('button')).find(button => button.dataset.receipt === 'old-b').click();
    edit(page, 'review-note', 'Draft B');
    Array.from(page.byId('report-list').querySelectorAll('button')).find(button => button.dataset.receipt === 'old-a').click();
    expect(page.byId('review-note').value).toBe('Draft A');
    page.byId('refresh').click();
    await tick();
    expect(page.byId('detail-id').textContent).toBe('old-a');
    expect(page.byId('review-note').value).toBe('Draft A');
    expect(page.byId('report-list').querySelectorAll('button')).toHaveLength(3);
    expect(page.byId('new-reports').textContent).toBe('1 new report received among loaded reports.');
  });

  it('never labels an older pagination result as a new arrival', async () => {
    const page = createPage(vi.fn().mockResolvedValueOnce(response([report()], { cursor: 'older' })).mockResolvedValueOnce(response([report('older-receipt')])));
    await page.login();
    page.byId('load-more').click();
    await tick();
    expect(page.byId('new-reports').textContent).toBe('');
  });

  it('refreshes only when opted in and visible, and preserves selected drafts', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response([report()])).mockResolvedValue(response([report('new-receipt', { submitted_at: '2026-10-22T10:00:00Z' })]));
    const page = createPage(fetch);
    await page.login();
    page.byId('report-list').querySelector('button').click();
    await tick();
    edit(page, 'review-note', 'Draft remains during automatic refresh.');
    vi.useFakeTimers();
    page.window.setInterval = globalThis.setInterval;
    page.window.clearInterval = globalThis.clearInterval;
    page.window.setTimeout = globalThis.setTimeout;
    page.window.clearTimeout = globalThis.clearTimeout;
    await vi.advanceTimersByTimeAsync(30000);
    expect(fetch).toHaveBeenCalledTimes(1);
    Object.defineProperty(page.window.document, 'visibilityState', { value: 'hidden', configurable: true });
    page.byId('auto-refresh').click();
    await vi.advanceTimersByTimeAsync(30000);
    expect(fetch).toHaveBeenCalledTimes(1);
    Object.defineProperty(page.window.document, 'visibilityState', { value: 'visible', configurable: true });
    await vi.advanceTimersByTimeAsync(30000);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(page.byId('detail-id').textContent).toBe('receipt-1');
    expect(page.byId('review-note').value).toBe('Draft remains during automatic refresh.');
    expect(page.byId('new-reports').textContent).toContain('1 new report received');
    page.byId('sign-out').click();
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(page.byId('review-note').value).toBe('');
  });

  it('bounds a pending review save and does not acknowledge a late result or lose its draft', async () => {
    let finishSave;
    const reviewFetch = vi.fn((url, options) => options.method === 'POST' ? new Promise(resolve => { finishSave = resolve; }) : Promise.resolve(reviewResponse([])));
    const page = createPage(vi.fn().mockResolvedValue(response([report()])), reviewFetch);
    await page.login();
    page.byId('report-list').querySelector('button').click();
    await tick();
    edit(page, 'review-note', 'Pending private note.');
    vi.useFakeTimers();
    page.window.setTimeout = globalThis.setTimeout;
    page.window.clearTimeout = globalThis.clearTimeout;
    submitReview(page);
    await vi.advanceTimersByTimeAsync(20000);
    const [, options] = reviewFetch.mock.calls.find(([, options]) => options.method === 'POST');
    expect(options.signal.aborted).toBe(true);
    expect(page.byId('review-note').value).toBe('Pending private note.');
    expect(page.byId('save-review').disabled).toBe(false);
    expect(page.byId('review-message').textContent).toContain('Save not confirmed');
    finishSave(savedResponse({ id: 'late', created_at: '2026-10-22T12:00:00Z', note: 'Pending private note.' }));
    await vi.advanceTimersByTimeAsync(0);
    expect(page.byId('review-history').textContent).not.toContain('Pending private note.');
    expect(page.byId('review-note').value).toBe('Pending private note.');
  });

  it('orders status by its actual event when a newer note arrives before a delayed status event', async () => {
    const earlierStatus = { id: 'event-a', created_at: '2026-10-22T10:00:00Z', status: 'investigating' };
    const delayedStatus = { id: 'event-b', created_at: '2026-10-22T11:00:00Z', status: 'resolved' };
    const newerNote = { id: 'event-c', created_at: '2026-10-22T12:00:00Z', note: 'A note newer than the actual status.' };
    const reviewFetch = vi.fn().mockResolvedValueOnce(reviewResponse([earlierStatus, newerNote]))
      .mockResolvedValueOnce(reviewResponse([earlierStatus, delayedStatus, newerNote]));
    const page = createPage(vi.fn().mockResolvedValue(response([report('receipt-1', { review: {
      status: 'investigating', updated_at: newerNote.created_at, note_count: 1,
      status_updated_at: earlierStatus.created_at, status_event_id: earlierStatus.id,
    } })])), reviewFetch);
    await page.login();
    page.byId('report-list').querySelector('button').click();
    await tick();
    expect(page.byId('review-status').value).toBe('investigating');
    page.byId('refresh-review').click();
    await tick();
    expect(page.byId('review-status').value).toBe('resolved');
    expect(page.byId('review-summary').textContent).toContain('resolved · 1 note');
    expect(page.byId('review-history').textContent).toContain(newerNote.note);
  });

  it('keeps the deepest older-page cursor across an overlapping head refresh and keeps exhaustion', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response([report('head')], { cursor: 'page-2' }))
      .mockResolvedValueOnce(response([report('page-two')], { cursor: 'page-3' }))
      .mockResolvedValueOnce(response([report('head')], { cursor: 'page-2' }))
      .mockResolvedValueOnce(response([report('page-three')], { cursor: null }))
      .mockResolvedValueOnce(response([report('head')], { cursor: 'page-2' }));
    const page = createPage(fetch);
    await page.login();
    page.byId('load-more').click(); await tick();
    page.byId('refresh').click(); await tick();
    page.byId('load-more').click(); await tick();
    expect(fetch.mock.calls[3][0]).toBe('/bugs?cursor=page-3');
    expect(page.byId('load-more').hidden).toBe(true);
    page.byId('refresh').click(); await tick();
    expect(page.byId('load-more').hidden).toBe(true);
  });

  it('keeps a non-overlapping burst of new reports traversable instead of skipping its gap', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response([report('old-head')], { cursor: 'old-deep-cursor' }))
      .mockResolvedValueOnce(response([report('new-head')], { cursor: 'new-head-boundary' }))
      .mockResolvedValueOnce(response([report('middle-new-report')], { cursor: 'old-head' }));
    const page = createPage(fetch);
    await page.login();
    page.byId('refresh').click(); await tick();
    page.byId('load-more').click(); await tick();
    expect(fetch.mock.calls[2][0]).toBe('/bugs?cursor=new-head-boundary');
    expect(page.byId('report-list').textContent).toContain('middle-new-report');
  });

  it('preserves a collapsed group and its keyboard focus when reports refresh', async () => {
    const page = createPage(vi.fn().mockResolvedValue(response([report('same-a'), report('same-b')])));
    await page.login();
    page.byId('group-reports').click();
    const details = page.byId('report-list').querySelector('details');
    details.open = false;
    details.querySelector('summary').focus();
    page.byId('refresh').click();
    await tick();
    const next = page.byId('report-list').querySelector('details');
    expect(next.open).toBe(false);
    expect(page.window.document.activeElement).toBe(next.querySelector('summary'));
  });

  it('does not repopulate prior-session notes when sign-out races a save acknowledgement', async () => {
    let page;
    const event = { id: 'prior-session-event', created_at: '2026-10-22T12:00:00Z', status: 'resolved', note: 'Prior private session note.' };
    const reviewFetch = vi.fn((url, options) => {
      if (options.method !== 'POST') return Promise.resolve(reviewResponse([]));
      return Promise.resolve({ ok: true, status: 201, json: () => {
        let callback = () => page.byId('sign-out').click();
        for (let i = 0; i < 5; i += 1) { const next = callback; callback = () => queueMicrotask(next); }
        callback();
        return Promise.resolve({ ok: true, event });
      } });
    });
    page = createPage(vi.fn().mockResolvedValue(response([report()])), reviewFetch);
    await page.login();
    page.byId('report-list').querySelector('button').click(); await tick();
    edit(page, 'review-status', 'resolved', 'change');
    edit(page, 'review-note', event.note);
    submitReview(page); await tick();
    expect(page.byId('inbox').hidden).toBe(true);
    await page.login('next-session-token');
    page.byId('report-list').querySelector('button').click(); await tick();
    expect(page.byId('review-summary').textContent).toContain('new · 0 notes');
    expect(page.byId('review-history').textContent).not.toContain(event.note);
    expect(page.byId('review-note').value).toBe('');
  });

  it('does not double-count a note when a list summary sees it before the POST acknowledgement', async () => {
    const event = { id: 'count-race-note', created_at: '2026-10-22T12:00:00Z', note: 'One saved note.' };
    let finishSave;
    let history = [];
    const reviewFetch = vi.fn((url, options) => options.method === 'POST' ? new Promise(resolve => { finishSave = resolve; }) : Promise.resolve(reviewResponse(history)));
    const fetch = vi.fn().mockResolvedValueOnce(response([report()])).mockResolvedValue(response([report('receipt-1', { review: {
      status: 'new', updated_at: event.created_at, status_updated_at: null, status_event_id: null, note_count: 1,
    } })]));
    const page = createPage(fetch, reviewFetch);
    await page.login();
    page.byId('report-list').querySelector('button').click(); await tick();
    edit(page, 'review-note', event.note);
    submitReview(page);
    page.byId('refresh').click(); await tick();
    finishSave(savedResponse(event)); await tick();
    expect(page.byId('review-summary').textContent).toContain('1 note');
    history = [event];
    page.byId('refresh-review').click(); await tick();
    expect(page.byId('review-summary').textContent).toContain('1 note');
    expect(page.byId('review-history').children).toHaveLength(1);
    edit(page, 'review-note', 'Another unsaved draft.');
    expect(page.byId('review-message').textContent).toBe('Unsaved review changes.');
  });

  it('clears collapsed group state across sign-out without restoring prior private grouping keys', async () => {
    const page = createPage(vi.fn().mockResolvedValue(response([report('a'), report('b')])));
    await page.login();
    page.byId('group-reports').click();
    const oldGroup = page.byId('report-list').querySelector('details');
    oldGroup.open = false;
    page.byId('sign-out').click();
    oldGroup.dispatchEvent(new page.window.Event('toggle'));
    await page.login();
    page.byId('group-reports').click();
    expect(page.byId('report-list').querySelector('details').open).toBe(true);
  });
});
