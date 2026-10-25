import { beforeEach, describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

let runtime, resources;
beforeEach(() => {
  runtime = vm.createContext({ window: { AlloModules: {} } });
  vm.runInContext(fs.readFileSync('allo_command_context_source.js', 'utf8') + '\nthis.safeRevisionResources = _alloLessonRevisionResources;', runtime);
  resources = runtime.safeRevisionResources;
});
describe('revision availability during native host boot', () => {
  it('never starts the asynchronous host bootstrap from a render-time availability query', () => {
    const pendingBootstrap = vi.fn(() => Promise.resolve([]));
    expect(resources(pendingBootstrap)).toEqual([]); expect(pendingBootstrap).not.toHaveBeenCalled();
  });
  it('returns a synchronous empty list for a pending legacy host shim', () => {
    runtime.window.AlloModules.HostHandlers = () => {};
    expect(resources(() => Promise.resolve([{ supported: true }]))).toEqual([]);
    expect(resources(() => Promise.resolve([])).some(item => item.supported)).toBe(false);
  });
  it('uses the real synchronous resource list after the host is ready', () => {
    runtime.window.AlloModules.HostHandlers = () => {};
    const actual = [{ id: 'q', type: 'quiz', supported: true }];
    expect(resources(() => actual)).toBe(actual); expect(resources(() => actual).some(item => item.supported)).toBe(true);
  });
  it('keeps boot and cached shells usable when a capability is missing or throws', () => {
    runtime.window.AlloModules.HostHandlers = () => {};
    expect(resources(undefined)).toEqual([]); expect(resources(() => null)).toEqual([]);
    expect(resources(() => { throw Error('Not ready'); })).toEqual([]);
  });
});
