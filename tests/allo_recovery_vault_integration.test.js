import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const integration = require('../allo_recovery_vault_integration_module.js');

describe('recovery vault device repository', () => {
  it('uses an exact-value token for one-time legacy migration', async () => {
    const legacy = { version: 1, snapshots: [{ id: 'a', title: 'private' }] };
    const storage = {
      get: vi.fn(async () => legacy),
      compareAndSwap: vi.fn(async () => ({ applied: true, revision: 1 }))
    };
    const repo = integration.createDeviceRepository(storage);
    const head = await repo.read();

    expect(head).toEqual({
      revision: { mode: 'value', value: legacy },
      store: legacy
    });
    expect(await repo.compareAndSwap(head.revision, { version: 2, kind: 'alloflow-recovery-vault' })).toBe(true);
    expect(storage.compareAndSwap).toHaveBeenCalledWith(
      'workspace_recovery',
      'store_v1',
      { mode: 'value', value: legacy },
      { version: 2, kind: 'alloflow-recovery-vault' },
      { queue: false }
    );
  });

  it('uses numeric revisions after protection and does not expose conflict values', async () => {
    const stored = { version: 2, revision: 7, kind: 'alloflow-recovery-vault', records: [] };
    const storage = {
      get: vi.fn(async () => stored),
      compareAndSwap: vi.fn(async () => ({ applied: false, current: { exists: true, revision: 8 } }))
    };
    const repo = integration.createDeviceRepository(storage);
    const head = await repo.read();

    expect(head.revision).toBe(7);
    expect(await repo.compareAndSwap(7, { ...stored, revision: 999 })).toBe(false);
    expect(storage.compareAndSwap.mock.calls[0][2]).toBe(7);
  });

  it('uses an absent token for first creation and rejects non-atomic storage', async () => {
    const storage = {
      get: vi.fn(async () => null),
      compareAndSwap: vi.fn(async () => ({ applied: true, revision: 1 }))
    };
    const repo = integration.createDeviceRepository(storage, { namespace: 'custom', key: 'vault' });
    expect(await repo.read()).toEqual({ revision: { mode: 'absent' }, store: null });
    await repo.compareAndSwap({ mode: 'absent' }, { version: 1, snapshots: [] });
    expect(storage.compareAndSwap.mock.calls[0].slice(0, 2)).toEqual(['custom', 'vault']);
    expect(() => integration.createDeviceRepository({ get() {} })).toThrow(/compare-and-swap/i);
  });
});
