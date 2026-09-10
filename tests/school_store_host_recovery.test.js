import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const files = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt'];
const read = file => readFileSync(resolve(process.cwd(), file), 'utf8');
const oldUrl = 'https://script.google.com/macros/s/FICTIONAL_OLD/exec';
const newUrl = 'https://script.google.com/macros/s/FICTIONAL_NEW/exec';
const key = 'allo_school_rewards_portal_url_v1';
const invalidUrls = ['', 'https://example.test/macros/s/FICTIONAL/exec', 'http://script.google.com/macros/s/FICTIONAL/exec', newUrl + '?student=fictional', newUrl + '#private', 'https://user:pass@script.google.com/macros/s/FICTIONAL/exec'];

function callbacks(source) {
  const start = source.indexOf('  const handleOpenSchoolRewardsPortal =');
  const end = source.indexOf('  const openMathCreate =', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

function harness(source, options = {}) {
  const declarations = [
    source.match(/const safeSetItem = \(key, value\) => \{[\s\S]*?\r?\n\};/),
    source.match(/const safeRemoveItem = \(key\) => \{[\s\S]*?\r?\n\};/),
    source.match(/const normalizeAlloEvaluationPortalUrl = \(value\) => \{[\s\S]*?\r?\n\};/),
    source.match(/const ALLO_SCHOOL_REWARDS_PORTAL_URL_KEY = '[^']+';/)
  ];
  for (const declaration of declarations) expect(declaration).toBeTruthy();
  let current = options.url ?? oldUrl;
  const data = new Map([[key, current], ['unrelated', 'preserve me']]);
  const storage = {
    setItem: vi.fn((name, value) => { if (options.failSet) throw new Error('storage disabled'); data.set(name, value); }),
    removeItem: vi.fn(name => { if (options.failRemove) throw new Error('storage disabled'); data.delete(name); }),
    clear: vi.fn()
  };
  const open = vi.fn(options.open || (() => ({ opener: {} })));
  const toast = vi.fn();
  const setUrl = vi.fn(value => { current = value; });
  const panel = vi.fn();
  const evaluate = new Function('React', 'window', 'localStorage', 'schoolRewardsPortalUrl', 'setSchoolRewardsPortalUrl', 'addToast', 'handleOpenSchoolRewards',
    declarations.map(match => match[0]).join('\n') + '\n' + callbacks(source) + '\nreturn { open: handleOpenSchoolRewardsPortal, save: handleSaveSchoolRewardsPortalUrl };');
  const api = evaluate({ useCallback: fn => fn }, { open }, storage, current, setUrl, toast, panel);
  return { ...api, launch: open, toast, panel, storage, data, setUrl, current: () => current };
}

it('keeps the root and desktop recovery callbacks identical', () => {
  expect(callbacks(read(files[0]))).toBe(callbacks(read(files[1])));
});

describe.each(files)('School Store host recovery: %s', file => {
  const source = read(file);

  it('dispatches through noopener/noreferrer and clears a returned opener without claiming verified access', () => {
    const handle = { opener: {} };
    const h = harness(source, { open: () => handle });
    expect(h.open()).toBe(true);
    expect(h.launch).toHaveBeenCalledExactlyOnceWith(oldUrl, '_blank', 'noopener,noreferrer');
    expect(handle.opener).toBe(null);
    expect(h.toast).not.toHaveBeenCalled();
    expect(h.panel).not.toHaveBeenCalled();
  });

  it('treats a null WindowProxy as dispatched but unverified without changing the guide or connection', () => {
    const h = harness(source, { open: () => null });
    expect(h.open()).toBe(true);
    expect(h.toast).toHaveBeenCalledExactlyOnceWith('Opening requested. If no tab appears, use the direct link in the Store launcher.', 'info');
    expect(h.panel).not.toHaveBeenCalled();
    expect(h.setUrl).not.toHaveBeenCalled();
    expect(h.storage.setItem).not.toHaveBeenCalled();
    expect(h.storage.removeItem).not.toHaveBeenCalled();
  });

  it('does not misreport a dispatched request when the opener setter throws', () => {
    const handle = {};
    Object.defineProperty(handle, 'opener', { set() { throw new Error('cross-origin access'); } });
    const h = harness(source, { open: () => handle });
    expect(h.open()).toBe(true);
    expect(h.toast).not.toHaveBeenCalled();
  });

  it('returns false for a thrown launch failure without exposing the thrown message', () => {
    const h = harness(source, { open: () => { throw new Error('PRIVATE ERROR DETAIL'); } });
    expect(h.open()).toBe(false);
    expect(h.toast.mock.calls[0][1]).toBe('error');
    expect(h.toast.mock.calls[0][0]).toContain('request could not be sent');
    expect(JSON.stringify(h.toast.mock.calls)).not.toContain('PRIVATE ERROR DETAIL');
    expect(h.panel).not.toHaveBeenCalled();
  });

  it.each([true, false, 'true', 'https://example.test/'])('adds only the fixed recognition view for literal true: %s', flag => {
    const h = harness(source);
    expect(h.open(flag)).toBe(true);
    expect(h.launch.mock.calls[0]).toEqual([oldUrl + (flag === true ? '?view=recognition' : ''), '_blank', 'noopener,noreferrer']);
  });

  it.each(invalidUrls)('rejects invalid stored deployment addresses without opening: %s', url => {
    const h = harness(source, { url });
    expect(h.open(true)).toBe(false);
    expect(h.launch).not.toHaveBeenCalled();
    expect(h.panel).not.toHaveBeenCalled();
    expect(h.setUrl).not.toHaveBeenCalled();
  });

  it('persists only the scoped URL key before changing state or reporting success', () => {
    const h = harness(source);
    expect(h.save('  ' + newUrl + '  ')).toEqual({ ok: true, url: newUrl, connected: true });
    expect(h.storage.setItem).toHaveBeenCalledExactlyOnceWith(key, newUrl);
    expect(h.data.get(key)).toBe(newUrl);
    expect(h.current()).toBe(newUrl);
    expect(h.storage.setItem.mock.invocationCallOrder[0]).toBeLessThan(h.setUrl.mock.invocationCallOrder[0]);
    expect(h.toast).toHaveBeenCalledExactlyOnceWith('School Rewards launcher saved on this device.', 'success');
    expect(h.data.get('unrelated')).toBe('preserve me');
    expect(h.storage.removeItem).not.toHaveBeenCalled();
    expect(h.storage.clear).not.toHaveBeenCalled();
  });

  it('removes only the scoped URL key before clearing state or reporting success', () => {
    const h = harness(source);
    expect(h.save('  ')).toEqual({ ok: true, url: '', connected: false });
    expect(h.storage.removeItem).toHaveBeenCalledExactlyOnceWith(key);
    expect(h.data.has(key)).toBe(false);
    expect(h.current()).toBe('');
    expect(h.storage.removeItem.mock.invocationCallOrder[0]).toBeLessThan(h.setUrl.mock.invocationCallOrder[0]);
    expect(h.toast).toHaveBeenCalledExactlyOnceWith('School Rewards launcher removed from this device.', 'success');
    expect(h.data.get('unrelated')).toBe('preserve me');
    expect(h.storage.setItem).not.toHaveBeenCalled();
    expect(h.storage.clear).not.toHaveBeenCalled();
  });

  it.each([oldUrl, ''])('keeps the old state and returns an explicit error when browser saving fails: %s', url => {
    const h = harness(source, { url, failSet: true });
    const result = h.save(newUrl);
    expect(result).toEqual({ ok: false, error: expect.stringContaining('could not save') });
    expect(h.storage.setItem).toHaveBeenCalledExactlyOnceWith(key, newUrl);
    expect(h.current()).toBe(url);
    expect(h.data.get(key)).toBe(url);
    expect(h.setUrl).not.toHaveBeenCalled();
    expect(h.toast).toHaveBeenCalledExactlyOnceWith(result.error, 'error');
    expect(h.storage.removeItem).not.toHaveBeenCalled();
    expect(h.storage.clear).not.toHaveBeenCalled();
  });

  it('keeps the old connection and returns an explicit error when browser removal fails', () => {
    const h = harness(source, { failRemove: true });
    const result = h.save('');
    expect(result).toEqual({ ok: false, error: expect.stringContaining('could not remove') });
    expect(h.storage.removeItem).toHaveBeenCalledExactlyOnceWith(key);
    expect(h.current()).toBe(oldUrl);
    expect(h.data.get(key)).toBe(oldUrl);
    expect(h.setUrl).not.toHaveBeenCalled();
    expect(h.toast).toHaveBeenCalledExactlyOnceWith(result.error, 'error');
    expect(h.storage.setItem).not.toHaveBeenCalled();
    expect(h.storage.clear).not.toHaveBeenCalled();
  });

  it.each(invalidUrls.filter(Boolean))('leaves the connection and storage intact on invalid save: %s', value => {
    const h = harness(source);
    expect(h.save(value)).toEqual({ ok: false, error: expect.any(String) });
    expect(h.current()).toBe(oldUrl);
    expect(h.data.get(key)).toBe(oldUrl);
    expect(h.setUrl).not.toHaveBeenCalled();
    expect(h.storage.setItem).not.toHaveBeenCalled();
    expect(h.storage.removeItem).not.toHaveBeenCalled();
    expect(h.storage.clear).not.toHaveBeenCalled();
    expect(h.toast.mock.calls[0][1]).toBe('error');
  });
});
