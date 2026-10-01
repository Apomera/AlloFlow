import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const artifact = readFileSync('host_handlers_module.js', 'utf8');
const script = new vm.Script(artifact, { filename: 'host_handlers_module.js' });
const GOOD_URL = 'https://script.google.com/macros/s/test-mailbox/exec';
function response({ a }) {
  if (a === 'hello') return { v: 23 };
  if (a === 'auth') return { admin: true };
  if (a === 'claim') return { admin: 'claimed-token' };
  if (a === 'mysessions') return { sessions: [] };
  throw Error('Unexpected local fixture request: ' + a);
}
function harness({ pasted = 'pasted-token', stored = '', cleaned = GOOD_URL, call = response, mbLive = null } = {}) {
  const cache = new Map(stored ? [['admin-key', stored]] : []);
  const localStorage = { getItem: key => cache.get(key) || null, setItem: (key, value) => cache.set(key, value) };
  const window = { React: {}, AlloModules: {} };
  script.runInContext(vm.createContext({ window, localStorage, Date, console: { log() {}, warn() {}, error() {} } }));
  const deps = {
    mbUrlInput: GOOD_URL, mbAdminInput: pasted, mbLive,
    ALLO_MB_ADMIN_KEY: 'admin-key', ALLO_MB_URL_KEY: 'url-key', ALLO_MB_VERSION_KEY: 'version-key',
    _alloCleanMailboxUrl: vi.fn(() => cleaned), _alloMailboxCall: vi.fn(async (_url, payload) => call(payload)),
    setMbBusy: vi.fn(), setMbStatus: vi.fn(), alloPersistMailboxConfig: vi.fn(), setMbAdminInput: vi.fn(),
    setMbConfig: vi.fn(), setMbResumable: vi.fn(), warnLog: vi.fn(),
  };
  return { connect: window.AlloModules.HostHandlers(deps).connectMailbox, deps, cache };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe('actual mailbox connection result', () => {
  it.each([
    ['pasted', { pasted: '  pasted-token  ' }, 'pasted-token', ['hello', 'auth', 'mysessions']],
    ['stored', { pasted: '', stored: 'stored-token' }, 'stored-token', ['hello', 'auth', 'mysessions']],
    ['claimed', { pasted: '' }, 'claimed-token', ['hello', 'claim', 'mysessions']],
  ])('returns the same verified %s config passed to the host and preserves persistence', async (_kind, options, admin, actions) => {
    const h = harness(options);
    const result = await h.connect();
    expect(result).toBe(h.deps.setMbConfig.mock.calls[0][0]);
    expect(result).toMatchObject({ url: GOOD_URL, admin, v: 23 });
    expect(Number.isFinite(result.latencyMs)).toBe(true);
    expect(h.deps._alloMailboxCall.mock.calls.map(([, payload]) => payload.a)).toEqual(actions);
    expect(h.deps.alloPersistMailboxConfig).toHaveBeenCalledWith({ url: GOOD_URL, admin, v: 23 });
    expect(h.cache.get('url-key')).toBe(GOOD_URL); expect(h.cache.get('admin-key')).toBe(admin); expect(h.cache.get('version-key')).toBe('23');
    expect(h.deps.setMbBusy).toHaveBeenLastCalledWith(false);
  });

  it('settles only after session recovery finishes, retaining existing session filtering', async () => {
    const requested = deferred(), sessions = deferred();
    const h = harness({ call: payload => {
      if (payload.a === 'mysessions') { requested.resolve(); return sessions.promise; }
      return response(payload);
    } });
    let settled = false;
    const running = h.connect().then(result => { settled = true; return result; });
    await requested.promise;
    expect(settled).toBe(false);
    expect(h.deps.setMbConfig).toHaveBeenCalledOnce();
    expect(h.deps.setMbBusy).toHaveBeenLastCalledWith(true);
    sessions.resolve({ sessions: [null, { c: 'missing-secret' }, { c: 'class', k: 'secret' }] });
    const result = await running;
    expect(result).toBe(h.deps.setMbConfig.mock.calls[0][0]);
    expect(h.deps.setMbResumable).toHaveBeenCalledWith([{ c: 'class', k: 'secret' }]);
    expect(h.deps.setMbBusy).toHaveBeenLastCalledWith(false);
  });

  it('retains a verified result when the optional session recovery request fails', async () => {
    const h = harness({ call: payload => { if (payload.a === 'mysessions') throw Error('Optional recovery unavailable'); return response(payload); } });
    const result = await h.connect();
    expect(result).toBe(h.deps.setMbConfig.mock.calls[0][0]);
    expect(h.deps.warnLog).toHaveBeenCalledWith('mysessions query failed', 'Optional recovery unavailable');
    expect(h.deps.setMbBusy).toHaveBeenLastCalledWith(false);
  });

  it('does not let a failed durable write discard a verified connection', async () => {
    const h = harness({ mbLive: { code: 'active' } });
    h.deps.alloPersistMailboxConfig.mockImplementation(() => { throw Error('Storage unavailable'); });
    const result = await h.connect();
    expect(result).toBe(h.deps.setMbConfig.mock.calls[0][0]);
    expect(h.deps._alloMailboxCall.mock.calls.map(([, payload]) => payload.a)).toEqual(['hello', 'auth']);
  });

  it('returns no successful result for an invalid URL without contacting the mailbox', async () => {
    const h = harness({ cleaned: '' });
    expect(await h.connect()).toBeUndefined();
    expect(h.deps._alloMailboxCall).not.toHaveBeenCalled(); expect(h.deps.setMbConfig).not.toHaveBeenCalled();
  });

  it.each(['hello', 'auth', 'claim'])('returns no successful result when %s fails', async action => {
    const h = harness({ pasted: action === 'claim' ? '' : 'pasted-token', call: payload => {
      if (payload.a === action) {
        if (action === 'auth') return { admin: false };
        if (action === 'claim') throw Object.assign(Error('Already claimed'), { code: 'claimed' });
        throw Error('Mailbox unavailable');
      }
      return response(payload);
    } });
    expect(await h.connect()).toBeFalsy();
    expect(h.deps.setMbConfig).not.toHaveBeenCalled();
    expect(h.deps.setMbBusy).toHaveBeenLastCalledWith(false);
  });

  it('does not report a malformed claim with no admin token as verified', async () => {
    const h = harness({ pasted: '', call: payload => payload.a === 'claim' ? {} : response(payload) });
    expect(await h.connect()).toBeNull();
    expect(h.deps.setMbBusy).toHaveBeenLastCalledWith(false);
  });

  it('keeps the generated root and public connection handler identical', () => {
    expect(readFileSync('desktop/web-app/public/host_handlers_module.js', 'utf8')).toBe(artifact);
  });
});
