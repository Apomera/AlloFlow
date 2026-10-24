import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef'); });
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
async function click(element) { expect(element, 'control exists').toBeTruthy(); await React.act(async () => { element.focus(); element.click(); await Promise.resolve(); }); }
async function mount(ids = ['clownfish'], mode = 'picture') {
  let data = { coralReef: { section: 'guide', speciesBookmarks: Object.fromEntries(ids.map(id => [id, true])), speciesFieldNotes: { clownfish: 'My original observation' }, speciesLog: { green_turtle: { firstSeen: 1 } } } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell)));
  await click(host.querySelector('[data-start-practice]'));
  const select = host.querySelector('[data-practice-collection-select]');
  await React.act(async () => { select.value = 'saved'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  if (mode === 'marks') await click(host.querySelector('[data-practice-mode="marks"]'));
  await click(host.querySelector('[data-practice-start]')); return t;
}
const picture = t => t.host.querySelector('[data-practice-picture-view]');
const zoom = (t, action) => t.host.querySelector('[data-practice-zoom="' + action + '"]');
const pan = (t, action) => t.host.querySelector('[data-practice-pan="' + action + '"]');
const scale = t => Number(picture(t).dataset.practiceScale);
const axis = (t, direction) => Number(picture(t).getAttribute('data-practice-pan-' + direction));
const target = t => picture(t).querySelector('img').getAttribute('src').split('/').pop().replace('.webp', '');

describe('neutral picture inspection during identification practice', () => {
  it('enlarges the shipped portrait with bounded panning and no answer, help or profile changes', async () => {
    const t = await mount(), original = JSON.parse(JSON.stringify(t.data));
    const img = picture(t).querySelector('img');
    expect(img.getAttribute('width')).toBe('640');
    expect(img.getAttribute('alt')).not.toMatch(/clownfish|ocellaris/i);
    expect(picture(t).querySelector('[data-practice-pan]')).toBeNull();
    expect(zoom(t, 'out').getAttribute('aria-disabled')).toBe('true');
    for (let i = 0; i < 6; i++) await click(zoom(t, 'in'));
    expect(scale(t)).toBe(2); expect(zoom(t, 'in').getAttribute('aria-disabled')).toBe('true');
    for (let i = 0; i < 9; i++) { await click(pan(t, 'right')); await click(pan(t, 'down')); }
    expect(axis(t, 'x')).toBe(50); expect(axis(t, 'y')).toBe(50);
    await click(zoom(t, 'out')); expect(scale(t)).toBe(1.75);
    expect(axis(t, 'x')).toBe(37.5); expect(axis(t, 'y')).toBe(37.5);
    const stage = t.host.querySelector('[data-practice-picture-stage]');
    expect(stage.getAttribute('tabindex')).toBe('0');
    expect(stage.getAttribute('aria-label')).toBe('Enlarged organism picture');
    await React.act(async () => stage.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true })));
    expect(axis(t, 'x')).toBe(29.5);
    await click(zoom(t, 'reset'));
    expect(scale(t)).toBe(1); expect(axis(t, 'x')).toBe(0); expect(axis(t, 'y')).toBe(0);
    expect(document.activeElement).toBe(zoom(t, 'reset'));
    expect(t.host.querySelector('[data-practice-feedback]')).toBeNull();
    expect(t.data).toEqual(original);
    await click(zoom(t, 'in'));
    await click(t.host.querySelector('[data-practice-choice="clownfish"]'));
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.data.speciesPractice.last).toMatchObject({ correct: 1, hinted: 0 });
    await click([...t.host.querySelectorAll('button')].find(b => b.textContent.trim() === 'Meet another collection'));
    expect(target(t)).toBe('clownfish');
    expect(scale(t), 'the same organism in another round starts at its original scale').toBe(1);
  });

  it('keeps written-clue mode concealed, then treats only uncovering as help', async () => {
    const t = await mount(['clownfish'], 'marks');
    expect(picture(t)).toBeNull(); expect(zoom(t, 'in')).toBeNull();
    expect(t.host.querySelector('.cr-dxp-portrait img')).toBeNull();
    await click(t.host.querySelector('[data-practice-picture-toggle]'));
    await click(zoom(t, 'in')); await click(pan(t, 'left'));
    expect(scale(t)).toBe(1.25);
    expect(t.host.querySelector('[data-practice-feedback]')).toBeNull();
    await click(t.host.querySelector('[data-practice-picture-toggle]'));
    expect(picture(t)).toBeNull();
    await click(t.host.querySelector('[data-practice-picture-toggle]'));
    expect(scale(t)).toBe(1);
    await click(t.host.querySelector('[data-practice-choice="clownfish"]'));
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.data.speciesPractice.last).toMatchObject({ total: 1, correct: 1, hinted: 1 });
    expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'My original observation' });
    expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } });
  });

  it('retains the inspected view through feedback and a profile visit, but resets for each new organism and round', async () => {
    const t = await mount(['clownfish', 'blue_tang']);
    const first = target(t);
    await click(zoom(t, 'in')); await click(pan(t, 'right'));
    await click(t.host.querySelector('[data-practice-choice="' + first + '"]'));
    expect(scale(t)).toBe(1.25); expect(axis(t, 'x')).toBe(8);
    const study = [...t.host.querySelectorAll('button')].find(b => b.textContent.trim() === 'Study profile');
    await click(study); await click(t.host.querySelector('[data-close-profile]'));
    expect(scale(t)).toBe(1.25); expect(axis(t, 'x')).toBe(8);
    await click(t.host.querySelector('[data-practice-next]'));
    expect(target(t)).not.toBe(first); expect(scale(t)).toBe(1); expect(axis(t, 'x')).toBe(0);
    await click(zoom(t, 'in'));
    await click(t.host.querySelector('[data-practice-choice="' + target(t) + '"]'));
    await click(t.host.querySelector('[data-practice-next]'));
    await click([...t.host.querySelectorAll('button')].find(b => b.textContent.trim() === 'Meet another collection'));
    expect(scale(t)).toBe(1); expect(axis(t, 'x')).toBe(0);
    expect(t.data.speciesPractice.last.hinted).toBe(0);
    expect(JSON.stringify(t.data.speciesPractice)).not.toMatch(/scale|pan|view/);
  });

  it('resets a failed portrait to a neutral text fallback while keeping identification available', async () => {
    const t = await mount();
    await click(zoom(t, 'in')); await click(pan(t, 'right'));
    await React.act(async () => picture(t).querySelector('img').dispatchEvent(new Event('error')));
    expect(scale(t)).toBe(1); expect(axis(t, 'x')).toBe(0);
    expect(picture(t).querySelector('img')).toBeNull();
    expect(picture(t).querySelector('[role="status"]').textContent).toContain('Use the written observation');
    expect(picture(t).textContent).not.toMatch(/clownfish|ocellaris/i);
    expect(zoom(t, 'in').getAttribute('aria-disabled')).toBe('true');
    await click(zoom(t, 'in')); expect(scale(t)).toBe(1);
    expect(picture(t).querySelector('canvas')).toBeNull();
    await click(t.host.querySelector('[data-practice-choice="clownfish"]'));
    await click(t.host.querySelector('[data-practice-next]'));
    expect(t.data.speciesPractice.last).toMatchObject({ correct: 1, hinted: 0 });
  });
});
