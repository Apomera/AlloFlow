import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync('runtime_graph_host.js', 'utf8');
function setup(url = 'https://school.example/app/') {
  const sessions = [], prepare = vi.fn(async () => {
    const session = { load: vi.fn(async () => ({ version: 42 })), asset: vi.fn(() => ({ url: 'blob:verified', revoke: vi.fn() })),
      createWorker: vi.fn(() => ({ terminate: vi.fn() })), dispose: vi.fn() };
    sessions.push(session); return session;
  });
  const location = new URL(url), policy = { prepare, fetchText: vi.fn(async () => 'verified') };
  const factory = vi.fn(() => policy), context = vm.createContext({ _alloCreateRuntimeGraphDeliveryPolicy: factory });
  vm.runInContext(source, context);
  const target = { location, fetch: vi.fn(), btoa: vi.fn(), setTimeout, clearTimeout, Blob, URL, TextDecoder, crypto: {} };
  expect(context._alloInstallRuntimeGraphHost({ original: true }, target)).toBe(policy);
  return { target, sessions, factory, prepare, policy };
}
describe('trusted runtime host adapter', () => {
  it('captures the reviewed inventory and native primitives, with native SRI fallback for LAN', () => {
    const { factory } = setup('http://127.0.0.1:3210/app/');
    expect(factory.mock.calls[0][0]).toEqual({ original: true });
    expect(factory.mock.calls[0][1]).toMatchObject({ isDesktopBundledApp: true, allowNativeIntegrity: true });
    expect(setup('http://192.168.1.2/app/').factory.mock.calls[0][1].isDesktopBundledApp).toBe(false);
  });
  it('exposes read-only helpers and deduplicates a runtime preparation', async () => {
    const { target, prepare, sessions } = setup();
    await Promise.all([target.__alloLoadVerifiedRuntime('piper'), target.__alloLoadVerifiedRuntime('piper')]);
    expect(prepare).toHaveBeenCalledTimes(1); expect(sessions[0].load).toHaveBeenCalledTimes(2);
    expect(Object.getOwnPropertyDescriptor(target, '__alloLoadVerifiedRuntime').writable).toBe(false);
  });
  it('routes verified script text through the lexical policy', async () => {
    const { target, policy } = setup(); expect(await target.__alloFetchTrustedScriptText('/axe.js', 'axe-core')).toBe('verified');
    expect(policy.fetchText).toHaveBeenCalledWith('/axe.js', 'axe-core');
  });
  it('releasing one asset requests disposal once and makes future opens fresh', async () => {
    const { target, sessions, prepare } = setup();
    const asset = await target.__alloGetVerifiedRuntimeAsset('duckdb', 'wasm');
    asset.revoke(); asset.revoke();
    expect(sessions[0].dispose).toHaveBeenCalledTimes(1);
    expect(sessions[0].asset.mock.results[0].value.revoke).toHaveBeenCalledTimes(1);
    await target.__alloLoadVerifiedRuntime('duckdb'); expect(prepare).toHaveBeenCalledTimes(2);
  });
  it('an older asset lease cannot dispose the replacement session', async () => {
    const { target, sessions, prepare } = setup();
    const old = await target.__alloGetVerifiedRuntimeAsset('pdfjs', 'worker');
    target.__alloDisposeVerifiedRuntime('pdfjs');
    await target.__alloLoadVerifiedRuntime('pdfjs'); old.revoke();
    await target.__alloLoadVerifiedRuntime('pdfjs');
    expect(prepare).toHaveBeenCalledTimes(2); expect(sessions[1].dispose).not.toHaveBeenCalled();
  });
  it('worker termination releases the factory lease and requests session disposal', async () => {
    const { target, sessions } = setup(); const worker = await target.__alloCreateVerifiedWorker('kokoro', 'protocol', { type: 'module' });
    worker.terminate(); expect(sessions[0].dispose).toHaveBeenCalledTimes(1);
    expect(sessions[0].createWorker).toHaveBeenCalledWith('protocol', { type: 'module' });
  });
  it('disposes preparation failures and permits a clean retry', async () => {
    const { target, prepare } = setup(); prepare.mockRejectedValueOnce(new Error('digest differs'));
    await expect(target.__alloLoadVerifiedRuntime('piper')).rejects.toThrow('digest differs');
    expect(await target.__alloLoadVerifiedRuntime('piper')).toEqual({ version: 42 });
    expect(prepare).toHaveBeenCalledTimes(2);
  });
  it('waits for pending disposal before reopening the factory session', async () => {
    const { target, prepare } = setup();
    let resolve;
    const old = { load: vi.fn(async () => 'old'), dispose: vi.fn() };
    prepare.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const first = target.__alloLoadVerifiedRuntime('slow');
    target.__alloDisposeVerifiedRuntime('slow');
    const reopened = target.__alloLoadVerifiedRuntime('slow');
    expect(prepare).toHaveBeenCalledTimes(1);
    resolve(old); await expect(first).rejects.toThrow('runtime session is closing');
    expect(await reopened).toEqual({ version: 42 });
    expect(old.dispose).toHaveBeenCalledTimes(1); expect(prepare).toHaveBeenCalledTimes(2);
  });
  it('asset construction and module import failures close the session for retry', async () => {
    const { target, sessions } = setup();
    await target.__alloLoadVerifiedRuntime('pdfjs');
    sessions[0].asset.mockImplementationOnce(() => { throw new Error('Blob allocation failed'); });
    await expect(target.__alloGetVerifiedRuntimeAsset('pdfjs', 'worker')).rejects.toThrow('Blob allocation failed');
    expect(sessions[0].dispose).toHaveBeenCalledTimes(1);
    await target.__alloLoadVerifiedRuntime('pdfjs');
    sessions[1].load.mockRejectedValueOnce(new Error('module failed'));
    await expect(target.__alloLoadVerifiedRuntime('pdfjs')).rejects.toThrow('module failed');
    expect(sessions[1].dispose).toHaveBeenCalledTimes(1);
    expect(await target.__alloLoadVerifiedRuntime('pdfjs')).toEqual({ version: 42 });
  });
  it.each([
    ['__alloLoadVerifiedRuntime', 'load', []],
    ['__alloGetVerifiedRuntimeAsset', 'asset', ['worker']],
    ['__alloCreateVerifiedWorker', 'createWorker', ['protocol', { type: 'module' }]],
  ])('cancelled pending %s cannot create activity after close was requested', async (api, method, args) => {
    const { target, prepare } = setup(); let resolve;
    const old = { load: vi.fn(), asset: vi.fn(), createWorker: vi.fn(), dispose: vi.fn() };
    prepare.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const pending = target[api]('slow', ...args); pending.catch(() => {});
    target.__alloDisposeVerifiedRuntime('slow');
    const fresh = target.__alloLoadVerifiedRuntime('slow');
    resolve(old);
    await expect(pending).rejects.toMatchObject({ code: 'ALLO_RUNTIME_INTEGRITY' });
    expect(await fresh).toEqual({ version: 42 });
    expect(old[method]).not.toHaveBeenCalled(); expect(old.dispose).toHaveBeenCalledTimes(1);
    expect(prepare).toHaveBeenCalledTimes(2);
  });
});
