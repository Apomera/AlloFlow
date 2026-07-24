import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load the IIFE module once against the shared jsdom window (mirrors how the
// other *_module tests boot their target).
const SRC = readFileSync(resolve(process.cwd(), 'item_correction_module.js'), 'utf8');
function boot() {
  delete window.AlloModules;
  // eslint-disable-next-line no-new-func
  new Function(SRC)();
  return window.AlloModules.ItemCorrection;
}

describe('ItemCorrection module', () => {
  let IC;
  beforeEach(() => {
    document.body.innerHTML = '';
    window.AlloModules = undefined;
    IC = boot();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('registers on window.AlloModules with a stable public API', () => {
    expect(typeof IC.openFor).toBe('function');
    expect(typeof IC.openModal).toBe('function');
    expect(Array.isArray(IC.KINDS)).toBe(true);
    // The "not a real exam question" flag must exist — it's the honest-tier signal.
    expect(IC.KINDS.some((k) => k.id === 'not-exam-item')).toBe(true);
    expect(IC.KINDS.some((k) => k.id === 'wrong-answer')).toBe(true);
  });

  it('openFor renders an accessible modal pre-filled with the item context', () => {
    IC.openFor({ packId: 'praxis-core-5752', packTitle: 'Praxis Core 5752', itemId: 'core5752-b1-083', prompt: 'What is the range of 4, 9, 11, 15, and 18?', domain: 'math', reviewTier: 'source-reviewed', currentAnswer: '14' });
    const overlay = document.getElementById('allo-ic-overlay');
    expect(overlay).toBeTruthy();
    expect(overlay.getAttribute('role')).toBe('dialog');
    expect(overlay.getAttribute('aria-modal')).toBe('true');
    expect(overlay.textContent).toContain('Praxis Core 5752');
    expect(overlay.textContent).toContain('What is the range of 4, 9, 11, 15, and 18?');
    // source-reviewed tier is described honestly (validation pending)
    expect(overlay.textContent).toMatch(/validation pending/i);
    expect(document.getElementById('allo-ic-suggest')).toBeTruthy();
  });

  it('guided-review items are labelled as not-an-independent-exam-question', () => {
    IC.openFor({ packId: 'p', packTitle: 'Pack', itemId: 'x-exp3', prompt: 'q', reviewTier: 'guided-review' });
    expect(document.getElementById('allo-ic-overlay').textContent).toMatch(/assistant-authored/i);
  });

  it('requires a suggested fix before sending', () => {
    IC.openFor({ packId: 'p', packTitle: 'Pack', itemId: 'x', prompt: 'q', reviewTier: 'source-reviewed' });
    global.fetch = vi.fn();
    document.getElementById('allo-ic-send').click();
    expect(global.fetch).not.toHaveBeenCalled();
    const err = document.getElementById('allo-ic-err');
    expect(err.style.display).toBe('block');
    expect(err.textContent).toMatch(/suggested fix/i);
  });

  it('POSTs a structured payload to the worker /submitItemCorrection route', async () => {
    IC.openFor({ packId: 'praxis-core-5752', packTitle: 'Praxis Core 5752', itemId: 'core5752-b1-083', prompt: 'q', domain: 'math', reviewTier: 'source-reviewed', currentAnswer: '14' });
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }));
    document.getElementById('allo-ic-suggest').value = 'The key should be B.';
    document.getElementById('allo-ic-kind').value = 'wrong-answer';
    document.getElementById('allo-ic-note').value = 'per the blueprint';
    document.getElementById('allo-ic-send').click();
    await new Promise((r) => setTimeout(r, 0));

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/submitItemCorrection$/);
    expect(opts.method).toBe('POST');
    const payload = JSON.parse(opts.body);
    expect(payload.packId).toBe('praxis-core-5752');
    expect(payload.itemId).toBe('core5752-b1-083');
    expect(payload.reviewTier).toBe('source-reviewed');
    expect(payload.suggested).toBe('The key should be B.');
    expect(payload.kind).toMatch(/^wrong-answer/);
    // success shows the non-fallback thank-you
    expect(document.getElementById('allo-ic-overlay').textContent).toMatch(/sent for review/i);
  });

  it('falls back to the Google Form (new tab) when the worker is unreachable', async () => {
    IC.openFor({ packId: 'p', packTitle: 'Pack', itemId: 'x', prompt: 'q', reviewTier: 'source-reviewed' });
    global.fetch = vi.fn(() => Promise.reject(new Error('network down')));
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    document.getElementById('allo-ic-suggest').value = 'reword the stem';
    document.getElementById('allo-ic-send').click();
    await new Promise((r) => setTimeout(r, 0));

    expect(openSpy).toHaveBeenCalledTimes(1);
    const formUrl = openSpy.mock.calls[0][0];
    expect(formUrl).toMatch(/docs\.google\.com\/forms/);
    expect(decodeURIComponent(formUrl)).toContain('Practice Item Correction');
    expect(document.getElementById('allo-ic-overlay').textContent).toMatch(/opened in a form/i);
  });

  it('the root module and the deploy mirror are byte-identical', () => {
    const root = readFileSync(resolve(process.cwd(), 'item_correction_module.js'), 'utf8');
    const mirror = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/item_correction_module.js'), 'utf8');
    expect(mirror).toBe(root);
  });
});
