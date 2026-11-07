// Teacher syllable review and how its result reaches the reader. Loads the compiled
// reader module the app loads, so these cover the bundled panel and core.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, act, Panel, core, root, host;
const table = {
  lookup: word => ({
    river: { parts: ['riv', 'er'], check: false },
    table: { parts: ['ta', 'ble'], check: false },
    cat: { parts: ['cat'], check: false },
    heidi: { parts: ['hei', 'di'], check: true },
  }[word] || null),
};
const text = (key, fallback, params) => String(fallback).replace(/\{(\w+)\}/g, (m, name) => (params && params[name] != null ? params[name] : m));

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('view_simplified_module.js');
  Panel = window.AlloModules.SyllablePrepPanel;
  core = window.AlloModules.SyllablePrep;
});
beforeEach(() => { window.AlloModules.SyllableTableEn = table; });
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; delete window.AlloModules.SyllableTableEn; });

async function mount(extra = {}) {
  const props = { text, language: 'English', sourceText: 'The river and the table. Heidi saw a cat and a zorble.', savedPrep: undefined, aiFn: null, onSave: vi.fn(), onClose: vi.fn(), ...extra };
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => { root.render(React.createElement(Panel, props)); });
  await act(async () => { await new Promise(done => setTimeout(done, 0)); });
  return props;
}
const buttons = () => [...host.querySelectorAll('button')];
const button = label => buttons().find(el => el.textContent.trim() === label || el.getAttribute('aria-label') === label);
const click = async el => { await act(async () => { el.click(); await new Promise(done => setTimeout(done, 0)); }); };
const summary = () => host.querySelector('[role="status"]').textContent;

describe('the review panel', () => {
  it('registers from the compiled reader module', () => {
    expect(typeof Panel).toBe('function');
    expect(typeof core.applyToWords).toBe('function');
  });
  it('makes first suggestions on the device with no AI call', async () => {
    const aiFn = vi.fn();
    await mount({ aiFn });
    expect(aiFn).not.toHaveBeenCalled();
    expect(summary()).toContain('to check');
    expect(host.textContent).toContain('hei');
  });
  it('lists flagged words first and hides sure ones until asked', async () => {
    await mount();
    expect(host.textContent).toContain('zor');
    expect(host.textContent).not.toContain('riv ·');
    await click(button('Show all words'));
    expect(host.textContent).toContain('riv · er');
  });
  it('best match sends only unsettled words to AI, and only the words', async () => {
    const aiFn = vi.fn(async () => '{"heidi":["hei","di"],"zorble":["zor","ble"]}');
    await mount({ aiFn });
    await click(button('Suggest syllables'));
    expect(aiFn).toHaveBeenCalledTimes(1);
    const prompt = aiFn.mock.calls[0][0];
    expect(prompt).toContain('heidi');
    expect(prompt).toContain('zorble');
    expect(prompt).not.toContain('river');
    expect(prompt).not.toContain('saw a cat');
  });
  it('this-device-only never calls AI', async () => {
    const aiFn = vi.fn();
    await mount({ aiFn });
    await click(host.querySelector('input[value="device"]'));
    await click(button('Suggest syllables'));
    expect(aiFn).not.toHaveBeenCalled();
  });
  it('AI for every word sends all of them and keeps a disagreement flagged', async () => {
    const aiFn = vi.fn(async () => '{"river":["ri","ver"],"table":["ta","ble"]}');
    const props = await mount({ aiFn, sourceText: 'The river table.' });
    await click(host.querySelector('input[value="ai"]'));
    await click(button('Suggest syllables'));
    expect(aiFn.mock.calls[0][0]).toContain('river');
    await click(button('Save for students'));
    const saved = core.readPrep(props.onSave.mock.calls[0][0]);
    expect(saved.words.get('river')).toEqual(['ri', 'ver']);
    expect(saved.check.has('river')).toBe(true);
    expect(saved.check.has('table')).toBe(false);
  });
  it('a failed AI call keeps device suggestions and says so', async () => {
    await mount({ aiFn: vi.fn(async () => { throw new Error('quota'); }) });
    await click(button('Suggest syllables'));
    expect(host.querySelector('[role="alert"]').textContent).toContain('AI could not answer');
    expect(host.textContent).toContain('hei');
  });
  it('turns off AI choices when AI is not available', async () => {
    await mount({ aiFn: null });
    expect(host.querySelector('input[value="ai"]').disabled).toBe(true);
    expect(host.querySelector('input[value="auto"]').disabled).toBe(true);
    expect(host.querySelector('input[value="device"]').checked).toBe(true);
  });
  it('a teacher can move a division with the keyboard-reachable gaps', async () => {
    const props = await mount({ sourceText: 'Heidi.' });
    await click(button('Change heidi'));
    await click(button('Divide between hei and di'));
    await click(button('Divide between he and idi'));
    await click(button('Save for students'));
    const saved = core.readPrep(props.onSave.mock.calls[0][0]);
    expect(saved.words.get('heidi')).toEqual(['he', 'idi']);
    expect(saved.edited.has('heidi')).toBe(true);
    expect(saved.check.has('heidi')).toBe(false);
  });
  it('keeps a teacher change through a new run unless told to replace it', async () => {
    const aiFn = vi.fn(async () => '{"heidi":["hei","di"]}');
    const props = await mount({ sourceText: 'Heidi.', aiFn });
    await click(button('Change heidi'));
    await click(button('Divide between hei and di'));
    await click(button('Suggest syllables'));
    expect(aiFn).not.toHaveBeenCalled();
    await click(button('Save for students'));
    expect(core.readPrep(props.onSave.mock.calls[0][0]).words.get('heidi')).toEqual(['heidi']);
  });
  it('confirming a flagged word lets students see it', async () => {
    const props = await mount({ sourceText: 'Heidi.' });
    await click(button('Confirm heidi'));
    await click(button('Save for students'));
    expect(core.lookupFromPrep(props.onSave.mock.calls[0][0]).get('heidi')).toEqual(['hei', 'di']);
  });
  it('an unconfirmed flagged word stays whole for students', async () => {
    const props = await mount({ sourceText: 'Heidi.' });
    await click(button('Save for students'));
    expect(core.lookupFromPrep(props.onSave.mock.calls[0][0]).get('heidi')).toEqual(['heidi']);
  });
  it('closes without asking when the teacher changed nothing', async () => {
    const props = await mount({ sourceText: 'Heidi.' });
    await click(button('Close'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
  it('keeps the Suggest button focusable while it works, so Escape still reaches the dialog', async () => {
    let finish;
    await mount({ sourceText: 'Heidi.', aiFn: () => new Promise(done => { finish = done; }) });
    const suggest = button('Suggest syllables');
    await click(suggest);
    const working = button('Working...');
    expect(working.disabled).toBe(false);
    expect(working.getAttribute('aria-disabled')).toBe('true');
    await act(async () => { finish('{}'); await new Promise(done => setTimeout(done, 0)); });
  });
  it('asks before losing changes', async () => {
    const props = await mount({ sourceText: 'Heidi.' });
    await click(button('Confirm heidi'));
    await click(button('Close'));
    expect(props.onClose).not.toHaveBeenCalled();
    expect(host.textContent).toContain('You have unsaved changes.');
    await click(button('Discard changes'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onSave).not.toHaveBeenCalled();
  });
  it('explains itself when the word list cannot load and AI is unavailable', async () => {
    delete window.AlloModules.SyllableTableEn;
    window.__alloLoadPlugin = vi.fn(async () => false);
    await mount({ sourceText: 'River.' });
    expect(host.querySelector('[role="alert"]').textContent).toContain('did not load');
    delete window.__alloLoadPlugin;
  });
  it('offers no on-device work for other languages but still allows AI', async () => {
    const aiFn = vi.fn(async () => '{"rzeka":["rze","ka"]}');
    await mount({ language: 'Polish', sourceText: 'rzeka', aiFn });
    expect(host.textContent).toContain('This device can only suggest English and Spanish');
    expect(aiFn).not.toHaveBeenCalled();
    await click(button('Suggest syllables'));
    expect(aiFn).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain('rze');
  });
  it('says plainly when a writing system is not supported', async () => {
    await mount({ language: 'Chinese (Simplified)', sourceText: '学校' });
    expect(host.textContent).toContain('not available for this writing system');
    expect(button('Save for students')).toBeUndefined();
  });
  it('restores saved work without any new run', async () => {
    const aiFn = vi.fn();
    const savedPrep = core.buildPrep([{ word: 'heidi', parts: ['he', 'idi'], check: false, edited: true, source: 'teacher' }, { word: 'river', parts: ['riv', 'er'], check: false, source: 'table' }], { language: 'English', method: 'auto' });
    await mount({ sourceText: 'Heidi river.', savedPrep, aiFn });
    expect(aiFn).not.toHaveBeenCalled();
    expect(host.textContent).toContain('he · idi');
    expect(host.textContent).toContain('Your change');
    expect(button('Remove saved syllables')).toBeDefined();
  });
  it('removes saved work', async () => {
    const savedPrep = core.buildPrep([{ word: 'river', parts: ['riv', 'er'], check: false, source: 'table' }], { language: 'English', method: 'auto' });
    const props = await mount({ sourceText: 'river', savedPrep });
    await click(button('Remove saved syllables'));
    expect(props.onSave).toHaveBeenCalledWith(null);
  });
});

describe('where saved syllables travel', () => {
  const anti = readFileSync('AlloFlowANTI.txt', 'utf8');
  it('the device save keeps them', () => {
    expect(anti).toContain('if (item.syllablePrep) serializedItem.syllablePrep = item.syllablePrep;');
  });
  it('a save racing a teacher review carries them', () => {
    expect(anti).toContain("for (const key of ['readingSupports', 'adaptedReadingSupports', 'syllablePrep'])");
  });
  it('a translated copy drops them', () => {
    expect(readFileSync('phase_k_helpers_source.jsx', 'utf8')).toContain("'posEnriched', 'syllablePrep'].forEach(key => { delete copyBase[key]; })");
  });
  it('the student sanitizers leave them intact', () => {
    loadAlloModule('firestore_sync_module.js');
    const prep = core.buildPrep([{ word: 'river', parts: ['riv', 'er'], check: false, source: 'table' }, { word: 'heidi', parts: ['hei', 'di'], check: true, source: 'guess' }], { language: 'English' });
    const item = { id: 'r', type: 'simplified', data: 'River', syllablePrep: prep };
    const cloud = window.sanitizeHistoryForCloud([item])[0];
    const session = window.sanitizeSessionValue(cloud, 'resource');
    expect(session.syllablePrep).toEqual(prep);
    expect(core.lookupFromPrep(session.syllablePrep).get('heidi')).toEqual(['heidi']);
  });
});

describe('the reader word list', () => {
  it('keeps words whole past Latin-1 and in other scripts', () => {
    loadAlloModule('text_pipeline_helpers_module.js');
    const parse = window.AlloModules.TextPipelineHelpers.parseTaggedContent;
    const words = source => parse(source).map(token => token.text).filter(value => value.trim());
    expect(words('między Việt')).toEqual(['między', 'Việt']);
    expect(words('слово, река.')).toEqual(['слово', ',', 'река', '.']);
    expect(words('Plain river, 12 cats.')).toEqual(['Plain', 'river', ',', '12', 'cats', '.']);
  });
  it('applies saved markers to parsed tokens end to end', () => {
    const parse = window.AlloModules.TextPipelineHelpers.parseTaggedContent;
    const out = core.applyToWords(parse('The River, flows.'), new Map([['river', ['riv', 'er']], ['flows', ['flows']]]));
    expect(out.find(token => token.text === 'River').syllables).toEqual(['Riv', 'er']);
    expect(out.map(token => token.text).join('')).toBe('The River, flows.');
  });
});
