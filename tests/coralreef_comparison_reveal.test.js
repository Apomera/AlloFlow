import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let scroll, oldScroll;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  scroll = vi.fn(); oldScroll = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scroll });
  loadTool('stem_lab/stem_tool_coralreef.js', 'coralReef');
});
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
  if (oldScroll) Object.defineProperty(Element.prototype, 'scrollIntoView', oldScroll); else delete Element.prototype.scrollIntoView;
  vi.restoreAllMocks();
});
const q = (t, selector) => t.host.querySelector(selector);
async function click(el) { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); await Promise.resolve(); }); }
async function mount() {
  let data = { coralReef: { section: 'guide', speciesBookmarks: { clownfish: true }, speciesLog: { green_turtle: { firstSeen: 10 } }, speciesFieldNotes: { clownfish: 'My own note' } } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key, reduceMotion: true }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell)));
  await click(q(t, '[data-start-practice]'));
  const select = q(t, '[data-practice-collection-select]');
  await React.act(async () => { select.value = 'saved'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  await click(q(t, '[data-practice-start]'));
  return t;
}

describe('practice comparison reveal', () => {
  it('reveals and focuses an explicitly opened candidate workspace and returns to its exact toggle on close', async () => {
    const t = await mount(), records = JSON.stringify(t.data);
    const options = [...t.host.querySelectorAll('[data-practice-choice]')].map(el => el.dataset.practiceChoice);
    scroll.mockClear(); await click(q(t, '[data-practice-compare-toggle]'));
    const heading = q(t, '[data-practice-comparison-heading]');
    expect(document.activeElement).toBe(heading);
    expect(heading.textContent).toBe('Compare the field marks');
    expect(scroll.mock.instances).toContain(heading);
    expect(heading.style.scrollMarginTop).toBe('28px');
    expect(q(t, '[data-practice-feedback]')).toBeNull();
    expect([...t.host.querySelectorAll('[data-practice-choice]')].map(el => el.dataset.practiceChoice)).toEqual(options);
    await click(q(t, '[data-practice-comparison-close]'));
    expect(document.activeElement).toBe(q(t, '[data-practice-compare-toggle]'));
    expect(q(t, '[data-practice-comparison]')).toBeNull();
    expect(JSON.stringify(t.data)).toBe(records);
  });

  it('reveals the answered guess comparison without changing the locked answer', async () => {
    const t = await mount();
    const wrong = [...t.host.querySelectorAll('[data-practice-choice]')].find(el => el.dataset.practiceChoice !== 'clownfish');
    await click(wrong); const feedback = q(t, '[data-practice-feedback]').textContent;
    await click(q(t, '[data-practice-compare-toggle]'));
    expect(document.activeElement).toBe(q(t, '[data-practice-comparison-heading]'));
    expect(document.activeElement.textContent).toBe('Your guess and the organism shown');
    await click(q(t, '[data-practice-choice="clownfish"]'));
    expect(q(t, '[data-practice-feedback]').textContent).toBe(feedback);
    expect(t.data.speciesPractice).toBeUndefined();
  });

  it('keeps the existing feedback focus after choosing a candidate and does not refocus comparison on a profile return', async () => {
    const t = await mount(); await click(q(t, '[data-practice-compare-toggle]'));
    await click(q(t, '[data-practice-candidate-choose="clownfish"]'));
    expect(document.activeElement).toBe(q(t, '[data-practice-feedback]'));
    const comparison = q(t, '[data-practice-comparison-heading]'); scroll.mockClear();
    await click([...t.host.querySelectorAll('button')].find(el => el.textContent.trim() === 'Study profile'));
    await click(q(t, '[data-close-profile]'));
    expect(q(t, '[data-practice-comparison-heading]')).toBe(comparison);
    expect(document.activeElement).toBe(q(t, '.cr-dxp-heading'));
    expect(scroll.mock.instances).not.toContain(comparison);
    expect(t.data.speciesPractice).toBeUndefined();
    expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 10 } });
    expect(t.data.speciesFieldNotes.clownfish).toBe('My own note');
  });
});
