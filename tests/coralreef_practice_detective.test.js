import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let X, TX;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef; TX = X.speciesText((key, fallback) => fallback);
});
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
async function click(element) { expect(element, 'control exists').toBeTruthy(); await React.act(async () => { element.focus(); element.click(); await Promise.resolve(); }); }
const button = (t, label) => [...t.host.querySelectorAll('button')].find(el => el.textContent.trim() === label);
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
  return t;
}
async function start(t, detective = true) {
  if (detective) await click(t.host.querySelector('[data-practice-mode="marks"]'));
  await click(t.host.querySelector('[data-practice-start]'));
}

describe('field-mark detective practice', () => {
  it('keeps picture practice as the default with a labelled native mode choice', async () => {
    const t = await mount();
    const defaultMode = t.host.querySelector('[data-practice-mode="picture"]');
    expect(defaultMode.checked).toBe(true);
    expect(defaultMode.labels[0].textContent).toContain('Picture and field marks');
    expect(defaultMode.closest('fieldset').querySelector('legend').textContent).toBe('Choose how to observe');
    await start(t, false);
    expect(t.host.querySelector('.cr-dxp-portrait img')).toBeTruthy();
    expect(t.host.querySelector('[data-practice-mystery]')).toBeNull();
    expect(t.host.querySelector('[data-practice-picture-toggle]')).toBeNull();
    await click(t.host.querySelector('[data-practice-choice="clownfish"]'));
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.data.speciesPractice.last).toMatchObject({ total: 1, correct: 1, hinted: 0 });
  });

  it('starts with useful non-spoiling written clues and reveals the portrait only after answering, without counting automatic reveal as help', async () => {
    const t = await mount(); await start(t);
    const mystery = t.host.querySelector('[data-practice-mystery]');
    expect(mystery).toBeTruthy();
    expect(t.host.querySelector('.cr-dxp-portrait')).toBeNull();
    expect(mystery.textContent).toContain(X.marinePracticeClues(TX.clownfish, X.SPECIES_META.find(m => m.id === 'clownfish'))[0]);
    expect(mystery.textContent.toLowerCase()).not.toContain('clownfish');
    const choices = t.host.querySelector('.cr-dxp-options');
    expect(document.getElementById(choices.getAttribute('aria-describedby')).textContent).toContain('white');
    await click(t.host.querySelector('[data-practice-choice="clownfish"]'));
    expect(t.host.querySelector('.cr-dxp-portrait img')).toBeTruthy();
    expect(t.host.querySelector('[data-practice-mystery]')).toBeNull();
    expect(t.host.querySelector('[data-practice-picture-toggle]')).toBeNull();
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.data.speciesPractice).toMatchObject({ answered: 1, correct: 1, last: { hinted: 0 } });
    expect(t.data.speciesLog).toBeUndefined();
  });

  it('makes picture assistance explicit, preserves toggle focus, and counts repeated reveals only once', async () => {
    const t = await mount(); await start(t);
    const toggle = t.host.querySelector('[data-practice-picture-toggle]');
    expect(document.getElementById(toggle.getAttribute('aria-describedby')).textContent).toContain('counts as help');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await click(toggle);
    expect(document.activeElement).toBe(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(t.host.querySelector('.cr-dxp-portrait img')).toBeTruthy();
    await click(toggle); await click(toggle);
    expect(document.activeElement).toBe(toggle);
    await click(t.host.querySelector('[data-practice-choice="clownfish"]'));
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.data.speciesPractice).toMatchObject({ rounds: 1, answered: 1, correct: 1, last: { total: 1, hinted: 1 } });
    expect(JSON.stringify(t.data.speciesPractice)).not.toMatch(/picture|mode/);
  });

  it('keeps extra clues and a learner’s draft available through picture toggles and a profile visit', async () => {
    const t = await mount({ speciesFieldNotes: { clownfish: 'My saved note' } }); await start(t);
    const area = t.host.querySelector('[data-practice-observation-input]');
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(area, 'I imagine bands around the body.');
      area.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click(button(t, 'More field marks'));
    expect(t.host.querySelector('[data-practice-mystery] ul')).toBeTruthy();
    await click(t.host.querySelector('[data-practice-picture-toggle]'));
    expect(t.host.querySelector('.cr-dxp-observe ul')).toBeTruthy();
    await click(t.host.querySelector('[data-practice-picture-toggle]'));
    expect(t.host.querySelector('[data-practice-mystery] ul')).toBeTruthy();
    await t.patch({ guideSpeciesId: 'blue_tang' });
    await click(t.host.querySelector('[data-close-profile]'));
    expect(t.host.querySelector('[data-practice-mystery]')).toBeTruthy();
    expect(t.host.querySelector('[data-practice-observation-input]').value).toBe('I imagine bands around the body.');
    await click(t.host.querySelector('[data-practice-skip]'));
    expect(t.host.querySelector('.cr-dxp-portrait img')).toBeTruthy();
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'My saved note' });
    expect(t.data.speciesPractice.last).toMatchObject({ skipped: 1, hinted: 1 });
  });

  it('resets the covered picture and help for each new organism and retains the chosen mode for another round', async () => {
    const t = await mount({ speciesBookmarks: { clownfish: true, blue_tang: true } }); await start(t);
    await click(t.host.querySelector('[data-practice-picture-toggle]'));
    await click(t.host.querySelector('[data-practice-skip]'));
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.host.querySelector('[data-practice-mystery]')).toBeTruthy();
    expect(t.host.querySelector('.cr-dxp-portrait img')).toBeNull();
    expect(t.host.querySelector('[data-practice-picture-toggle]').getAttribute('aria-expanded')).toBe('false');
    await click(t.host.querySelector('[data-practice-skip]'));
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.data.speciesPractice.last).toMatchObject({ total: 2, skipped: 2, hinted: 1 });
    await click(button(t, 'Choose another group'));
    expect(t.host.querySelector('[data-practice-mode="marks"]').checked).toBe(true);
    await click(t.host.querySelector('[data-practice-start]'));
    expect(t.host.querySelector('[data-practice-mystery]')).toBeTruthy();
  });
});
