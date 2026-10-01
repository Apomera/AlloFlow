import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
beforeAll(() => { window.__alloUtils = { cleanJson: x => x }; loadAlloModule('content_engine_module.js'); });
function fixture() {
  let revision = null;
  const completions = [];
  const state = { gradeLevel: '9', leveledTextLanguage: 'Spanish', sourceTopic: 'Water', generatedContent: { id: 'one', type: 'simplified', data: 'Agua.', config: { grade: '3', language: 'Spanish' } }, selectionMenu: { text: 'Water.', language: 'English', x: 0, y: 0 }, setSelectionMenu: value => { state.selectionMenu = value; }, setIsCustomReviseOpen: vi.fn(), setCustomReviseInstruction: vi.fn(), setRevisionData: value => { revision = typeof value === 'function' ? value(revision) : value; } };
  const callGemini = vi.fn(() => new Promise((resolve, reject) => completions.push({ resolve, reject })));
  const addToast = vi.fn();
  const engine = window.AlloModules.createContentEngine({ getState: () => state, callGemini, addToast, t: x => x });
  return { engine, state, completions, callGemini, addToast, revision: () => revision };
}
describe('Adapted explanations keep request and resource ownership', () => {
  it('uses the selected language and the saved resource grade', async () => {
    const f = fixture(); const p = f.engine.handleReviseSelection('explain');
    expect(f.callGemini.mock.calls[0][0]).toContain('Output Language: English');
    expect(f.callGemini.mock.calls[0][0]).toContain('for a 3 student');
    f.completions[0].resolve('Water explained.'); await p;
    expect(f.revision().result).toBe('Water explained.');
  });
  it('does not reopen a dismissed explanation', async () => {
    const f = fixture(); const p = f.engine.handleReviseSelection('explain'); f.engine.closeRevision();
    f.completions[0].resolve('Late'); await p; expect(f.revision()).toBeNull();
  });
  it.each([false, true])('ignores an older result or failure (failure=%s)', async fail => {
    const f = fixture(); const first = f.engine.handleReviseSelection('explain');
    f.state.selectionMenu = { text: 'Rain.', language: 'English', x: 0, y: 0 };
    const second = f.engine.handleReviseSelection('explain');
    f.completions[1].resolve('Rain explained.'); await second;
    if (fail) f.completions[0].reject(new Error('Old error')); else f.completions[0].resolve('Old explanation');
    await first; expect(f.revision().result).toBe('Rain explained.'); expect(f.addToast).not.toHaveBeenCalled();
  });
  it.each(['id', 'data'])('ignores results after the resource %s changes', async field => {
    const f = fixture(); const p = f.engine.handleReviseSelection('explain');
    f.state.generatedContent = { ...f.state.generatedContent, [field]: 'changed' };
    f.completions[0].resolve('Stale'); await p; expect(f.revision().result).toBeNull();
  });
});
