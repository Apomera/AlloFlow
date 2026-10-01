import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

// Pictures on word supports, in the editor and the original reader (2026-09-23).
const require = createRequire(import.meta.url);
let React, createRoot, act, Editor, contract, View, pure, phase, root, host;
const RealFileReader = globalThis.FileReader;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('instructional_context_module.js'); loadAlloModule('alt_text_module.js');
  loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js'); loadAlloModule('view_simplified_module.js');
  contract = window.AlloModules.InstructionalContext; View = window.AlloModules.SimplifiedView;
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers;
  // The editor straight from source, as the gloss-editor tests compile it.
  const source = readFileSync(process.env.ALLO_VIEW_SOURCE_CANDIDATE || 'view_simplified_source.jsx', 'utf8');
  const start = source.indexOf('  function findReadingGlossOccurrences(');
  const end = source.indexOf('  function SimplifiedView(props)', start);
  const compiled = require('@babel/core').transformSync(source.slice(start, end), {
    plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]], babelrc: false, configFile: false
  }).code;
  Editor = new Function('React', 'getInstructionalContextApi', compiled + '\nreturn ReadingGlossEditor;')(React, () => contract);
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; host = null; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const TEXT = 'The heron waded through the marsh near the mill.';
const CREDIT = { set: 'Mulberry Symbols', author: 'Steve Lee', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', via: 'Global Symbols', url: 'https://mulberrysymbols.org' };
const at = (quote, extra = {}) => { const start = TEXT.indexOf(quote); return { id: 'g-' + start, start, end: start + quote.length, quote, text: 'Meaning of ' + quote, kind: 'gloss', priority: 'helpful', origin: 'generated', pinned: false, ...extra }; };
const pic = (n, alt) => ({ src: 'data:image/png;base64,' + 'A'.repeat(n - 'data:image/png;base64,'.length), alt, source: 'mulberry', attribution: CREDIT });

function mountEditor(entries) {
  const item = contract.createSupportedReading(TEXT, { id: 'original' });
  let props = { item, supports: contract.validateReadingSupports(item, entries), disabled: false };
  const onUpdate = vi.fn(async (owner, action) => {
    const supports = action.type === 'upsert' ? contract.upsertReadingSupport(owner, props.supports, action.annotation)
      : action.type === 'remove' ? contract.removeReadingSupport(owner, props.supports, action.id)
      : contract.setReadingSupportPinned(owner, props.supports, action.id, action.pinned);
    props = { ...props, supports }; render();
    return supports; // the real host returns the saved supports
  });
  props.onUpdate = onUpdate;
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const render = () => root.render(React.createElement(Editor, props));
  act(render);
  return { onUpdate, get supports() { return props.supports; } };
}
const byText = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text || node.textContent.trim().startsWith(text));
const click = async node => { await act(async () => { node.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); };
async function until(check) { for (let waited = 0; !check() && waited < 3000; waited += 20) await act(async () => { await new Promise(r => setTimeout(r, 20)); }); return check(); }
function stubMulberryAndCanvas(shrunk) {
  vi.stubGlobal('FileReader', RealFileReader);
  vi.stubGlobal('fetch', vi.fn(async (url) => String(url).startsWith('https://globalsymbols.com/api/v1/labels/search')
    ? { ok: true, json: async () => [{ id: 1, text: 'heron', picto: { id: 9, image_url: 'https://globalsymbols.com/uploads/heron.svg' } }] }
    : { ok: true, blob: async () => new Blob(['<svg xmlns="http://www.w3.org/2000/svg"/>'], { type: 'image/svg+xml' }) }));
  vi.stubGlobal('Image', class { naturalWidth = 400; naturalHeight = 400; set src(value) { if (value) queueMicrotask(() => this.onload()); } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillRect: vi.fn(), drawImage: vi.fn() });
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(shrunk);
}
async function pickHeronSymbol() {
  await click(byText('Choose a picture'));
  const picker = host.querySelector('[data-classroom-image-picker]');
  expect(picker, 'shared picker in the editor').toBeTruthy();
  expect(picker.querySelector('input[type=search]').value).toBe('heron');
  await act(async () => picker.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(await until(() => host.querySelector('button[aria-label="Use symbol: heron"]'))).toBeTruthy();
  await click(host.querySelector('button[aria-label="Use symbol: heron"]'));
}

describe('choosing a picture for a word support', () => {
  it('saves a small symbol with its credit on the support', async () => {
    stubMulberryAndCanvas('data:image/png;base64,QUJDRA==');
    const view = mountEditor([at('heron')]);
    await click(byText('Review word supports'));
    await click(host.querySelector('button[aria-label^="Edit gloss for heron"]'));
    await pickHeronSymbol();
    expect(await until(() => byText('Remove picture'))).toBeTruthy();
    expect(document.activeElement.textContent).toBe('Choose a different picture');
    // Shrunk to a 200px copy before it is kept.
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/png');
    await click(byText('Save word support'));
    const sent = view.onUpdate.mock.calls.at(-1)[1].annotation;
    expect(sent.image).toMatchObject({ src: 'data:image/png;base64,QUJDRA==', alt: 'heron', source: 'mulberry', attribution: CREDIT });
    const saved = view.supports.annotations.find(entry => entry.quote === 'heron');
    expect(saved).toMatchObject({ origin: 'educator', image: { src: 'data:image/png;base64,QUJDRA==', alt: 'heron' } });
    expect(host.querySelector('[role=alert]')).toBe(null);
    expect([...host.querySelectorAll('li img')].some(img => img.getAttribute('alt') === 'heron')).toBe(true);
  });

  it('refuses a picture that would not fit the reading, keeping the draft as it was', async () => {
    stubMulberryAndCanvas('data:image/png;base64,' + 'B'.repeat(8000));
    mountEditor([at('marsh', { origin: 'educator', image: pic(30000, 'marsh') }), at('mill', { origin: 'educator', image: pic(30000, 'mill') }), at('heron')]);
    await click(byText('Review word supports'));
    await click(host.querySelector('button[aria-label^="Edit gloss for heron"]'));
    await pickHeronSymbol();
    expect(await until(() => host.querySelector('[role=alert]'))).toBeTruthy();
    expect(host.querySelector('[role=alert]').textContent).toMatch(/no room for another picture/);
    expect(byText('Remove picture')).toBeUndefined();
  });

  it('removes a picture when the teacher asks', async () => {
    const view = mountEditor([at('marsh', { origin: 'educator', image: pic(400, 'A marsh.') })]);
    await click(byText('Review word supports'));
    await click(host.querySelector('button[aria-label^="Edit gloss for marsh"]'));
    await click(byText('Remove picture'));
    // The removed button's place: focus moves to the picture button, not the page.
    expect(document.activeElement.textContent).toBe('Choose a picture');
    await click(byText('Save word support'));
    expect(view.onUpdate.mock.calls.at(-1)[1].annotation.image).toBe(null);
    expect('image' in view.supports.annotations[0]).toBe(false);
  });

  it('treats a new picture as an unsaved change', async () => {
    stubMulberryAndCanvas('data:image/png;base64,QUJDRA==');
    mountEditor([at('heron'), at('mill')]);
    await click(byText('Review word supports'));
    await click(host.querySelector('button[aria-label^="Edit gloss for heron"]'));
    await pickHeronSymbol();
    expect(await until(() => byText('Remove picture'))).toBeTruthy();
    await click(host.querySelector('button[aria-label^="Edit gloss for mill"]'));
    expect(host.querySelector('[role=alertdialog]').textContent).toMatch(/Discard unsaved word support changes/);
  });
});

describe('pictures in the original reader', () => {
  function mountReader(item) {
    const noop = () => {};
    const props = { ComplexityGauge: () => null, setComplexityLevel: vi.fn(), setSaveOriginalOnAdjust: vi.fn(), setReadingTheme: vi.fn(), setSelectionMenu: vi.fn(), setIsCustomReviseOpen: vi.fn(), setInteractionMode: vi.fn(), setIsCompareMode: vi.fn(), setIsFluencyMode: vi.fn(), stopPlayback: vi.fn(), closeDefinition: vi.fn(), closePhonics: vi.fn(), closeRevision: vi.fn(), handleToggleIsEditingLeveledText: vi.fn(), t: k => k, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: true, isProcessing: false, isPlaying: false, interactionMode: 'read', history: [], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak: vi.fn(), handleWordClick: vi.fn(), handleQuickAddGlossary: vi.fn(), handlePhonicsClick: vi.fn(), isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: { read: '', define: '', 'add-glossary': '', revise: '' }, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => React.createElement('div', null, text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: x => x, latestGlossary: [], generatedContent: item };
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    act(() => root.render(React.createElement(View, props)));
  }
  const supported = (supports) => {
    const item = contract.createSupportedReading(TEXT, { id: 'original' });
    item.readingSupports = contract.validateReadingSupports(item.sourceSnapshot, supports);
    return item;
  };

  it('shows the picture beside its word, with the credits after the reading', () => {
    mountReader(supported([at('heron', { origin: 'educator', image: pic(400, 'A grey heron.') }), at('marsh')]));
    const picture = host.querySelector('[data-original-source] [data-reading-gloss-picture]');
    expect(picture, 'inline picture').toBeTruthy();
    expect(picture.getAttribute('alt')).toBe('A grey heron.');
    expect(picture.closest('[data-reading-gloss]').textContent).toContain('Meaning of heron');
    const credits = host.querySelector('[data-reading-picture-credits]');
    expect(credits.textContent).toContain('heron: Mulberry Symbols by Steve Lee, CC BY-SA 4.0, via Global Symbols');
    expect(credits.querySelector('a').getAttribute('href')).toBe('https://mulberrysymbols.org');
    // CC BY-SA asks for a link to the license itself.
    expect([...credits.querySelectorAll('a')].map(link => [link.textContent, link.getAttribute('href')])).toEqual([['Source', 'https://mulberrysymbols.org'], ['License', 'https://creativecommons.org/licenses/by-sa/4.0/']]);
    // The reading itself is untouched.
    expect(host.querySelector('[data-original-source]').textContent).toContain('The heron');
  });

  it('shows no credits when no support has a picture', () => {
    mountReader(supported([at('heron'), at('marsh')]));
    expect(host.querySelector('[data-reading-gloss-picture]')).toBe(null);
    expect(host.querySelector('[data-reading-picture-credits]')).toBe(null);
  });
});
