import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { vi } from 'vitest';
import { loadAlloModule } from '../setup.js';
const require = createRequire(import.meta.url);
export const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
export const act = React.act;
export const english = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
export const fixtures = JSON.parse(readFileSync('tests/fixtures/reader_locales.json', 'utf8'));
const lookup = (data, key) => key.split('.').reduce((o, k) => o && o[k], data);
export function translator(locale) {
  const pack = locale === 'English' ? english : JSON.parse(readFileSync('lang/' + locale + '.js', 'utf8'));
  return (key, params = {}) => {
    const text = lookup(pack, key) || lookup(english, key);
    if (typeof text !== 'string') return undefined;
    return text.replace(/\{(\w+)\}/g, (m, name) => params[name] != null ? String(params[name]) : m);
  };
}
export let View, contract, helpers, pure;
let phase, host, root;
export function setupReader() {
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  for (const file of ['instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'text_pipeline_helpers_module.js', 'generation_helpers_module.js', 'module_scope_extras_module.js', 'view_simplified_module.js']) loadAlloModule(file);
  View = window.AlloModules.SimplifiedView; contract = window.AlloModules.InstructionalContext;
  helpers = window.AlloModules.GenerationHelpers; pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers;
}
export function contentFor(fixture, extra = {}) {
  const snapshot = contract.createSourceSnapshot(fixture.passage, { language: fixture.language, sourceArtifactId: fixture.id + '-source' });
  return { id: fixture.id, type: 'simplified', data: fixture.passage, config: { language: fixture.language, grade: '5' }, sourceSnapshot: snapshot,
    sourceFamilyId: fixture.id, instructionalText: { form: 'adapted', role: 'supplemental' }, ...extra };
}
export function splitBilingual(text) {
  const marker = '--- ENGLISH TRANSLATION ---', at = text.indexOf(marker);
  if (at < 0) return null;
  const sourceFull = text.slice(0, at).trim(), targetFull = text.slice(at + marker.length).trim();
  return { sourceFull, targetFull, source: sourceFull.split(/\n{2,}/), target: targetFull.split(/\n{2,}/) };
}
export function mountReader(fixture, extra = {}) {
  const t = translator(fixture.locale), content = contentFor(fixture), noop = () => {};
  window.__alloT = t;
  const props = { ComplexityGauge: () => null, t, generatedContent: content, history: [content], inputText: '', gradeLevel: '5', complexityLevel: 5,
    leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: true, isZenMode: false,
    isTeacherToolbarExpanded: true, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isProcessing: false, isPlaying: false,
    interactionMode: 'read', textEditorRef: React.createRef(), splitTextToSentences: text => pure.splitTextToSentences(text, {}), getSideBySideContent: splitBilingual,
    getContentDirection: window.AlloModules.ModuleScopeExtras.getContentDirection, isRtlLang: window.AlloModules.ModuleScopeExtras.isRtlLang,
    renderFormattedText: text => React.createElement('div', null, text),
    formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }),
    SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: x => x, latestGlossary: [], cursorStyles: {}, readingLearnerKey: fixture.id,
    handleFormatText: noop, handleTextMouseUp: noop, callTTS: noop, focusedParagraphIndex: null, isLineFocusMode: false };
  for (const name of ['setComplexityLevel','setSaveOriginalOnAdjust','setReadingTheme','setSelectionMenu','setIsCustomReviseOpen','setInteractionMode','setIsCompareMode','setIsFluencyMode','stopPlayback','closeDefinition','closePhonics','closeRevision','handleToggleIsEditingLeveledText','handleSimplifiedTextChange','handleSpeak','handleWordClick','handleQuickAddGlossary','handlePhonicsClick','setFocusedParagraphIndex']) props[name] = vi.fn();
  Object.assign(props, extra);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
  return { host, props, t, rerender: next => act(() => root.render(React.createElement(View, { ...props, ...next }))) };
}
export async function click(element) {
  if (!element) throw Error('Expected a rendered control');
  await act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}
export function disposeReader() { if (root) act(() => root.unmount()); root = null; host?.remove(); host = null; delete window.__alloT; delete window.__alloGetReadAloudAudioSummary; }
