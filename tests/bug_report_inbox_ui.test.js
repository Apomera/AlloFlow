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

function createPage(fetch = vi.fn().mockResolvedValue(response())) {
  const copy = vi.fn().mockResolvedValue(undefined);
  const dom = new JSDOM(renderBugInbox('test-nonce'), {
    url: 'https://inbox.example.test/bug-inbox', runScripts: 'dangerously',
    beforeParse(window) {
      window.fetch = fetch;
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
  return { dom, window, byId, login, fetch, copy };
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
});
