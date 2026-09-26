import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

// Word help on ADAPTED texts in the reader (2026-09-24): a word-help list after
// the passage for students when shown, and the teacher's controls and editor.
const require = createRequire(import.meta.url);
let React, createRoot, act, contract, View, pure, phase, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  // Mutation runs load scratch copies so a mutant never reaches the shared files.
  const load = (name, env) => process.env[env] ? new Function(readFileSync(process.env[env], 'utf8'))() : loadAlloModule(name);
  load('instructional_context_module.js', 'ADAPTED_HELP_CONTRACT'); loadAlloModule('alt_text_module.js');
  loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js'); load('view_simplified_module.js', 'ADAPTED_HELP_VIEW');
  contract = window.AlloModules.InstructionalContext; View = window.AlloModules.SimplifiedView;
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; host = null; vi.restoreAllMocks(); });

const PASSAGE = 'The heron walked slowly in the shallow water.';
const CREDIT = { set: 'Mulberry Symbols', author: 'Steve Lee', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', via: 'Global Symbols', url: 'https://mulberrysymbols.org' };
const at = (quote, extra = {}) => { const start = PASSAGE.indexOf(quote); return { id: 'w-' + start, start, end: start + quote.length, quote, text: 'Meaning of ' + quote, ...extra }; };
function adaptedItem(entries, shown, data = PASSAGE) {
  const original = contract.createSupportedReading(contract.createSourceSnapshot('The heron waded through the marsh.', { sourceArtifactId: 'src' }), { id: 'orig', sourceFamilyId: 'heron' });
  const item = { id: 'adapted-1', type: 'simplified', data: PASSAGE, instructionalText: { form: 'adapted', role: 'supplemental' }, sourceSnapshot: original.sourceSnapshot, sourceFamilyId: 'heron', config: { language: 'English' } };
  if (entries) {
    // Added as a teacher would (pictures are kept on teacher-written help only).
    let help;
    for (const entry of entries) help = contract.upsertAdaptedReadingSupport(item, help, entry);
    item.adaptedReadingSupports = contract.setAdaptedReadingSupportsShown(item, help, shown);
  }
  return { ...item, data };
}
// A host like the real one: saves through the contract and re-renders.
function mountReader(item, { teacher = false, compare = false, history = [], mode = 'read', extra = {} } = {}) {
  const noop = () => {};
  let current = item;
  const onUpdateReadingSupports = vi.fn(async (owner, action) => {
    const help = current.adaptedReadingSupports;
    const saved = action.type === 'upsert' ? contract.upsertAdaptedReadingSupport(current, help, action.annotation)
      : action.type === 'remove' ? contract.removeAdaptedReadingSupport(current, help, action.id)
      : action.type === 'show' ? contract.setAdaptedReadingSupportsShown(current, help, action.shown === true)
      : action.type === 'clear' ? contract.clearAdaptedReadingSupports(current)
      : action.type === 'rebase' ? contract.rebaseAdaptedReadingSupports(current, help)
      : action.type === 'import' ? contract.importOriginalSupportsIntoAdapted(current, help, action.annotations)
      : contract.setAdaptedReadingSupportPinned(current, help, action.id, action.pinned === true);
    current = { ...current, adaptedReadingSupports: saved }; render();
    return saved;
  });
  const onGenerateReadingSupports = vi.fn(async () => current.adaptedReadingSupports || null);
  const props = () => ({ ComplexityGauge: () => null, setComplexityLevel: vi.fn(), setSaveOriginalOnAdjust: vi.fn(), setReadingTheme: vi.fn(), setSelectionMenu: vi.fn(), setIsCustomReviseOpen: vi.fn(), setInteractionMode: vi.fn(), setIsCompareMode: vi.fn(), setIsFluencyMode: vi.fn(), stopPlayback: vi.fn(), closeDefinition: vi.fn(), closePhonics: vi.fn(), closeRevision: vi.fn(), handleToggleIsEditingLeveledText: vi.fn(), t: k => k, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: teacher, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: compare, isSideBySide: false, isZenMode: true, isProcessing: false, isPlaying: false, interactionMode: mode, history: [...history, current], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak: vi.fn(), handleWordClick: vi.fn(), handleQuickAddGlossary: vi.fn(), handlePhonicsClick: vi.fn(), isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: { read: '', define: '', 'add-glossary': '', revise: '' }, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => React.createElement('div', null, text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: x => x, latestGlossary: [], generatedContent: current, onUpdateReadingSupports, onGenerateReadingSupports, ...extra });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const render = () => root.render(React.createElement(View, props()));
  act(render);
  return { onUpdateReadingSupports, onGenerateReadingSupports, rerender: () => act(render), get item() { return current; } };
}
const byText = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim().startsWith(text));
const click = async node => { await act(async () => { node.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); };
const typeInto = async (node, value) => {
  const proto = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); });
};

describe('word help for students on an adapted text', () => {
  it('lists shown word help after the passage, with pictures and their credits', () => {
    mountReader(adaptedItem([at('shallow', { text: 'Not deep.', image: { src: 'data:image/png;base64,QUJD', alt: 'Shallow water.', source: 'mulberry', attribution: CREDIT } }), at('heron')], true));
    const list = host.querySelector('[data-adapted-word-help]');
    expect(list, 'word-help list').toBeTruthy();
    expect([...list.querySelectorAll('[data-adapted-word-help-text]')].map(node => node.textContent)).toEqual(['heron: Meaning of heron', 'shallow: Not deep.']);
    expect(list.querySelector('img').getAttribute('alt')).toBe('Shallow water.');
    expect(list.querySelector('[data-reading-picture-credits]').textContent).toContain('shallow: Mulberry Symbols by Steve Lee');
    // It follows the passage, and the passage itself is unchanged.
    expect(host.textContent.indexOf('shallow water')).toBeLessThan(host.textContent.indexOf('Word help'));
    expect(host.querySelector('[data-adapted-word-help-teacher]')).toBe(null);
  });

  it('shows nothing until the teacher turns it on', () => {
    mountReader(adaptedItem([at('heron')], false));
    expect(host.querySelector('[data-adapted-word-help]')).toBe(null);
  });

  it('lists it under both panes in Both, following Show changes', async () => {
    mountReader(adaptedItem([at('heron')], true), { teacher: true, compare: true });
    const list = host.querySelector('[data-adapted-word-help]');
    expect(list, 'word-help list in Both').toBeTruthy();
    expect(list.closest('[data-compare-version]')).toBe(null);
    expect(host.querySelector('[data-adapted-word-help-teacher]')).toBe(null); // editing stays in the adapted view
    await act(async () => host.querySelector('input[aria-label="Show changes"]').click());
    expect(host.querySelector('[data-adapted-word-help]')).toBe(null);
  });

  it('hides word help that no longer matches an edited passage', () => {
    mountReader(adaptedItem([at('heron')], true, 'The heron walked quickly in the shallow water.'));
    expect(host.querySelector('[data-adapted-word-help]')).toBe(null);
  });
});

describe('finding word help in the passage on screen', () => {
  it('finds the same occurrence the teacher explained, even when the passage is shown differently', () => {
    const stored = '# Herons\n\nThe heron saw a **heron** fly. A heronry is where herons nest.';
    const shown = 'Herons The heron saw a heron fly. A heronry is where herons nest.';
    const second = stored.indexOf('heron', stored.indexOf('heron saw') + 5);
    const hits = View.locateWordHelp(stored, [{ id: 'h', quote: 'heron', start: second }, { id: 'x', quote: 'egret', start: 0 }], shown);
    expect(hits).toHaveLength(1); // a word that is not on screen is left out
    expect(hits[0].start).toBe(shown.indexOf('heron', shown.indexOf('heron saw') + 5)); // the 2nd whole word, not "heronry" or "herons"
    expect(shown.slice(hits[0].start, hits[0].end)).toBe('heron');
    // Only whole words count: "heronry" inside a link address (not shown on screen) is not an occurrence.
    const linked = '[Nesting](https://example.org/heronry) The heron flew.';
    const onScreen = 'Nesting The heron flew.';
    const [hit] = View.locateWordHelp(linked, [{ id: 'h', quote: 'heron', start: linked.lastIndexOf('heron') }], onScreen);
    expect(hit && onScreen.slice(hit.start, hit.end)).toBe('heron');
  });

  it('hides the list while blanks are on screen', () => {
    mountReader(adaptedItem([at('heron')], true), { mode: 'cloze' });
    expect(host.querySelector('[data-adapted-word-help]')).toBe(null);
  });

  it('keeps table cells and paragraphs apart, and skips status notes and charts', () => {
    const box = document.createElement('div');
    box.innerHTML = '<table><tr><td>heron</td><td>fish</td></tr></table><p role="status">The versions have different paragraph counts.</p><div data-reading-chart="true">heron chart</div><p>The heron hunts.</p>';
    expect(View.readingTextSegments(box, 'English').text).toBe('heron\nfish\nThe heron hunts.');
  });

  it('does not count a word inside a link address the screen never shows', () => {
    const stored = '[the birds](https://example.org/heron) The heron hunts.';
    const [hit] = View.locateWordHelp(stored, [{ id: 'h', quote: 'heron', start: stored.lastIndexOf('heron') }], 'the birds The heron hunts.');
    expect(hit && hit.start).toBe('the birds The heron hunts.'.indexOf('heron'));
  });

  it('shows no word help and no Show buttons where the passage on screen is not its text', () => {
    const item = adaptedItem([at('heron')], true);
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    act(() => root.render(React.createElement(View.AdaptedWordHelp, { item, teacher: false, markWords: false })));
    expect(host.querySelector('[data-adapted-word-help]')).toBeTruthy();
    expect(host.querySelector('[data-adapted-word-help-spot]')).toBe(null);
    act(() => root.render(React.createElement(View.AdaptedWordHelp, { item, teacher: false, quiet: true })));
    expect(host.querySelector('[data-adapted-word-help]')).toBe(null); // blanks on screen: the list would give answers away
  });

  it('reads only the passage language, never buttons, when looking for words', () => {
    const box = document.createElement('div');
    box.innerHTML = '<p data-reading-language="Spanish">La garza camina.</p><p data-reading-language="English">The heron walks.</p><button>heron</button>';
    expect(View.readingTextSegments(box, 'Spanish').text).toBe('La garza camina.');
    box.querySelectorAll('[data-reading-language]').forEach(p => p.removeAttribute('data-reading-language'));
    expect(View.readingTextSegments(box, 'Spanish').text).toBe('La garza camina.\nThe heron walks.');
  });

  it('underlines word-help words and shows one in the passage on request', async () => {
    const registry = new Map();
    const savedCSS = window.CSS, savedHighlight = globalThis.Highlight;
    window.CSS = { ...(savedCSS || {}), highlights: registry };
    globalThis.Highlight = class extends Set { constructor(...ranges) { super(ranges); } get ranges() { return [...this]; } }; // set-like, as the real API
    const scrolled = [];
    const savedScroll = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function () { scrolled.push(this); };
    try {
      const view = mountReader(adaptedItem([at('heron'), at('shallow')], true));
      await act(async () => {});
      const underlined = registry.get('allo-word-help');
      expect(underlined.ranges.map(range => range.toString())).toEqual(['heron', 'shallow']);
      expect(underlined.ranges.every(range => range.startContainer.parentElement.closest('[data-reading-passage]'))).toBe(true);
      const spot = [...host.querySelectorAll('[data-adapted-word-help-spot]')];
      expect(spot.map(button => button.getAttribute('aria-label'))).toEqual(['Show in text: heron', 'Show in text: shallow']);
      await click(spot[1]);
      expect(registry.get('allo-word-help-focus').ranges[0].toString()).toBe('shallow');
      expect(scrolled[0].closest('[data-reading-passage]')).toBeTruthy();
      expect(host.querySelector('[data-adapted-word-help-spot-notice]').textContent).toBe('"shallow" is highlighted in the passage.');
      // Re-rendering with nothing changed (as read-aloud does on every word) does not re-read the passage.
      const walks = vi.spyOn(document, 'createTreeWalker');
      view.rerender(); view.rerender();
      expect(walks).not.toHaveBeenCalled();
      expect(registry.get('allo-word-help').ranges.map(range => range.toString())).toEqual(['heron', 'shallow']);
      // Text that changes in place (as when blanks turn back into words) is read again.
      walks.mockRestore();
      const passage = host.querySelector('[data-reading-passage]');
      const tw = document.createTreeWalker(passage, NodeFilter.SHOW_TEXT);
      for (let node = tw.nextNode(); node; node = tw.nextNode()) node.data = node.data.replace('heron', 'egret');
      view.rerender();
      expect(registry.get('allo-word-help').ranges.map(range => range.toString())).toEqual(['shallow']);
    } finally {
      window.CSS = savedCSS; globalThis.Highlight = savedHighlight; Element.prototype.scrollIntoView = savedScroll;
    }
  });

  it('says so when the word is not in the passage on screen, and still works without highlight support', async () => {
    mountReader(adaptedItem([at('heron')], true));
    // Simulate the passage showing different words (e.g. its translation).
    const walker = document.createTreeWalker(host.querySelector('[data-reading-passage]'), NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) node.data = node.data.replace(/heron/g, 'garza');
    expect(host.querySelector('[data-reading-passage]').textContent).not.toContain('heron');
    await click(host.querySelector('[data-adapted-word-help-spot]'));
    expect(host.querySelector('[data-adapted-word-help-spot-notice]').textContent).toBe('Could not find "heron" in the passage on screen.');
  });
});

describe('word help controls for teachers on an adapted text', () => {
  it('adds an explanation anchored to the adapted passage, then shows it to students', async () => {
    const view = mountReader(adaptedItem(null, false), { teacher: true });
    const panel = host.querySelector('[data-adapted-word-help-teacher]');
    expect(panel, 'teacher panel').toBeTruthy();
    expect(panel.open, 'collapsed until needed').toBe(false);
    expect(panel.querySelector('[data-adapted-word-help-show]').disabled).toBe(true); // nothing to show yet
    // One disclosure level: the editor sits inside the panel with no second toggle.
    expect(byText('Review word supports')).toBeUndefined();
    expect(panel.querySelector('summary').textContent).toBe('Word help · No supports yet');
    await click(byText('Add a word or phrase'));
    expect(panel.textContent).toContain('Word or phrase from the adapted text');
    expect(panel.textContent).not.toContain('Always show in lighter view');
    await typeInto(panel.querySelector('[data-gloss-draft] input[type=text]'), 'shallow');
    expect(panel.querySelector('[data-gloss-context]').textContent).toContain('in the shallow water');
    await typeInto(panel.querySelector('[data-gloss-draft] textarea'), 'Not deep.');
    await click(byText('Save word support'));
    expect(view.onUpdateReadingSupports.mock.calls[0][1]).toMatchObject({ type: 'upsert', annotation: { start: PASSAGE.indexOf('shallow'), quote: 'shallow', text: 'Not deep.' } });
    expect(view.item.adaptedReadingSupports.annotations.map(entry => entry.quote)).toEqual(['shallow']);
    expect(panel.querySelector('[data-reading-gloss-editor] li').textContent).toContain('Not deep.');
    expect(panel.textContent).not.toContain('Always show in lighter view'); // no lighter view here
    expect(host.querySelector('[data-adapted-word-help]')).toBe(null); // still hidden from students
    await click(host.querySelector('[data-adapted-word-help-show]'));
    expect(view.onUpdateReadingSupports.mock.calls.at(-1)[1]).toEqual({ type: 'show', shown: true });
    expect(host.querySelector('[data-adapted-word-help]').textContent).toContain('shallow: Not deep.');
    expect(host.querySelector('[data-adapted-word-help-teacher] [role=status]').textContent).toMatch(/Students now see/);
  });

  it('asks for suggestions for the adapted text', async () => {
    const view = mountReader(adaptedItem([at('heron')], false), { teacher: true });
    await click(host.querySelector('[data-adapted-word-help-generate]'));
    expect(view.onGenerateReadingSupports).toHaveBeenCalledTimes(1);
    expect(view.onGenerateReadingSupports.mock.calls[0][0].id).toBe('adapted-1');
    expect(host.querySelector('[data-adapted-word-help-generate]').textContent).toBe('Refresh suggested word help');
  });

  it('offers a fresh start when the passage was edited', async () => {
    const view = mountReader(adaptedItem([at('heron')], true, 'A heron stood in the pond.'), { teacher: true });
    const panel = host.querySelector('[data-adapted-word-help-teacher]');
    expect(panel.textContent).toMatch(/edited after its word help was made/);
    expect(panel.open, 'opened so the teacher sees why').toBe(true);
    expect(panel.querySelector('[data-adapted-word-help-show]').disabled).toBe(true);
    expect(panel.querySelector('[data-reading-gloss-editor]')).toBe(null);
    await click(host.querySelector('[data-adapted-word-help-clear]'));
    expect(view.onUpdateReadingSupports.mock.calls[0][1]).toEqual({ type: 'clear' });
    expect(host.querySelector('[data-adapted-word-help-teacher]').open).toBe(true);
    expect(document.activeElement).toBe(host.querySelector('[data-word-help-notice]'));
    expect(host.querySelector('[data-adapted-word-help-teacher]').textContent).not.toMatch(/edited after its word help was made/);
    expect(host.querySelector('[data-adapted-word-help-teacher] [data-reading-gloss-editor]')).toBeTruthy();
  });

  it('keeps the explanations whose words are still in an edited passage', async () => {
    const view = mountReader(adaptedItem([at('heron'), at('shallow'), at('slowly')], true, 'The heron walked quickly in the shallow water.'), { teacher: true });
    expect(host.querySelector('[data-adapted-word-help-keepable]').textContent).toBe('2 of 3 explanations are for words that are still in the text.');
    const keep = host.querySelector('[data-adapted-word-help-rebase]');
    expect(keep.textContent).toBe('Keep the 2 that still match');
    await click(keep);
    expect(view.onUpdateReadingSupports.mock.calls[0][1]).toEqual({ type: 'rebase' });
    // The panel stays open and focus lands on the result, not on the page.
    expect(host.querySelector('[data-adapted-word-help-teacher]').open).toBe(true);
    expect(document.activeElement).toBe(host.querySelector('[data-word-help-notice]'));
    expect(view.item.adaptedReadingSupports.annotations.map(entry => entry.quote)).toEqual(['heron', 'shallow']);
    // Students wait until the teacher has checked the kept explanations.
    expect(host.querySelector('[data-adapted-word-help]')).toBe(null);
    expect(view.item.adaptedReadingSupports.shown).toBe(false);
    expect(host.querySelector('[data-adapted-word-help-teacher] [role=status]').textContent).toContain('Kept the explanations that still match (2). Students will not see them until you check each one');
  });

  it('offers no keep button when none of the words are left', () => {
    mountReader(adaptedItem([at('slowly')], true, 'A heron stood in the pond.'), { teacher: true });
    expect(host.querySelector('[data-adapted-word-help-rebase]')).toBe(null);
    expect(host.querySelector('[data-adapted-word-help-keepable]')).toBe(null);
    expect(host.querySelector('[data-adapted-word-help-clear]')).toBeTruthy();
  });

  it('offers explanations from the original for words the adapted text kept', async () => {
    const item = adaptedItem(null, false);
    const original = contract.createSupportedReading(item.sourceSnapshot, { id: 'orig', sourceFamilyId: 'heron' });
    const ORIGINAL = original.data;
    const from = (quote, text) => ({ id: 'o' + ORIGINAL.indexOf(quote), start: ORIGINAL.indexOf(quote), end: ORIGINAL.indexOf(quote) + quote.length, quote, text });
    original.readingSupports = contract.validateReadingSupports(original, [from('heron', 'A wading bird.'), from('marsh', 'Wet land.')]);
    const view = mountReader(item, { teacher: true, history: [original] });
    const use = host.querySelector('[data-adapted-word-help-import]');
    expect(use, 'import button').toBeTruthy();
    expect(use.textContent).toBe('Reuse explanations from the original (1)');
    await click(use);
    expect(view.onUpdateReadingSupports.mock.calls[0][1]).toMatchObject({ type: 'import' });
    expect(view.item.adaptedReadingSupports.annotations.map(entry => [entry.quote, entry.text])).toEqual([['heron', 'A wading bird.']]);
    expect(host.querySelector('[data-adapted-word-help-teacher] [role=status]').textContent).toContain('Added explanations from the original (1).');
    // Once used, nothing is left to offer, and students still see nothing until it is shown.
    expect(host.querySelector('[data-adapted-word-help-import]')).toBe(null);
    // The used button is gone: focus lands on its result, not the page.
    expect(document.activeElement).toBe(host.querySelector('[data-word-help-notice]'));
    expect(host.querySelector('[data-adapted-word-help]')).toBe(null);
  });

  it('is not shown on the original', () => {
    const original = contract.createSupportedReading(PASSAGE, { id: 'orig' });
    mountReader(original, { teacher: true });
    expect(host.querySelector('[data-adapted-word-help-teacher]')).toBe(null);
    expect(host.querySelector('[data-adapted-word-help]')).toBe(null);
  });
});

describe('one teacher section for adapted word help', () => {
  const SIX = ['heron', 'walked', 'slowly', 'in', 'shallow', 'water'];
  it('summarises the supports and whether students see them in one line', () => {
    mountReader(adaptedItem([at('heron'), at('shallow')], true), { teacher: true });
    expect(host.querySelector('[data-adapted-word-help-teacher] summary').textContent).toBe('Word help · 2 supports · Shown to students');
    act(() => root.unmount()); host.remove(); root = null;
    mountReader(adaptedItem([at('heron')], false), { teacher: true });
    expect(host.querySelector('[data-adapted-word-help-teacher] summary').textContent).toBe('Word help · 1 support · Hidden from students');
    act(() => root.unmount()); host.remove(); root = null;
    mountReader(adaptedItem([at('heron')], true, 'A heron stood in the pond.'), { teacher: true });
    expect(host.querySelector('[data-adapted-word-help-teacher] summary').textContent).toBe('Word help · Needs review after an edit');
  });

  it('lists the supports as soon as the section opens, with editing forms collapsed', () => {
    mountReader(adaptedItem([at('heron'), at('shallow')], true), { teacher: true });
    const panel = host.querySelector('[data-adapted-word-help-teacher]');
    expect(panel.querySelectorAll('[data-reading-gloss-editor] li')).toHaveLength(2);
    expect(panel.querySelector('[data-gloss-draft]')).toBe(null);
    expect(panel.querySelector('[aria-expanded]')).toBe(null);
  });

  it('offers a search and a filter only once the list is long', async () => {
    mountReader(adaptedItem(SIX.slice(0, 5).map(word => at(word)), true), { teacher: true });
    expect(host.querySelector('[data-gloss-filter]')).toBe(null);
    act(() => root.unmount()); host.remove(); root = null;
    mountReader(adaptedItem(SIX.map(word => at(word, word === 'shallow' ? { priority: 'essential' } : {})), true), { teacher: true });
    const panel = host.querySelector('[data-adapted-word-help-teacher]');
    const items = () => [...panel.querySelectorAll('[data-reading-gloss-editor] li strong')].map(node => node.textContent);
    expect(items()).toEqual(SIX);
    await typeInto(panel.querySelector('[data-gloss-filter] input[type=search]'), 'meaning of wa');
    expect(items()).toEqual(['walked', 'water']);
    expect(panel.querySelector('[data-gloss-filter-count]').textContent).toBe('Showing 2 of 6 word supports.');
    await typeInto(panel.querySelector('[data-gloss-filter] input[type=search]'), 'zebra');
    expect(items()).toEqual([]);
    expect(panel.querySelector('[data-gloss-filter-count]').textContent).toMatch(/No word supports match/);
    await click(byText('Show all'));
    expect(items()).toEqual(SIX);
    expect(panel.querySelector('[data-gloss-filter-count]').textContent).toBe('');
  });
});

describe('word help opens from the passage', () => {
  const PICTURE = { src: 'data:image/png;base64,QUJD', alt: 'Water that is not deep.', source: 'mulberry', attribution: CREDIT };
  const word = text => [...host.querySelectorAll('[data-reading-passage] [data-reading-word]')].find(node => node.textContent === text);
  const card = () => host.querySelector('[data-word-help-card]');

  it('selecting a supported word in Word meaning opens the teacher help beside the passage, not an AI definition', async () => {
    const handleWordClick = vi.fn();
    mountReader(adaptedItem([at('shallow', { text: 'Not deep.', image: PICTURE }), at('heron')], true), { mode: 'define', extra: { handleWordClick } });
    const opener = word('shallow');
    await click(opener);
    expect(card(), 'word help card').toBeTruthy();
    expect(card().querySelector('h5').textContent).toBe('shallow');
    expect(card().querySelector('[data-word-help-card-text]').textContent).toBe('Not deep.');
    expect(card().querySelector('[data-word-help-card-picture]').getAttribute('alt')).toBe('Water that is not deep.');
    expect(card().textContent).toContain('Mulberry Symbols');
    expect(handleWordClick).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(card());
    await act(async () => { card().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(card()).toBe(null);
    expect(document.activeElement).toBe(opener);
  });

  it('an unsupported word still gets the usual definition, and More about this word asks for one', async () => {
    const handleWordClick = vi.fn();
    mountReader(adaptedItem([at('heron')], true), { mode: 'define', extra: { handleWordClick } });
    await click(word('walked'));
    expect(card()).toBe(null);
    expect(handleWordClick.mock.calls[0][0]).toBe('walked');
    await click(word('heron'));
    await click(card().querySelector('[data-word-help-card-more]'));
    expect(card()).toBe(null);
    expect(handleWordClick.mock.calls[1][0]).toBe('heron');
  });

  it('reads the word aloud, and leads to the full list', async () => {
    const handleSpeak = vi.fn();
    mountReader(adaptedItem([at('heron')], true), { mode: 'define', extra: { handleSpeak } });
    await click(word('heron'));
    await click(card().querySelector('[data-word-help-card-hear]'));
    expect(handleSpeak.mock.calls.at(-1)[0]).toBe('heron');
    await click(card().querySelector('[data-word-help-card-all]'));
    expect(card()).toBe(null);
    expect(document.activeElement).toBe(host.querySelector('[data-adapted-word-help]'));
  });

  it('opens nothing for word help that students cannot see yet', async () => {
    const handleWordClick = vi.fn();
    mountReader(adaptedItem([at('heron')], false), { mode: 'define', extra: { handleWordClick } });
    await click(word('heron'));
    expect(card()).toBe(null);
    expect(handleWordClick).toHaveBeenCalledTimes(1);
  });

  it('says in the Word meaning banner that underlined words open prepared help', () => {
    mountReader(adaptedItem([at('heron')], true), { mode: 'define' });
    expect(host.querySelector('[data-reading-mode-status]').textContent).toBe('Word meaning · Select a word to see what it means. Underlined words open the word help your teacher prepared. Use Left and Right arrows to move between words.');
  });
});
