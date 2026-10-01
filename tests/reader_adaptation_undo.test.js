import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { boot, env, antiBlocks, makeHostHook, makeHost, dom } from './helpers/reader_host_harness.js';

// Undoing an applied adaptation (2026-09-28), with the real reader, the real
// HostHandlers and GenerationHelpers modules, and verbatim host code:
//  - Ctrl+Z right after Apply skipped both the adaptation and the manual edit
//    before it (Apply recorded no undo step) and hid the Back button;
//  - "Back to previous version" restored only the text: the translation policy,
//    citation audit, level/alignment checks and kept word help stayed as the
//    adaptation left them.
const T0 = 'Herons are wading birds that live near lakes and rivers, where they hunt carefully for fish and frogs in the shallow water.';
const T1 = T0 + ' Herons nest in tall trees.';
const T2 = 'Herons are wading birds. They live near lakes and rivers. They hunt for fish and frogs in shallow water. Herons nest in tall trees.';
let root, hostEl;
beforeAll(() => { boot(); });
afterEach(() => { if (root) env.act(() => root.unmount()); hostEl?.remove(); root = null; });
const clone = value => JSON.parse(JSON.stringify(value));
const diffKeys = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
function mountHost(item, candidate, extra = {}) {
  const { React, createRoot, act } = env;
  const { Host, exposed } = makeHost({ hook: makeHostHook(antiBlocks()), item, generate: async () => candidate, ...extra });
  hostEl = document.createElement('div'); document.body.append(hostEl); root = createRoot(hostEl);
  act(() => root.render(React.createElement(Host)));
  return { exposed, ...dom(hostEl) };
}
async function previewAndApply({ $, click, settle }) {
  await click($('[data-adapt-option="shorterSentences"]'));
  await click($('[data-apply-complexity]')); await settle(10);
  await click($('[data-adaptation-apply]')); await settle(10);
}

describe('Ctrl+Z after applying an adaptation', () => {
  it('steps back one change at a time: the adaptation, then the manual edit before it', async () => {
    const view = mountHost({ id: 'adapted-1', type: 'simplified', title: 'Herons', data: T0, instructionalText: { form: 'adapted', role: 'supplemental' }, config: { language: 'English' } }, T2);
    const { exposed, $, settle, typeInto, key } = view;
    env.act(() => exposed.setIsEditingLeveledText(true));
    await typeInto(hostEl.querySelector('textarea[data-allo-textundo="simplified"]'), T1);
    env.act(() => exposed.setIsEditingLeveledText(false));
    await settle(1000); // the typing burst ends
    await previewAndApply(view);
    expect(exposed.generatedContent.data).toBe(T2);
    expect($('[data-adaptation-undo]')).not.toBeNull();
    const shown = () => exposed.generatedContent.data;
    await key('z'); await settle(10); expect(shown()).toBe(T1);
    await key('z'); await settle(10); expect(shown()).toBe(T0);
    await key('y'); await settle(10); expect(shown()).toBe(T1);
    await key('y'); await settle(10); expect(shown()).toBe(T2);
    expect($('[data-adaptation-undo]')).not.toBeNull(); // Back is offered again on the applied text
  });
});

describe('Back to previous version', () => {
  it('restores every field the adaptation wrote, not only the text', async () => {
    const contract = env.M.InstructionalContext;
    const item = { id: 'adapted-1', type: 'simplified', title: 'Herons', data: T0, instructionalText: { form: 'adapted', role: 'supplemental' },
      config: { language: 'English', grade: 'Grade 4', textFormat: 'Standard Text', translationPolicy: { enabled: false, target: '', mode: 'off' }, translationTarget: '' },
      levelCheck: { status: 'checked', estimatedGrade: '6', at: 'earlier' }, alignmentCheck: { status: 'aligned', at: 'earlier' } };
    const start = T0.indexOf('wading');
    item.adaptedReadingSupports = contract.setAdaptedReadingSupportsShown(item, contract.upsertAdaptedReadingSupport(item, undefined, { id: 'w1', start, end: start + 6, quote: 'wading', text: 'Walking in water.' }), true);
    const view = mountHost(item, T2);
    const before = clone(view.exposed.history[0]);
    await previewAndApply(view);
    expect(diffKeys(before, clone(view.exposed.history[0]))).toContain('config'); // the adaptation did rewrite it
    await view.click(view.$('[data-adaptation-undo]')); await view.settle(10);
    expect(diffKeys(before, clone(view.exposed.history[0]))).toEqual([]);
    expect(JSON.stringify(view.exposed.generatedContent)).toBe(JSON.stringify(view.exposed.history[0]));
    expect(view.$('[data-adaptation-notice]').textContent).toBe('Back to the previous version.');
  });

  it('brings back word help that was kept after Apply', async () => {
    const contract = env.M.InstructionalContext;
    const item = { id: 'adapted-1', type: 'simplified', title: 'Herons', data: T0, instructionalText: { form: 'adapted', role: 'supplemental' }, config: { language: 'English' } };
    const start = T0.indexOf('wading');
    item.adaptedReadingSupports = contract.setAdaptedReadingSupportsShown(item, contract.upsertAdaptedReadingSupport(item, undefined, { id: 'w1', start, end: start + 6, quote: 'wading', text: 'Walking in water.' }), true);
    const view = mountHost(item, T2);
    await previewAndApply(view);
    // The teacher keeps the matching word help on the new text and shows it again.
    const keep = current => current && current.id === item.id ? { ...current, adaptedReadingSupports: contract.setAdaptedReadingSupportsShown(current, contract.rebaseAdaptedReadingSupports(current, current.adaptedReadingSupports), true) } : current;
    env.act(() => { view.exposed.setGeneratedContent(keep); view.exposed.setHistory(list => list.map(keep)); });
    await view.settle(10);
    await view.click(view.$('[data-adaptation-undo]')); await view.settle(10);
    const back = view.exposed.history[0];
    expect(back.data).toBe(T0);
    expect(contract.studentAdaptedReadingSupports(back, back.adaptedReadingSupports)?.annotations.length ?? 0).toBe(1);
  });
});
