// @vitest-environment node
import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
const source = fs.readFileSync(new URL('../error_reporter_module.js', import.meta.url), 'utf8');
const windows = [];
afterEach(() => { for (const w of windows.splice(0)) w.close(); });
const policy = () => ({ ok: true, districtId: 'district-a', policyId: 'approved-v1',
  destinationName: 'District support', noticeUrl: 'https://district.example/privacy',
  approvedUntil: new Date(Date.now() + 86400000).toISOString(), retentionSeconds: 86400 });
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function boot({ base, url = 'https://school.example/app?student=SensitiveName&allo_mb=JOINSECRET', fetcher } = {}) {
  const w = new JSDOM('<!doctype html><html><body></body></html>', { url, runScripts: 'outside-only', virtualConsole: new VirtualConsole() }).window;
  windows.push(w);
  w.__alloBugReportBasePath = base;
  w.fetch = vi.fn(fetcher || (async (_url, init) => ({ ok: true, status: init.method === 'GET' ? 200 : 201,
    json: async () => init.method === 'GET' ? policy() : { ok: true, id: 'synthetic-receipt' } })));
  w.open = vi.fn();
  Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: vi.fn(async () => {}) }, configurable: true });
  w.__alloTtsTrace = [{ at: Date.now(), event: 'audio', detail: { text: 'SensitiveName scored 72' } }];
  w.eval(source);
  w.console.error('SensitiveName scored 72', 'token=PRIVATE');
  w.AlloModules.ErrorReporter.openPanel('errors');
  w.document.getElementById('aer-send').click();
  return w;
}
const get = (w, id) => w.document.getElementById(id);
function enter(w) {
  for (const [id, value] of [['aer-report-summary', 'Read aloud stops early.'], ['aer-report-steps', 'Open a sample reading and press play.']]) {
    get(w, id).value = value;
    get(w, id).dispatchEvent(new w.Event('input'));
  }
  get(w, 'aer-report-review').click();
}
function agree(w) {
  get(w, 'aer-report-reviewed').checked = true;
  get(w, 'aer-report-reviewed').dispatchEvent(new w.Event('change'));
}
describe('reviewed district report submission', () => {
  it('defaults to local-only without any request, popup, or clipboard fallback', () => {
    const w = boot();
    expect(w.fetch).not.toHaveBeenCalled();
    expect(w.open).not.toHaveBeenCalled();
    expect(w.navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(get(w, 'allo-err-panel').textContent).toContain('External reporting is disabled');
  });
  it.each(['https://collector.example', '//collector.example', '/api/../collector', '/api/reports?token=x', '/api/%2fexternal'])('rejects an unsafe gateway base %s', base => {
    const w = boot({ base });
    expect(w.fetch).not.toHaveBeenCalled();
  });
  it('does not enable reporting from insecure/file/null origins', () => {
    for (const url of ['http://school.example/', 'file:///example.html']) {
      const w = boot({ base: '/api/reporting', url });
      expect(w.fetch).not.toHaveBeenCalled();
    }
  });
  it('fetches only the same-origin policy and never places credentials or context in its URL', async () => {
    const w = boot({ base: '/api/reporting' });
    await flush();
    expect(w.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = w.fetch.mock.calls[0];
    expect(url).toBe('/api/reporting/policy');
    expect(init).toMatchObject({ method: 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer' });
    expect(init.headers).not.toHaveProperty('Authorization');
    expect(get(w, 'allo-err-panel').textContent).toContain('District support');
    expect(get(w, 'aer-report-summary').value).toBe('');
  });
  it.each([null, { ...policy(), districtId: 123 }, { ...policy(), retentionSeconds: 0 }, { ...policy(), noticeUrl: 'javascript:alert(1)' }, { ...policy(), approvedUntil: '2020-01-01T00:00:00Z' }])('fails closed on invalid or expired policy', async value => {
    const w = boot({ base: '/api/reporting', fetcher: async () => ({ ok: true, json: async () => value }) });
    await flush();
    expect(get(w, 'aer-report-review')).toBeNull();
    expect(w.fetch).toHaveBeenCalledTimes(1);
  });
  it('requires review plus acknowledgement and sends exactly the shown allowlisted payload', async () => {
    const w = boot({ base: '/api/reporting' });
    await flush();
    enter(w);
    expect(w.fetch).toHaveBeenCalledTimes(1);
    expect(get(w, 'aer-report-submit').disabled).toBe(true);
    const shown = { category: get(w, 'aer-preview-category').textContent, summary: get(w, 'aer-preview-summary').textContent, steps: get(w, 'aer-preview-steps').textContent };
    agree(w);
    get(w, 'aer-report-submit').click();
    await flush();
    expect(w.fetch).toHaveBeenCalledTimes(2);
    const [url, init] = w.fetch.mock.calls[1];
    expect(url).toBe('/api/reporting/reports');
    expect(JSON.parse(init.body)).toMatchObject(shown);
    expect(JSON.parse(init.body)).toEqual({ schema_version: '2.0', district_id: 'district-a', policy_id: 'approved-v1',
      retention_seconds: 86400, reviewed: true, category: 'other', summary: 'Read aloud stops early.', steps: 'Open a sample reading and press play.' });
    expect(init.body).not.toMatch(/SensitiveName|JOINSECRET|PRIVATE|audio|student=|userAgent/);
    expect(get(w, 'aer-report-status').textContent).toContain('Report sent');
    expect(w.open).not.toHaveBeenCalled();
  });
  it('editing resets acknowledgement, and live errors do not erase the draft', async () => {
    const w = boot({ base: '/api/reporting' });
    await flush();
    enter(w); agree(w);
    get(w, 'aer-report-edit').click();
    expect(get(w, 'aer-report-summary').value).toBe('Read aloud stops early.');
    w.console.error('another live error');
    expect(get(w, 'aer-report-summary').value).toBe('Read aloud stops early.');
    get(w, 'aer-report-review').click();
    expect(get(w, 'aer-report-reviewed').checked).toBe(false);
    expect(get(w, 'aer-report-submit').disabled).toBe(true);
  });
  it('blocks a changed reporting destination before any POST', async () => {
    const w = boot({ base: '/api/reporting' });
    await flush(); enter(w); agree(w);
    w.__alloBugReportBasePath = '/api/other';
    get(w, 'aer-report-submit').click();
    expect(w.fetch).toHaveBeenCalledTimes(1);
    expect(get(w, 'aer-report-status').textContent).toContain('authorization changed');
  });
  it('keeps report markup as text and traps keyboard focus inside review', async () => {
    const w = boot({ base: '/api/reporting' });
    await flush();
    const field = get(w, 'aer-report-summary');
    field.value = '<img src=x onerror=alert(1)>';
    field.dispatchEvent(new w.Event('input'));
    get(w, 'aer-report-review').click();
    expect(get(w, 'aer-preview-summary').textContent).toBe(field.value);
    expect(w.document.querySelector('#allo-err-panel img')).toBeNull();
    get(w, 'aer-report-close').focus();
    get(w, 'aer-report-close').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(w.document.activeElement.tagName).toBe('A');
  });
  it('keeps failures local and preserves the draft without opening a form or copying report URLs', async () => {
    const w = boot({ base: '/api/reporting', fetcher: async (_url, init) => {
      if (init.method === 'GET') return { ok: true, json: async () => policy() };
      throw new Error('network down');
    } });
    await flush(); enter(w); agree(w); get(w, 'aer-report-submit').click(); await flush();
    expect(get(w, 'aer-report-status').textContent).toContain('not confirmed');
    expect(w.open).not.toHaveBeenCalled();
    expect(w.navigator.clipboard.writeText).not.toHaveBeenCalled();
    get(w, 'aer-report-edit').click();
    expect(get(w, 'aer-report-summary').value).toBe('Read aloud stops early.');
  });
  it('returns a rejected sensitive report to editing without echoing server error text', async () => {
    const w = boot({ base: '/api/reporting', fetcher: async (_url, init) => init.method === 'GET'
      ? { ok: true, json: async () => policy() }
      : { status: 422, json: async () => ({ error: 'SensitiveName secret server error' }) } });
    await flush(); enter(w); agree(w); get(w, 'aer-report-submit').click(); await flush();
    expect(get(w, 'aer-report-summary').value).toBe('Read aloud stops early.');
    expect(get(w, 'allo-err-panel').textContent).not.toContain('SensitiveName');
    expect(get(w, 'aer-report-status').textContent).toContain('Remove personal information');
  });
  it('aborts on close and ignores a late policy response after another dialog opens', async () => {
    let resolve;
    const w = boot({ base: '/api/reporting', fetcher: () => new Promise(r => { resolve = r; }) });
    const signal = w.fetch.mock.calls[0][1].signal;
    get(w, 'aer-report-close').click();
    expect(signal.aborted).toBe(true);
    w.AlloModules.ErrorReporter.openPanel('errors');
    resolve({ ok: true, json: async () => policy() });
    await flush();
    expect(get(w, 'aer-report-summary')).toBeNull();
    expect(get(w, 'aer-send')).not.toBeNull();
  });
  it('ignores a late submission result after close and never resubmits automatically', async () => {
    let resolve;
    const w = boot({ base: '/api/reporting', fetcher: (_url, init) => init.method === 'GET'
      ? Promise.resolve({ ok: true, json: async () => policy() })
      : new Promise(r => { resolve = r; }) });
    await flush(); enter(w); agree(w); get(w, 'aer-report-submit').click();
    const signal = w.fetch.mock.calls[1][1].signal;
    get(w, 'aer-report-close').click();
    expect(signal.aborted).toBe(true);
    w.AlloModules.ErrorReporter.openPanel('errors');
    resolve({ status: 201, json: async () => ({ ok: true }) });
    await flush();
    expect(w.fetch).toHaveBeenCalledTimes(2);
    expect(get(w, 'aer-send')).not.toBeNull();
    expect(get(w, 'aer-report-status')).toBeNull();
  });
});
