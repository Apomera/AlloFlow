import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from '../../tests/setup.js';

const require = createRequire(import.meta.url);
const fixtures = 'reports/reader-place-recovery-enhancement/';
const candidate = process.env.ALLO_READING_RECOVERY_UI_ROOT ?? 'reports/reader-place-copy-controls/';
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
function reload() { delete window.AlloModules.SimplifiedView; new Function(readFileSync(candidate + 'view_simplified_module.js', 'utf8'))(); View = window.AlloModules.SimplifiedView; }
beforeEach(() => {
  localStorage.clear(); reload();
  let queue = Promise.resolve();
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request(_key, callback) { const next = queue.then(callback); queue = next.catch(() => {}); return next; } } });
});
function unmount() { if (root) act(() => root.unmount()); host?.remove(); root = host = null; }
afterEach(() => { unmount(); window.__alloReadingPlaceGuardCleanup?.(); vi.restoreAllMocks(); delete navigator.locks; });
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


describe('reader lifecycle and storage recovery UI', () => {
  const leave = () => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; };
  const openTools = async () => { await act(async () => { const details = $('[data-reading-storage-tools]'); details.open = true; details.dispatchEvent(new Event('toggle')); }); };

  it('keeps reload protection after leaving a reading, scopes exports, and never claims a completed download', async () => {
    const rerender = mount({ readingLearnerKey: '' }); await click($('[data-section-prompts-toggle]'));
    expect(leave()).toBe(false); await type($('[data-section-prompt="mainIdea"]'), 'Temporary heron answer'); expect(leave()).toBe(true);
    const other = { ...item('Another exact passage.'), id: 'another' }; rerender({ readingLearnerKey: '', generatedContent: other });
    expect(leave()).toBe(true); await openTools();
    const copies = [...host.querySelectorAll('[data-reading-session-copy]')]; expect(copies[0].value).toContain('Temporary heron answer'); expect(copies[0].value).toContain(LONG);
    const make = vi.fn(() => 'blob:recovery-test'); Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: make });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const anchor = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await click($('[data-reading-download]')); expect(make).toHaveBeenCalledOnce(); expect(anchor).toHaveBeenCalledOnce();
    expect($('[data-reading-storage-tools]').textContent).toContain('Download requested'); expect(leave()).toBe(true);
    rerender({ readingLearnerKey: 'Other learner' }); expect($('[data-reading-session-copy]')).toBeNull(); expect($('[data-reading-storage-tools]')).toBeNull();
  });

  it('retains selectable text when download is blocked and removes preview guards on close', async () => {
    mount({ readingLearnerKey: '', isStudentPreview: true }); await click($('[data-section-prompts-toggle]'));
    await type($('[data-section-prompt="mainIdea"]'), 'Preview draft'); await openTools();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => { throw new Error('Blocked'); } });
    await click($('[data-reading-download]')); expect($('[data-reading-storage-tools]').textContent).toContain('download could not start');
    expect($('[data-reading-session-copy]').value).toContain('Preview draft'); expect(leave()).toBe(true);
    unmount(); expect(leave()).toBe(false);
  });

  it('requires an explicit storage review, keeps a copy after removal, and leaves other learners unchanged', async () => {
    mount(); await click($('[data-section-prompts-toggle]')); await type($('[data-section-prompt="mainIdea"]'), 'Saved answer');
    const rows = JSON.parse(localStorage.getItem(KEY)); rows['Other|reading|v1'] = { responses: { 0: { mainIdea: 'Private' } } }; localStorage.setItem(KEY, JSON.stringify(rows));
    await openTools(); await click($('[data-reading-storage-review]'));
    expect(document.activeElement).toBe($('[data-reading-storage-panel]')); expect($('[data-reading-storage-remove]').disabled).toBe(true);
    await click($('[data-reading-storage-confirm]')); await click($('[data-reading-storage-remove]'));
    expect(Object.keys(JSON.parse(localStorage.getItem(KEY)))).toEqual(['Other|reading|v1']);
    expect($('[data-section-prompt="mainIdea"]').value).toBe(''); expect($('[data-reading-recovery-copy]').value).toContain('Saved answer');
    expect($('[data-reading-session-copy]').value).not.toContain('Private'); expect(leave()).toBe(true);
  });

  it('rejects a stale storage confirmation and preserves new typed text', async () => {
    mount(); await click($('[data-section-prompts-toggle]')); await type($('[data-section-prompt="mainIdea"]'), 'First'); await openTools();
    await click($('[data-reading-storage-review]')); await type($('[data-section-prompt="mainIdea"]'), 'Newer');
    await click($('[data-reading-storage-confirm]')); await click($('[data-reading-storage-remove]'));
    expect($('[data-section-prompt="mainIdea"]').value).toBe('Newer'); expect(Object.values(JSON.parse(localStorage.getItem(KEY)))[0].responses[0].mainIdea).toBe('Newer');
    expect($('[data-reading-persistence]').textContent).toContain('changed after this review');
  });

  it('repairs a malformed row and gives actionable answer-size guidance without truncation', async () => {
    mount(); await click($('[data-section-prompts-toggle]')); await type($('[data-section-prompt="mainIdea"]'), 'First');
    const rows = JSON.parse(localStorage.getItem(KEY)); Object.values(rows)[0].responses[0].support = { old: 'Recover this' }; localStorage.setItem(KEY, JSON.stringify(rows));
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: KEY }))); await openTools(); await click($('[data-reading-storage-review]'));
    expect($('[data-reading-storage-repair]')).not.toBeNull(); await click($('[data-reading-storage-confirm]')); await click($('[data-reading-storage-repair]'));
    expect(Object.values(JSON.parse(localStorage.getItem(KEY)))[0].responses[0].support).toBeUndefined(); expect($('[data-reading-session-copy]').value).toContain('Recover this');
    await type($('[data-section-prompt="mainIdea"]'), 'x'.repeat(16001)); expect($('[data-section-prompt="mainIdea"]').value).toHaveLength(16001);
    expect($('[data-reading-storage-problem]').textContent).toContain('Herons'); expect($('[data-reading-storage-problem]').textContent).toContain('too long to save');
    await type($('[data-section-prompt="mainIdea"]'), 'Shorter'); expect($('[data-reading-storage-problem]')).toBeNull();
  });

  it('registers all new lifecycle strings in the candidate catalog', () => {
    const strings = JSON.parse(readFileSync(candidate + 'ui_strings.js', 'utf8'));
    for (const [key, value] of Object.entries(JSON.parse(readFileSync('reports/reader-place-lifecycle-enhancement/strings.json', 'utf8')))) expect(strings.simplified[key], key).toBe(value);
  });
});


describe('review recovery copies before restoring or removing them', () => {
  const leave = () => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; };
  async function createLocalCopy() { const rerender = await startConflict(); await click($('[data-reading-conflict-use]')); return rerender; }
  it('restores a reviewed copy into answer fields without saving and retains the displaced answer', async () => {
    await createLocalCopy(); const raw = localStorage.getItem(KEY); await click($('[data-reading-copy-review]'));
    expect(document.activeElement).toBe($('[data-reading-copy-panel]'));
    expect($('[data-reading-copy-current]').value).toContain('Saved elsewhere'); expect($('[data-reading-copy-selected]').value).toContain('This page draft');
    await click($('[data-reading-copy-restore]')); expect($('[data-section-prompt="mainIdea"]').value).toBe('This page draft'); expect(localStorage.getItem(KEY)).toBe(raw);
    expect($('[data-reading-save-retry]').textContent).toBe('Save restored work'); expect(document.activeElement).toBe($('[data-reading-persistence] [role="status"]'));
    expect([...host.querySelectorAll('[data-reading-recovery-copy]')].some(x => x.value.includes('Saved elsewhere'))).toBe(true);
    await type($('[data-section-prompt="mainIdea"]'), 'Reviewed and edited'); expect(localStorage.getItem(KEY)).toBe(raw);
    await click($('[data-reading-save-retry]')); expect(Object.values(JSON.parse(localStorage.getItem(KEY)))[0].responses[0].mainIdea).toBe('Reviewed and edited');
  });

  it('rejects a stale restore review and leaves newer typing and the saved record intact', async () => {
    await createLocalCopy(); await click($('[data-reading-copy-review]')); await type($('[data-section-prompt="mainIdea"]'), 'New text since review');
    const raw = localStorage.getItem(KEY); await click($('[data-reading-copy-restore]'));
    expect($('[data-section-prompt="mainIdea"]').value).toBe('New text since review'); expect(localStorage.getItem(KEY)).toBe(raw);
    expect($('[data-reading-persistence]').textContent).toContain('draft or recovery copy changed');
  });

  it('removes only an explicitly confirmed copy and ends unnecessary reload warnings', async () => {
    await createLocalCopy(); const raw = localStorage.getItem(KEY); expect(leave()).toBe(true);
    await click($('[data-reading-copy-review]')); expect($('[data-reading-copy-remove]').disabled).toBe(true);
    await click($('[data-reading-copy-confirm]')); await click($('[data-reading-copy-remove]'));
    expect($('[data-reading-recovery-copy]')).toBeNull(); expect($('[data-section-prompt="mainIdea"]').value).toBe('Saved elsewhere');
    expect(localStorage.getItem(KEY)).toBe(raw); expect(leave()).toBe(false);
    expect(document.activeElement).toBe($('[data-reading-persistence] [role="status"]'));
  });

  it('cancels without changing data and hides a reviewed copy when the learner or passage changes', async () => {
    const rerender = await createLocalCopy(), raw = localStorage.getItem(KEY); await click($('[data-reading-copy-review]'));
    await click($('[data-reading-copy-cancel]')); expect(localStorage.getItem(KEY)).toBe(raw); expect($('[data-reading-recovery-copy]')).not.toBeNull();
    await click($('[data-reading-copy-review]')); rerender({ readingLearnerKey: 'Different learner' }); expect($('[data-reading-copy-panel]')).toBeNull();
    rerender({ generatedContent: item(LONG + '\n\nA revised passage.') }); expect($('[data-reading-copy-panel]')).toBeNull(); expect($('[data-reading-recovery-copy]')).toBeNull();
  });

  it('registers all restore/remove strings in the candidate catalog', () => {
    const strings = JSON.parse(readFileSync(candidate + 'ui_strings.js', 'utf8'));
    for (const [key, value] of Object.entries(JSON.parse(readFileSync('reports/reader-place-copy-controls/strings.json', 'utf8')))) expect(strings.simplified[key], key).toBe(value);
  });
});
