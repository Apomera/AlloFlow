import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { JSDOM, VirtualConsole } from 'jsdom';

const sources = Object.fromEntries(['translation_feedback_module.js', 'item_correction_module.js'].map(file => [file, readFileSync(file, 'utf8')]));
const windows = [];
const privateLocation = 'https://metadata-user:metadata-password@school.example/private-canvas-link/path-secret?allo_mb=join-secret&api_key=query-secret#fragment-secret';
const cases = [
  { name: 'translation', file: 'translation_feedback_module.js', api: 'TranslationFeedback', prefix: 'allo-tfb', route: '/submitTranslation', context: { key: 'ui.label', current: 'Public source text', language: 'Spanish' } },
  { name: 'item correction', file: 'item_correction_module.js', api: 'ItemCorrection', prefix: 'allo-ic', route: '/submitItemCorrection', context: { packId: 'public-pack', packTitle: 'Public practice pack', itemId: 'public-item', prompt: 'Public question', currentAnswer: 'B', domain: 'math', reviewTier: 'source-reviewed' } }
];

function boot(entry, options = {}) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: options.url || privateLocation, runScripts: 'outside-only', virtualConsole: new VirtualConsole() });
  const w = dom.window;
  windows.push(w);
  if ('policy' in options) w.ALLOFLOW_SUPPORT_REPORTING_POLICY = options.policy;
  w.fetch = vi.fn(options.fetch || (() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) })));
  w.open = vi.fn(() => null);
  w.eval(sources[entry.file]);
  const api = w.AlloModules[entry.api];
  const open = context => entry.api === 'ItemCorrection' ? api.openFor(context || entry.context) : api.openModal(context || entry.context);
  return { w, api, open, id: suffix => w.document.getElementById(entry.prefix + '-' + suffix) };
}

function draft(h) {
  h.open();
  h.id('suggest').value = 'A reviewed public correction.';
  h.id('note').value = 'Public supporting explanation.';
}
const settle = () => new Promise(resolve => setTimeout(resolve, 0));
afterEach(() => { windows.splice(0).forEach(w => w.close()); vi.restoreAllMocks(); });

for (const entry of cases) describe(entry.name + ' community privacy boundary', () => {
  it.each([
    ['disabled', { version: 1, enabled: false }],
    ['enabled legacy destination', { version: 1, enabled: true }],
    ['custom bug endpoint', { version: 1, enabled: true, endpoint: 'https://district.example/bugs', allowGoogleFormFallback: true }],
    ['invalid object', {}], ['null', null], ['invalid scalar', 'invalid'], ['false', false], ['explicit undefined', undefined]
  ])('blocks independent POST and form routes for a %s policy while retaining the draft', async (_name, policy) => {
    const h = boot(entry, { policy });
    draft(h);
    expect(h.id('send').disabled).toBe(true);
    expect(h.id('err').textContent).toMatch(/disabled in this managed deployment/);
    h.id('send').onclick(); // Exercise the guard even when a stale caller invokes a disabled button.
    await settle();
    expect(h.w.fetch).not.toHaveBeenCalled();
    expect(h.w.open).not.toHaveBeenCalled();
    expect(h.id('suggest').value).toBe('A reviewed public correction.');
  });

  it('rechecks policy when a handler captured before the policy was set is invoked', async () => {
    const h = boot(entry);
    draft(h);
    const staleSend = h.id('send').onclick;
    h.w.ALLOFLOW_SUPPORT_REPORTING_POLICY = { version: 1, enabled: false };
    staleSend();
    await settle();
    expect(h.w.fetch).not.toHaveBeenCalled();
    expect(h.w.open).not.toHaveBeenCalled();
    expect(h.id('err').textContent).toMatch(/disabled in this managed deployment/);
  });

  it('blocks late form fallback after policy is installed during an in-flight default request', async () => {
    let reject;
    const h = boot(entry, { fetch: () => new Promise((_resolve, rejectRequest) => { reject = rejectRequest; }) });
    draft(h);
    h.id('send').click();
    expect(h.w.fetch).toHaveBeenCalledTimes(1);
    h.w.ALLOFLOW_SUPPORT_REPORTING_POLICY = { version: 1, enabled: true, endpoint: 'https://district.example/bugs' };
    reject(new Error('Synthetic network interruption'));
    await settle();
    expect(h.w.open).not.toHaveBeenCalled();
    expect(h.id('err').textContent).toMatch(/disabled in this managed deployment/);
    expect(h.id('suggest').value).toBe('A reviewed public correction.');
  });

  it('preserves the existing default contribution route and payload without attaching location metadata', async () => {
    const h = boot(entry);
    draft(h);
    expect(h.id('send').disabled).toBe(false);
    h.id('send').click();
    await settle();
    expect(h.w.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = h.w.fetch.mock.calls[0];
    expect(url.endsWith(entry.route)).toBe(true);
    expect(options.method).toBe('POST');
    expect(options).toMatchObject({ redirect: 'error', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
    const payload = JSON.parse(options.body);
    expect(payload.suggested).toBe('A reviewed public correction.');
    expect(payload.note).toBe('Public supporting explanation.');
    for (const canary of ['metadata-user', 'metadata-password', 'path-secret', 'join-secret', 'query-secret', 'fragment-secret']) expect(options.body).not.toContain(canary);
    expect(h.w.open).not.toHaveBeenCalled();
    expect(h.w.document.body.textContent).toMatch(/sent for review/);
  });

  it('uses origin-only metadata in the default form fallback, preserving intentional source content', async () => {
    const h = boot(entry, { fetch: () => Promise.reject(new Error('Synthetic offline')) });
    const context = { ...entry.context, current: 'Reference https://reference.example/topic?term=algebra#definition', prompt: 'Reference https://reference.example/topic?term=algebra#definition' };
    h.open(context);
    h.id('suggest').value = 'Keep the original public source link.';
    h.id('send').click();
    await settle();
    expect(h.w.open).toHaveBeenCalledTimes(1);
    expect(h.w.open.mock.calls[0].slice(1)).toEqual(['_blank', 'noopener,noreferrer']);
    const url = new URL(h.w.open.mock.calls[0][0]);
    expect(url.origin).toBe('https://docs.google.com');
    expect(url.searchParams.get('entry.1969020676')).toBe('URL: https://school.example');
    expect(url.searchParams.get('entry.234547532')).toContain('https://reference.example/topic?term=algebra#definition');
    const decoded = decodeURIComponent(h.w.open.mock.calls[0][0]);
    for (const canary of ['metadata-user', 'metadata-password', 'private-canvas-link', 'path-secret', 'join-secret', 'query-secret', 'fragment-secret']) expect(decoded).not.toContain(canary);
  });

  it('uses a generic marker for opaque embedded locations', async () => {
    const h = boot(entry, { url: 'about:srcdoc', fetch: () => Promise.reject(new Error('Synthetic offline')) });
    draft(h);
    h.id('send').click();
    await settle();
    const url = new URL(h.w.open.mock.calls[0][0]);
    expect(url.searchParams.get('entry.1969020676')).toBe('Public supporting explanation.\n\nURL: [embedded app]');
  });

  it('retains the draft and current page when opening a fallback form throws', async () => {
    const h = boot(entry, { fetch: () => Promise.reject(new Error('Synthetic offline')) });
    h.w.open.mockImplementation(() => { throw new Error('Synthetic popup failure'); });
    draft(h);
    h.id('send').click();
    await settle();
    expect(h.w.open).toHaveBeenCalledTimes(1);
    expect(h.w.location.href).toBe(privateLocation);
    expect(h.id('suggest').value).toBe('A reviewed public correction.');
    expect(h.id('err').textContent).toMatch(/form could not be opened/);
    expect(h.id('send').disabled).toBe(false);
  });
});

describe('community-feedback deployment assets', () => {
  it('does not perform the optional English-source lookup when managed translation feedback is offered', () => {
    const h = boot(cases[0], { policy: { version: 1, enabled: false } });
    h.api.offerFor(cases[0].context);
    expect(h.w.fetch).not.toHaveBeenCalled();
    h.w.document.getElementById('allo-tfb-pill').click();
    expect(h.id('err').textContent).toMatch(/disabled in this managed deployment/);
  });

  it('fails closed when the policy cannot be read', () => {
    const h = boot(cases[1]);
    Object.defineProperty(h.w, 'ALLOFLOW_SUPPORT_REPORTING_POLICY', { configurable: true, get() { throw new Error('unreadable'); } });
    draft(h);
    h.id('send').onclick();
    expect(h.w.fetch).not.toHaveBeenCalled();
    expect(h.w.open).not.toHaveBeenCalled();
  });

  it.each(cases)('keeps the $name public mirror identical', entry => {
    const digest = value => createHash('sha256').update(value).digest('hex');
    expect(digest(readFileSync('desktop/web-app/public/' + entry.file))).toBe(digest(readFileSync(entry.file)));
  });
});
