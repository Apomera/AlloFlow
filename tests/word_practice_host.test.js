import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const host = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const start = host.indexOf('    window.__alloLazyWordPractice =');
const end = host.indexOf('    // Teaching-script research', start);
function harness() {
  const open = vi.fn(), ensure = vi.fn(async () => ({ open })), load = vi.fn(), retry = vi.fn();
  const window = { AlloModules: {}, __alloEnsureLazyModule: ensure, __alloRetryModule: retry,
    __alloEnsurePptxGen: vi.fn(), __ALLO_PHONEME_AUDIO_BANK: { sh: 'recording' } };
  vm.runInNewContext(host.slice(start, end), { window, loadModule: load });
  return { window, open, ensure, load, retry };
}
describe('shared word presenter host', () => {
  it('loads on demand and retries through the existing module registry', () => {
    const h = harness();
    h.window.__alloLazyWordPractice();
    expect(h.load).toHaveBeenCalledWith('WordPractice', expect.stringContaining('word_practice_module.js'));
    h.window.__alloModuleRegistry = { WordPractice: { status: 'failed' } };
    h.window.__alloLazyWordPractice();
    expect(h.retry).toHaveBeenCalledWith('WordPractice');
  });
  it('opens the same presenter with caller content and the existing PowerPoint loader', async () => {
    const h = harness();
    await h.window.__alloOpenWordPractice({ words: ['ship'], language: 'English' });
    expect(h.open).toHaveBeenCalledWith(expect.objectContaining({ words: ['ship'], ensurePptx: h.window.__alloEnsurePptxGen, phonemeBank: h.window.__ALLO_PHONEME_AUDIO_BANK }));
  });
  it('does not open a stale request after its source view has closed', async () => {
    const h = harness(), controller = new AbortController();
    let finish;
    h.ensure.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const pending = h.window.__alloOpenWordPractice({ words: ['ship'], signal: controller.signal });
    controller.abort(); finish({ open: h.open }); await pending;
    expect(h.open).not.toHaveBeenCalled();
  });
  it('does not apply the English phoneme bank to another language', async () => {
    const h = harness();
    await h.window.__alloOpenWordPractice({ words: ['gato'], language: 'Spanish' });
    expect(h.open.mock.calls[0][0].phonemeBank).toEqual({});
    const custom = { g: 'prepared Spanish clip' };
    await h.window.__alloOpenWordPractice({ words: ['gato'], language: 'es', phonemeBank: custom });
    expect(h.open.mock.calls[1][0].phonemeBank).toBe(custom);
  });
});
