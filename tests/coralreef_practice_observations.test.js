import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let X;
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef; });
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
async function click(element) { expect(element, 'control exists').toBeTruthy(); await React.act(async () => { element.focus(); element.click(); await Promise.resolve(); }); }
function write(element, value) {
  Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}
async function type(element, value) { element.focus(); await React.act(async () => write(element, value)); }
async function mount(seed = {}) {
  let data = { coralReef: { section: 'guide', speciesBookmarks: { clownfish: true }, ...seed } }, update;
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; update = setState; return cfg.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key }); }
  const t = { host, root, get data() { return data.coralReef; }, async patch(values) { await React.act(async () => update(before => ({ ...before, coralReef: { ...before.coralReef, ...values } }))); } };
  mounted.push(t); await React.act(async () => root.render(React.createElement(Shell)));
  await click(host.querySelector('[data-start-practice]'));
  const select = host.querySelector('[data-practice-collection-select]');
  await React.act(async () => { select.value = 'saved'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  await click(host.querySelector('[data-practice-start]')); return t;
}
const input = t => t.host.querySelector('[data-practice-observation-input]');
const target = t => t.host.querySelector('.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, '');
const textButton = (t, text) => [...t.host.querySelectorAll('button')].find(button => button.textContent.trim() === text);

describe('optional observations before naming', () => {
  it('bounds strings without coercing malformed input or changing the learner’s draft whitespace', () => {
    for (const value of [null, undefined, {}, [], true, 7]) expect(X.marinePracticeObservation(value)).toBe('');
    expect(X.marinePracticeObservation('  first line\nsecond line  ')).toBe('  first line\nsecond line  ');
    expect(X.marinePracticeObservation('x'.repeat(300))).toHaveLength(240);
  });

  it('preserves a focused draft across help, comparison and an unanswered profile roundtrip, then reviews it without touching persistent notes', async () => {
    const speciesLog = { green_turtle: { firstSeen: 1, site: 'healthy' } }, speciesFieldNotes = { clownfish: 'Persistent profile note' }, bookmarks = { clownfish: true };
    const t = await mount({ speciesLog, speciesFieldNotes, speciesBookmarks: bookmarks }), id = target(t), draft = 'I notice white bands around a short body.';
    await click(t.host.querySelector('[data-practice-observation] summary'));
    expect(input(t).labels[0].textContent).toBe('What do you notice?');
    expect(input(t).getAttribute('maxLength')).toBe('240');
    await type(input(t), draft);
    expect(document.activeElement).toBe(input(t));
    expect(t.host.querySelector('.cr-dxp-note-count').textContent).toContain(String(draft.length));
    expect(t.host.querySelector('[data-practice-observation]').textContent).toContain('not graded or added to your profile Field notes');
    await click(textButton(t, 'More field marks'));
    await click(t.host.querySelector('[data-practice-compare-toggle]'));
    expect(input(t).value).toBe(draft);
    await t.patch({ guideSpeciesId: 'blue_tang' });
    expect(t.host.querySelector('[data-marine-profile="blue_tang"]')).toBeTruthy();
    await click(t.host.querySelector('[data-close-profile]'));
    expect(input(t).value).toBe(draft);
    expect(target(t)).toBe(id);
    expect(t.host.querySelector('[data-practice-feedback]')).toBeNull();
    await click(t.host.querySelector('[data-practice-skip]'));
    expect(t.host.querySelector('[data-practice-observation-feedback]').textContent).toBe(draft);
    expect(input(t)).toBeNull();
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.host.querySelector('[data-practice-review-observation="' + id + '"]').textContent).toBe(draft);
    expect(t.data.speciesPractice.last).toMatchObject({ total: 1, skipped: 1, hinted: 1 });
    expect(JSON.stringify(t.data.speciesPractice)).not.toContain(draft);
    expect(t.data.speciesFieldNotes).toEqual(speciesFieldNotes);
    expect(t.data.speciesBookmarks).toEqual(bookmarks);
    expect(t.data.speciesLog).toEqual(speciesLog);
  });

  it('snapshots the latest draft as escaped text without evaluating it or counting writing as assistance', async () => {
    const t = await mount(), id = target(t), draft = '<img src=x onerror=alert(1)> I think this is clownfish.';
    const wrong = [...t.host.querySelectorAll('[data-practice-choice]')].find(button => button.dataset.practiceChoice !== id);
    await React.act(async () => { write(input(t), draft); wrong.click(); });
    expect(t.host.querySelector('[data-practice-observation-feedback]').textContent).toBe(draft);
    expect(t.host.querySelector('[data-practice-observation-feedback] img')).toBeNull();
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.data.speciesPractice).toMatchObject({ answered: 1, correct: 0, last: { hinted: 0, correct: 0, skipped: 0 } });
    expect(t.data.speciesLog).toBeUndefined();
    expect(t.data.speciesFieldNotes).toBeUndefined();
  });

  it('clears the draft for each new question and round while keeping earlier words in that round’s review', async () => {
    const t = await mount({ speciesBookmarks: { clownfish: true, blue_tang: true } }), first = target(t);
    await type(input(t), 'My first observation');
    await click(t.host.querySelector('[data-practice-skip]'));
    await click(t.host.querySelector('[data-practice-next]'));
    expect(input(t).value).toBe('');
    expect(t.host.querySelector('[data-practice-observation]').open).toBe(false);
    expect(t.host.querySelector('[data-practice-observation-feedback]')).toBeNull();
    await click(t.host.querySelector('[data-practice-choice="' + target(t) + '"]'));
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.host.querySelectorAll('[data-practice-review-observation]')).toHaveLength(1);
    expect(t.host.querySelector('[data-practice-review-observation="' + first + '"]').textContent).toBe('My first observation');
    expect(t.data.speciesPractice.last.hinted).toBe(0);
    await click(textButton(t, 'Choose another group'));
    await click(t.host.querySelector('[data-practice-start]'));
    expect(input(t).value).toBe('');
    expect(t.host.querySelector('[data-practice-observation]').open).toBe(false);
  });

  it('keeps the disclosure closed and entirely optional, with whitespace-only drafts omitted from feedback and review', async () => {
    const t = await mount();
    expect(t.host.querySelector('[data-practice-observation]').open).toBe(false);
    expect(input(t).required).toBe(false);
    await type(input(t), '   \n ');
    await click(t.host.querySelector('[data-practice-choice="clownfish"]'));
    expect(t.host.querySelector('[data-practice-observation-feedback]')).toBeNull();
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.host.querySelector('[data-practice-review-observation]')).toBeNull();
    expect(t.data.speciesPractice).toMatchObject({ correct: 1, answered: 1, last: { hinted: 0 } });
  });
});
