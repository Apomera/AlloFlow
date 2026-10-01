import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from '../../tests/setup.js';

const require = createRequire(import.meta.url);
const fixtures = 'reports/reader-place-recovery-enhancement/';
const candidate = process.env.ALLO_READING_RECOVERY_UI_ROOT ?? fixtures;
const KEY = 'alloflow_reading_places_v1';
let React, createRoot, act, contract, View, pure, phase, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act; global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js');
  contract = window.AlloModules.InstructionalContext; pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers;
});
function reload() { new Function(readFileSync(candidate + 'view_simplified_module.js', 'utf8'))(); View = window.AlloModules.SimplifiedView; }
beforeEach(() => {
  localStorage.clear(); reload();
  let queue = Promise.resolve();
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request(_key, callback) { const next = queue.then(callback); queue = next.catch(() => {}); return next; } } });
});
function unmount() { if (root) act(() => root.unmount()); host?.remove(); root = host = null; }
afterEach(() => { unmount(); vi.restoreAllMocks(); delete navigator.locks; });
const LONG = '## Herons\n\nThe heron walked slowly in the shallow water.\n\n## Food\n\nIt waited for a fish near the reeds. Then it struck fast.\n\n## Nests\n\nHerons build nests high in trees.';
function item(data = LONG) {
  const original = contract.createSupportedReading(contract.createSourceSnapshot('The heron waded through the marsh.', { sourceArtifactId: 'src' }), { id: 'orig', sourceFamilyId: 'heron' });
  return { id: 'adapted-1', type: 'simplified', data, instructionalText: { form: 'adapted', role: 'supplemental' }, sourceSnapshot: original.sourceSnapshot, sourceFamilyId: 'heron', config: { language: 'English' } };
}
function mount(extra = {}) {
  const noop = () => {}, content = item();
  const props = { ComplexityGauge: () => null, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop, setReadingTheme: noop, setSelectionMenu: noop, setIsCustomReviseOpen: noop, setInteractionMode: noop, setIsCompareMode: noop, setIsFluencyMode: noop, stopPlayback: noop, closeDefinition: noop, closePhonics: noop, closeRevision: noop, handleToggleIsEditingLeveledText: noop, t: k => k, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: true, isProcessing: false, isPlaying: false, interactionMode: 'read', history: [content], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak: noop, handleWordClick: noop, handleQuickAddGlossary: noop, handlePhonicsClick: noop, isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => React.createElement('div', null, text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: x => x, latestGlossary: [], generatedContent: content, readingLearnerKey: 'learner|Blue Fox', ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
  return next => act(() => root.render(React.createElement(View, { ...props, ...next })));
}
const $ = selector => host.querySelector(selector);
const click = async node => act(async () => { node.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const type = async (node, value) => act(async () => {
  Object.getOwnPropertyDescriptor(node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLTextAreaElement.prototype, 'value').set.call(node, value);
  node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
});
function remoteEdit(text, notify = true) {
  const rows = JSON.parse(localStorage.getItem(KEY)), row = Object.values(rows)[0]; row.responses[0].mainIdea = text; row.revision++;
  localStorage.setItem(KEY, JSON.stringify(rows));
  if (notify) act(() => window.dispatchEvent(new StorageEvent('storage', { key: KEY })));
}
async function startConflict() {
  const rerender = mount(); await click($('[data-section-prompts-toggle]'));
  await type($('[data-section-prompt="mainIdea"]'), 'Initial saved answer');
  const original = Storage.prototype.setItem;
  const writes = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) { if (key === KEY) throw new DOMException('Full', 'QuotaExceededError'); return original.call(this, key, value); });
  await type($('[data-section-prompt="mainIdea"]'), 'This page draft'); writes.mockRestore(); remoteEdit('Saved elsewhere');
  await click($('[data-reading-conflict-review]'));
  expect(document.activeElement).toBe($('[data-reading-conflict-panel]'));
  return rerender;
}

describe('candidate reader conflict review', () => {
  it('offers readable copies for unnamed readers, including section and bookmark', async () => {
    mount({ readingLearnerKey: '' }); await click($('[data-section-prompts-toggle]'));
    expect($('[data-reading-work-copy]')).toBeNull();
    await type($('[data-section-prompt="mainIdea"]'), 'A patient bird.');
    await click($('[data-reading-outline-toggle]')); await click($('[data-reading-bookmark]'));
    const text = $('[data-reading-work-copy]').value;
    expect(text).toContain('Herons'); expect(text).toContain('What is the main idea?'); expect(text).toContain('A patient bird.'); expect(text).toContain('Bookmark:');
    expect(text).not.toContain('mainIdea'); expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('chooses saved work and keeps the earlier local draft through remounts, but not reload', async () => {
    await startConflict(); const raw = localStorage.getItem(KEY);
    expect($('[data-reading-conflict-local]').value).toContain('This page draft');
    expect($('[data-reading-conflict-saved]').value).toContain('Saved elsewhere');
    await click($('[data-reading-conflict-use]'));
    expect($('[data-section-prompt="mainIdea"]').value).toBe('Saved elsewhere');
    expect($('[data-reading-recovery-copy]').value).toContain('This page draft'); expect(localStorage.getItem(KEY)).toBe(raw);
    expect(document.activeElement).toBe($('[data-reading-persistence] [role="status"]'));
    unmount(); mount(); await click($('[data-section-prompts-toggle]'));
    expect($('[data-reading-recovery-copy]').value).toContain('This page draft');
    unmount(); reload(); mount(); await click($('[data-section-prompts-toggle]'));
    expect($('[data-reading-recovery-copy]')).toBeNull(); expect($('[data-section-prompt="mainIdea"]').value).toBe('Saved elsewhere');
  });

  it('saves the local draft only after the explicit choice and keeps the previous save copy', async () => {
    await startConflict(); await click($('[data-reading-conflict-keep]'));
    expect($('[data-reading-persistence="saved"]')).not.toBeNull();
    expect(Object.values(JSON.parse(localStorage.getItem(KEY)))[0].responses[0].mainIdea).toBe('This page draft');
    expect($('[data-reading-recovery-copy]').value).toContain('Saved elsewhere');
    expect($('[data-reading-recovery-copies]').textContent).toContain('before closing or reloading');
  });

  it('rejects a stale review without losing either version and allows a fresh review or cancel', async () => {
    await startConflict(); remoteEdit('A newer saved answer', false); const raw = localStorage.getItem(KEY);
    await click($('[data-reading-conflict-keep]'));
    expect($('[data-section-prompt="mainIdea"]').value).toBe('This page draft'); expect(localStorage.getItem(KEY)).toBe(raw);
    expect($('[data-reading-persistence="failed"]').textContent).toContain('changed after this review');
    expect($('[data-reading-conflict-panel]')).toBeNull();
    await click($('[data-reading-conflict-review]')); expect($('[data-reading-conflict-saved]').value).toContain('A newer saved answer');
    await click($('[data-reading-conflict-cancel]')); expect(localStorage.getItem(KEY)).toBe(raw);
    expect(document.activeElement).toBe($('[data-reading-persistence] [role="status"]'));
  });

  it('retains newer text typed after opening a review', async () => {
    await startConflict(); const raw = localStorage.getItem(KEY);
    await type($('[data-section-prompt="mainIdea"]'), 'Newer typed draft'); await click($('[data-reading-conflict-use]'));
    expect($('[data-section-prompt="mainIdea"]').value).toBe('Newer typed draft'); expect(localStorage.getItem(KEY)).toBe(raw);
    expect($('[data-reading-persistence="failed"]').textContent).toContain('changed after this review');
  });

  it('does not expose an open review or recovery copies to another learner or version', async () => {
    const rerender = await startConflict(); rerender({ readingLearnerKey: 'learner|Red Owl' });
    expect($('[data-reading-conflict-panel]')).toBeNull(); expect($('[data-reading-recovery-copy]')).toBeNull(); expect($('[data-section-prompt="mainIdea"]').value).toBe('');
    rerender({ generatedContent: item(LONG + '\n\nRevised text.') });
    expect($('[data-reading-conflict-panel]')).toBeNull(); expect($('[data-reading-recovery-copy]')).toBeNull();
  });

  it('registers every candidate UI fallback and recovery reason in the candidate language source', () => {
    const parser = require('@babel/parser'), traverse = require('@babel/traverse').default;
    const strings = JSON.parse(readFileSync(candidate + 'ui_strings.js', 'utf8'));
    const lookup = key => key.split('.').reduce((value, part) => value?.[part], strings);
    const source = readFileSync(fixtures + 'ui-replacement.jsx', 'utf8'), calls = [];
    traverse(parser.parse('function fixture(){' + source + '}', { sourceType: 'script', plugins: ['jsx'] }), {
      CallExpression(p) { const [key, fallback] = p.node.arguments; if (p.node.callee.name === 'viewText' && key?.type === 'StringLiteral' && fallback?.type === 'StringLiteral') calls.push([key.value, fallback.value]); }
    });
    expect(calls.length).toBeGreaterThan(20);
    for (const [key, fallback] of calls) expect(lookup(key), key).toBe(fallback);
    for (const [key, value] of Object.entries(JSON.parse(readFileSync(fixtures + 'strings.json', 'utf8')))) expect(strings.simplified[key]).toBe(value);
  });
});
