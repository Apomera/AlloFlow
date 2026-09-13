import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
beforeAll(() => { window.__alloUtils = { cleanJson: x => x };loadAlloModule('content_engine_module.js'); });
afterEach(() => { delete window.AlloDictionary;vi.unstubAllGlobals(); });
function fixture() {
  const state = { generatedContent: { id: 'one', type: 'simplified', data: 'Agua.', config: { language: 'Spanish' } }, leveledTextLanguage: 'Spanish', selectedVoice: 'Kore', voiceSpeed: 1 };
  state.setPhonicsData = value => { state.phonicsData = typeof value === 'function' ? value(state.phonicsData) : value; };
  const callTTS = vi.fn().mockResolvedValue('https://example.test/word.wav');
  const callGemini = vi.fn().mockResolvedValue(JSON.stringify({ ipa: 'aɣwa', phoneticSpelling: 'a-gua', syllables: ['a', 'gua'] }));
  const engine = window.AlloModules.createContentEngine({ getState: () => state, callGemini, callTTS, addToast: vi.fn(), t: x => x });
  return { state, engine, callGemini, callTTS };
}
describe('Adapted pronunciation is student controlled', () => {
  it('returns word analysis and its language without eager audio', async () => {
    const f = fixture();await f.engine.handlePhonicsClick('agua', null, { audioPlayback: 'reader' });
    expect(f.state.phonicsData.language).toBe('Spanish');expect(f.state.phonicsData.isLoading).toBe(false);
    expect(f.callTTS).not.toHaveBeenCalled();
  });
  it('keeps the clicked bilingual segment language', async () => {
    const f = fixture();window.AlloDictionary = { lookup: vi.fn().mockResolvedValue(null) };
    const event = { stopPropagation: vi.fn(), currentTarget: { closest: () => ({ dataset: { readingLanguage: 'English' } }) } };
    await f.engine.handlePhonicsClick('water', event, { audioPlayback: 'reader' });
    expect(f.state.phonicsData.language).toBe('English');expect(f.callGemini.mock.calls[0][0]).toContain('English word');
  });
  it('preserves legacy pronunciation for other callers', async () => {
    vi.stubGlobal('Audio', function Audio() { this.play = vi.fn().mockResolvedValue(undefined); });
    const f = fixture();await f.engine.handlePhonicsClick('agua');expect(f.callTTS).toHaveBeenCalledWith('agua', 'Kore', 1, 2, 'Spanish');
    expect(f.state.phonicsData.audioUrl).toContain('word.wav');
  });
  it('does not reopen word help after dismissal during analysis', async () => {
    const f = fixture();let complete;f.callGemini.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const pending = f.engine.handlePhonicsClick('agua', null, { audioPlayback: 'reader' });f.engine.closePhonics();
    complete('{}');await pending;expect(f.state.phonicsData).toBeNull();expect(f.callTTS).not.toHaveBeenCalled();
  });
});
