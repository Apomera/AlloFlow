import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from '../../tests/setup.js';
const require = createRequire(import.meta.url);
const DELIMITER = '\n\n--- ENGLISH TRANSLATION ---\n\n';
let React, createRoot, act, View, pure, phase, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act; global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.__alloUtils = { cleanJson: value => value };
  for (const name of ['instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'text_pipeline_helpers_module.js']) loadAlloModule(name);
  loadAlloModule(process.env.ALLO_CE_CANDIDATE || 'content_engine_module.js');
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  View = window.AlloModules.SimplifiedView; pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; host = null; vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function fixture({ source = 'Agua.', translation = 'Water.', after = 'Líquido.', afterTranslation = 'Liquid.', selected = 'src', language = 'Spanish', response, monolingual = false } = {}) {
  const state = {
    generatedContent: { id: 'reading', type: 'simplified', data: monolingual ? source : source + DELIMITER + translation, config: { language, grade: '4' }, instructionalText: { form: 'adapted', complexity: { language, requestedGrade: '4' } } },
    revisionData: null, selectionMenu: null, interactionMode: 'read', leveledTextLanguage: language, gradeLevel: '4',
    isTeacherMode: true, isZenMode: false, isCompareMode: false, isEditingLeveledText: false,
    setIsCustomReviseOpen: vi.fn(), setCustomReviseInstruction: vi.fn(), setInteractionMode: vi.fn(), setIsCompareMode: vi.fn(),
    setSelectionMenu: value => { state.selectionMenu = value; render(); },
    setRevisionData: value => { state.revisionData = typeof value === 'function' ? value(state.revisionData) : value; render(); }
  };
  state.handleSimplifiedTextChange = vi.fn(data => { state.generatedContent = { ...state.generatedContent, data }; render(); });
  const replacements = [{ paneId: 'src', original: source, new: after }, { paneId: 'tgt', original: translation, new: afterTranslation }];
  const callGemini = vi.fn(async () => response ?? JSON.stringify({ primaryRevision: selected === 'src' ? after : afterTranslation, replacements }));
  const addToast = vi.fn();
  const engine = window.AlloModules.createContentEngine({ getState: () => state, callGemini, addToast, t: key => key });
  const common = {
    t: key => key, ComplexityGauge: () => null, textEditorRef: React.createRef(), history: [],
    splitTextToSentences: text => pure.splitTextToSentences(text, {}), getSideBySideContent: () => null,
    getContentDirection: lang => lang === 'Arabic' ? 'rtl' : 'ltr', isRtlLang: lang => lang === 'Arabic',
    renderFormattedText: text => React.createElement('span', null, text),
    formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: value => value, latestGlossary: [], MathSymbol: () => null }),
    SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: text => text, latestGlossary: [], cursorStyles: {},
    handleSpeak: vi.fn(), stopPlayback: vi.fn(), handleWordClick: vi.fn(), handlePhonicsClick: vi.fn(),
    handleQuickAddGlossary: vi.fn(), handleTextMouseUp: vi.fn(), setFocusedParagraphIndex: vi.fn(), setReadingTheme: vi.fn(),
    closeRevision: () => engine.closeRevision(), applyTextRevision: () => engine.applyTextRevision(),
    handleToggleIsTeacherToolbarExpanded: vi.fn(), handleFormatText: vi.fn(), selectedVoice: 'Kore', voiceSpeed: 1
  };
  function render() { if (root) root.render(React.createElement(View, { ...common, ...state })); }
  host = document.createElement('div'); document.body.append(host); root = createRoot(host); act(render);
  return { state, engine, common, callGemini, addToast, render: () => act(render), prepare: async (action = 'simplify') => {
    state.selectionMenu = { text: selected === 'src' ? source : translation, paneId: monolingual ? 'mono' : selected, language: selected === 'src' ? language : 'English', occurrence: 0, x: 300, y: 50 };
    await act(async () => { await engine.handleReviseSelection(action, 'Make the wording clearer.'); });
  } };
}
const find = selector => host.querySelector(selector);
const click = async node => { await act(async () => { node.click(); }); };
describe('validated bilingual review', () => {
  it.each(['src', 'tgt'])('shows both exact changes before atomically applying the selected %s revision', async selected => {
    const f = fixture({ selected }); await f.prepare();
    expect(host.querySelectorAll('[data-revision-pane]')).toHaveLength(2);
    const source = find('[data-revision-pane="src"]'), translation = find('[data-revision-pane="tgt"]');
    expect(source.querySelector('[data-revision-before]').textContent).toBe('Agua.');
    expect(source.querySelector('[data-revision-after]').textContent).toBe('Líquido.');
    expect(translation.querySelector('[data-revision-before]').textContent).toBe('Water.');
    expect(translation.querySelector('[data-revision-after]').textContent).toBe('Liquid.');
    expect(find(`[data-revision-pane="${selected}"]`).textContent).toContain('Selected passage');
    expect(source.querySelector('[data-revision-after]').lang).toBe('es');
    expect(translation.querySelector('[data-revision-after]').lang).toBe('en');
    expect(f.state.handleSimplifiedTextChange).not.toHaveBeenCalled();
    expect(find('[data-revision-apply]').textContent).toContain('Apply both changes');
    await click(find('[data-revision-apply]'));
    expect(f.state.generatedContent.data).toBe('Líquido.' + DELIMITER + 'Liquid.');
    expect(f.state.handleSimplifiedTextChange).toHaveBeenCalledOnce(); expect(f.callGemini).toHaveBeenCalledOnce();
    expect(find('[data-bilingual-revision-review]')).toBeNull();
  });
  it('freezes the displayed pair and ignores mutable legacy replacement metadata', async () => {
    const f = fixture(); await f.prepare(); const review = f.state.revisionData.bilingualReview;
    expect(Object.isFrozen(review)).toBe(true); expect(Object.isFrozen(review.edits)).toBe(true);
    expect(review.edits.every(Object.isFrozen)).toBe(true);
    expect(() => { review.edits[1].new = 'Injected.'; }).toThrow(TypeError);
    f.state.revisionData.replacements[1].new = 'Injected.'; f.render();
    expect(find('[data-revision-pane="tgt"] [data-revision-after]').textContent).toBe('Liquid.');
    await click(find('[data-revision-apply]')); expect(f.state.generatedContent.data).toBe('Líquido.' + DELIMITER + 'Liquid.');
  });
  it('rejects Apply after the public review object is replaced', async () => {
    const f = fixture(); await f.prepare(); const before = f.state.generatedContent.data;
    const review = f.state.revisionData.bilingualReview;
    f.state.revisionData.bilingualReview = { ...review, edits: review.edits.map(edit => ({ ...edit, new: edit.paneId === 'tgt' ? 'Unreviewed.' : edit.new })) };
    f.render(); await click(find('[data-revision-apply]'));
    expect(f.state.generatedContent.data).toBe(before); expect(f.state.handleSimplifiedTextChange).not.toHaveBeenCalled();
    expect(f.addToast).toHaveBeenCalledWith(expect.stringContaining('Nothing changed'), 'warning');
  });
  it.each(['missing', 'partial', 'wrong-request'])('withholds Apply when pair review is %s', async kind => {
    const f = fixture(); await f.prepare(); const review = f.state.revisionData.bilingualReview;
    if (kind === 'missing') delete f.state.revisionData.bilingualReview;
    if (kind === 'partial') f.state.revisionData.bilingualReview = { ...review, edits: review.edits.slice(0, 1) };
    if (kind === 'wrong-request') f.state.revisionData.bilingualReview = { ...review, requestId: review.requestId + 1 };
    f.render(); expect(find('[data-bilingual-revision-unavailable]').textContent).toContain('Close this preview and try again');
    expect(find('[data-revision-apply]').disabled).toBe(true); await click(find('[data-revision-apply]'));
    expect(f.state.handleSimplifiedTextChange).not.toHaveBeenCalled();
    await act(async () => { await f.engine.applyTextRevision(); });
    expect(f.state.handleSimplifiedTextChange).not.toHaveBeenCalled();
  });
  it('dismisses the preview when the reading changes and rejects a late Apply', async () => {
    const f = fixture(); await f.prepare();
    const changed = 'Changed.\n' + f.state.generatedContent.data;
    f.state.generatedContent = { ...f.state.generatedContent, data: changed }; f.render();
    expect(find('[data-bilingual-revision-review]')).toBeNull(); expect(find('[data-revision-apply]')).toBeNull();
    await act(async () => { await f.engine.applyTextRevision(); });
    expect(f.state.generatedContent.data).toBe(changed); expect(f.state.handleSimplifiedTextChange).not.toHaveBeenCalled();
  });
  it('uses recorded language after the ambient generation language changes', async () => {
    const f = fixture(); f.state.leveledTextLanguage = 'French'; await f.prepare();
    expect(find('[data-revision-pane="src"] [data-revision-after]').lang).toBe('es');
    await click(find('[data-simplified-popup-speaker="simplified-revision-popup"]'));
    expect(f.common.handleSpeak).toHaveBeenCalledWith('Líquido.', 'simplified-revision-popup', 0, false, 'Spanish');
  });
  it('preserves citation markers and literal replacement characters in each preview and commit', async () => {
    const citation = ' [⁽¹⁾](https://example.org/a_(b))';
    const after = 'Líquido $& $$.' + citation, afterTranslation = 'Liquid $& $$.' + citation;
    const f = fixture({ source: 'Agua.' + citation, translation: 'Water.' + citation, after, afterTranslation }); await f.prepare();
    expect(find('[data-revision-pane="src"] [data-revision-after]').textContent).toBe(after);
    expect(find('[data-revision-pane="tgt"] [data-revision-after]').textContent).toBe(afterTranslation);
    await click(find('[data-revision-apply]')); expect(f.state.generatedContent.data).toBe(after + DELIMITER + afterTranslation);
  });
  it('fits a narrow viewport and marks right-to-left text separately from English', async () => {
    vi.stubGlobal('innerWidth', 320);
    const f = fixture({ source: 'الماء.', after: 'سائل.', language: 'Arabic' }); await f.prepare();
    const dialog = find('[data-bilingual-revision-review]').closest('[role="dialog"]');
    expect(parseFloat(dialog.style.width)).toBeLessThanOrEqual(304);
    expect(parseFloat(dialog.style.left)).toBeGreaterThanOrEqual(8);
    expect(find('[data-revision-pane="src"] [data-revision-after]').dir).toBe('rtl');
    expect(find('[data-revision-pane="src"] [data-revision-after]').lang).toBe('ar');
    expect(find('[data-revision-pane="tgt"] [data-revision-after]').dir).toBe('ltr');
  });
  it.each(['src', 'tgt'])('reads the selected %s change with its recorded language', async selected => {
    const f = fixture({ selected }); await f.prepare();
    const button = find('[data-simplified-popup-speaker="simplified-revision-popup"]');
    expect(button.getAttribute('aria-label')).toBe('Listen to selected change'); await click(button);
    expect(f.common.handleSpeak).toHaveBeenCalledWith(selected === 'src' ? 'Líquido.' : 'Liquid.', 'simplified-revision-popup', 0, false, selected === 'src' ? 'Spanish' : 'English');
  });
  it('keeps explanations single-pane even when the reading is bilingual', async () => {
    const f = fixture({ response: 'Water is a liquid.' }); await f.prepare('explain');
    expect(find('[data-bilingual-revision-review]')).toBeNull(); expect(find('[data-revision-apply]')).toBeNull();
    expect(host.textContent).toContain('Water is a liquid.');
  });
  it('keeps single-language revisions on their existing Apply path', async () => {
    const f = fixture({ monolingual: true, response: 'Líquido.' }); await f.prepare();
    expect(find('[data-bilingual-revision-review]')).toBeNull(); expect(find('[data-revision-apply]').disabled).toBe(false);
    await click(find('[data-revision-apply]')); expect(f.state.generatedContent.data).toBe('Líquido.');
  });
  it('does not expose teacher revision controls in student view', async () => {
    const f = fixture(); await f.prepare(); f.state.isTeacherMode = false; f.render();
    expect(find('[data-bilingual-revision-review]')).toBeNull(); expect(find('[data-revision-apply]')).toBeNull();
  });
});
