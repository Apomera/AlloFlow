import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
beforeAll(() => { window.__alloUtils = { cleanJson: x => x }; loadAlloModule('content_engine_module.js'); });
function fixture(callGemini = vi.fn().mockResolvedValue('A definition.')) {
  let definition = null, phonics = null;
  const state = { interactionMode: 'define', gradeLevel: '5', sourceTopic: 'Water', leveledTextLanguage: 'French', generatedContent: { config: { language: 'Chinese' } }, setDefinitionData: value => { definition = typeof value === 'function' ? value(definition) : value; }, setPhonicsData: value => { phonics = typeof value === 'function' ? value(phonics) : value; }, setSelectionMenu: () => {} };
  const engine = window.AlloModules.createContentEngine({ getState: () => state, callGemini, addToast: vi.fn(), t: x => x });
  const paragraph = document.createElement('div'); paragraph.dataset.readingLanguage = 'Chinese';
  const word = document.createElement('span'); paragraph.append(word);
  word.getBoundingClientRect = () => ({ left: 64, bottom: 180 });
  const event = { stopPropagation: () => {}, currentTarget: word, clientX: 0, clientY: 0 };
  return { engine, state, callGemini, event, paragraph, definition: () => definition, phonics: () => phonics };
}
describe('Adapted word-help language and request ownership', () => {
  it('defines a single Chinese character with saved language and keyboard anchor', async () => {
    const f = fixture(); await f.engine.handleWordClick('水', f.event);
    expect(f.callGemini).toHaveBeenCalledWith(expect.stringContaining('Output Language: Chinese'));
    expect(f.definition()).toMatchObject({ word: '水', text: 'A definition.', x: 64, y: 180 });
  });
  it('retains combining marks and the language of the selected bilingual segment', async () => {
    const f = fixture(); f.paragraph.dataset.readingLanguage = 'Hindi'; await f.engine.handleWordClick('पानी', f.event);
    expect(f.definition().word).toBe('पानी'); expect(f.callGemini).toHaveBeenCalledWith(expect.stringContaining('Output Language: Hindi'));
  });
  it('ignores an older definition that finishes after a later word', async () => {
    const resolvers = []; const f = fixture(vi.fn(() => new Promise(resolve => resolvers.push(resolve))));
    const first = f.engine.handleWordClick('水', f.event), second = f.engine.handleWordClick('雨', f.event);
    resolvers[1]('Rain.'); await second; resolvers[0]('Water.'); await first;
    expect(f.definition()).toMatchObject({ word: '雨', text: 'Rain.' });
  });
  it('does not reopen a dismissed definition after its request finishes', async () => {
    let finish; const f = fixture(vi.fn(() => new Promise(resolve => { finish = resolve; })));
    const request = f.engine.handleWordClick('水', f.event); f.engine.closeDefinition(); finish('Water.'); await request;
    expect(f.definition()).toBeNull();
  });
  it('uses the saved segment language for phonics', async () => {
    const f = fixture(vi.fn().mockResolvedValue('{"ipa":"x","phoneticSpelling":"x","syllables":["x"]}'));
    await f.engine.handlePhonicsClick('水', f.event);
    expect(f.callGemini).toHaveBeenCalledWith(expect.stringContaining('Chinese word'), true);
    expect(f.phonics().word).toBe('水'); expect(f.phonics().x).toBe(64);
  });
});
