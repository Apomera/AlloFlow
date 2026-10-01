import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('utils_pure_source.jsx', 'utf8');
const start = source.indexOf('  get: async (key, options)'), end = source.indexOf('  set: async', start);
function readHarness({ window = {}, bridgeWanted = false, bridge = async () => ({ get: async () => null }) } = {}) {
  return new Function('window', 'warnLog', '_dsBridgeWanted', '_dsBridge', 'return ({' + source.slice(start, end) + '}).get;')(window, vi.fn(), bridgeWanted, bridge);
}
describe('optional strict storage reads for recovery', () => {
  it('distinguishes missing initialization from an empty saved record', async () => {
    const unavailable = readHarness();
    await expect(unavailable('batch')).resolves.toBeNull();
    await expect(unavailable('batch', { throwOnError: true })).rejects.toThrow('not ready');
    const empty = readHarness({ window: { idbKeyval: { get: async () => undefined } } });
    await expect(empty('batch', { throwOnError: true })).resolves.toBeNull();
  });
  it('lets recovery retry an IDB read error while preserving legacy fallback behavior', async () => {
    const get = readHarness({ window: { idbKeyval: { get: async () => { throw new Error('Storage read denied'); } } } });
    await expect(get('batch')).resolves.toBeNull();
    await expect(get('batch', { throwOnError: true })).rejects.toThrow('Storage read denied');
  });
  it('surfaces bridge failures when local storage is empty', async () => {
    const get = readHarness({ window: { idbKeyval: { get: async () => undefined } }, bridgeWanted: true,
      bridge: async () => { throw new Error('Bridge unavailable'); } });
    await expect(get('batch')).resolves.toBeNull();
    await expect(get('batch', { throwOnError: true })).rejects.toThrow('Bridge unavailable');
  });
  it('still decodes saved values and reports corrupt data to strict callers', async () => {
    const values = new Map([['valid', '{"saved":true}'], ['corrupt', 'invalid json']]);
    const get = readHarness({ window: { idbKeyval: { get: async key => values.get(key) } } });
    await expect(get('valid', { throwOnError: true })).resolves.toEqual({ saved: true });
    await expect(get('corrupt')).resolves.toBeNull();
    await expect(get('corrupt', { throwOnError: true })).rejects.toThrow();
  });
});
