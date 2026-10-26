import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
function between(start, end, from = 0) {
  const first = source.indexOf(start, from);
  const last = source.indexOf(end, first + start.length);
  if (first < 0 || last <= first) throw new Error(`Missing host helper: ${start}`);
  return source.slice(first, last);
}
const dataSource = between('const _initAlloData = async () => {', 'if (!_alloQrFirebaseHandoffRequiredButMissing');
const componentStart = source.indexOf('const AlloFlowContent = () => {');
const moduleWaitSource = between('  const _alloAwaitModules =', '  const generateBilingualText =', componentStart);
const bilingualSource = between('  const generateBilingualText =', '  let __alloHostHandlersCache = null;', componentStart);

function dataFixture(window = {}) {
  const ctx = {
    window, alloData: null, DATA_BACKEND: 'local', POCKETBASE_URL: 'https://example.invalid',
    firebaseApp: {}, db: {}, auth: {}, _alloRuntimeAppId: 'fixture',
    debugLog: vi.fn(), warnLog: vi.fn(), console: { log: vi.fn() },
  };
  vm.createContext(ctx);
  const init = vm.runInContext(dataSource + '\n_initAlloData;', ctx);
  return { ctx, init };
}

function bilingualFixture(modules = {}) {
  const window = {
    AlloModules: modules, __alloModuleRegistry: {},
    __alloEnsureLazyModule: vi.fn(), __alloPromoteModule: vi.fn(),
  };
  const ctx = { window, addToast: vi.fn() };
  vm.createContext(ctx);
  const generate = vm.runInContext('(function () {\n' + moduleWaitSource + '\n' + bilingualSource + '\nreturn generateBilingualText;\n})()', ctx);
  return { ctx, window, generate };
}

describe('optional data-provider initialization uses its browser export', () => {
  it('initializes a provider exposed only on window with the existing configuration', async () => {
    const provider = { backend: 'local' };
    const initAlloData = vi.fn(async () => provider);
    const { ctx, init } = dataFixture({ initAlloData });
    await init();
    expect(initAlloData).toHaveBeenCalledWith({
      backend: 'local', pocketbaseUrl: 'https://example.invalid', firebaseApp: ctx.firebaseApp,
      firestoreDb: ctx.db, firebaseAuth: ctx.auth, appId: 'fixture',
      debugLog: ctx.debugLog, warnLog: ctx.warnLog,
    });
    expect(ctx.alloData).toBe(provider);
    expect(ctx.warnLog).not.toHaveBeenCalled();
  });

  it('keeps the existing fallback when the optional window export is absent', async () => {
    const { ctx, init } = dataFixture();
    ctx.initAlloData = vi.fn();
    await init();
    expect(ctx.initAlloData).not.toHaveBeenCalled();
    expect(ctx.alloData).toBeNull();
    expect(ctx.debugLog).toHaveBeenCalledWith('[AlloFlow] DataProvider not loaded — using raw Firebase calls');
  });

  it('reports provider initialization failure without replacing the fallback', async () => {
    const { ctx, init } = dataFixture({ initAlloData: vi.fn(async () => { throw new Error('Provider unavailable'); }) });
    await init();
    expect(ctx.alloData).toBeNull();
    expect(ctx.warnLog).toHaveBeenCalledWith('[AlloFlow] DataProvider init failed, Firebase-only mode:', 'Provider unavailable');
  });
});

describe('the bilingual host wrapper shares its scoped module waiter', () => {
  it('passes the original request to an already registered helper', async () => {
    const helper = vi.fn(async () => 'Translated passage');
    const { window, generate } = bilingualFixture({ TextPipelineHelpers: { generateBilingualText: helper } });
    const callGemini = vi.fn(), policy = { enabled: true, target: 'Spanish' };
    expect(await generate('Source passage', 'Spanish', callGemini, policy)).toBe('Translated passage');
    expect(helper).toHaveBeenCalledWith('Source passage', 'Spanish', callGemini, policy);
    expect(window.__alloEnsureLazyModule).not.toHaveBeenCalled();
  });

  it('promotes a cold module and retries through the same wrapper after registration', async () => {
    const { ctx, window, generate } = bilingualFixture();
    const helper = vi.fn(async () => 'Cold translation');
    window.__alloEnsureLazyModule.mockImplementation(async (_name, promote, key) => {
      promote();
      window.AlloModules[key] = { generateBilingualText: helper };
    });
    const request = vi.fn(), policy = { enabled: true, target: 'French' };
    expect(await generate('Passage', 'French', request, policy)).toBe('Cold translation');
    expect(window.__alloEnsureLazyModule).toHaveBeenCalledWith('TextPipelineHelpersModule', expect.any(Function), 'TextPipelineHelpers', undefined);
    expect(window.__alloPromoteModule).toHaveBeenCalledWith('TextPipelineHelpersModule');
    expect(helper).toHaveBeenCalledTimes(1);
    expect(helper).toHaveBeenCalledWith('Passage', 'French', request, policy);
    expect(ctx.addToast).toHaveBeenCalledWith('Getting this tool ready…', 'info');
    expect(window.__alloModuleWaitToasts).toEqual({});
  });

  it('keeps the existing visible loading failure and does not retry a rejected load', async () => {
    const { ctx, window, generate } = bilingualFixture();
    const failure = new Error('Offline');
    window.__alloEnsureLazyModule.mockRejectedValue(failure);
    await expect(generate('Passage', 'Spanish', vi.fn(), {})).rejects.toMatchObject({
      message: 'Could not finish loading this tool. Nothing was changed. Check the connection, then try again.',
      cause: failure,
    });
    expect(window.__alloEnsureLazyModule).toHaveBeenCalledTimes(1);
    expect(ctx.addToast).toHaveBeenCalledWith('Could not finish loading this tool. Nothing was changed. Check the connection, then try again.', 'error');
    expect(window.__alloModuleWaitToasts).toEqual({});
  });
});
