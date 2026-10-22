import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let scroll, oldScroll;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
  scroll = vi.fn(); oldScroll = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scroll });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addListener() {}, removeListener() {} })));
});
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
  if (oldScroll) Object.defineProperty(Element.prototype, 'scrollIntoView', oldScroll); else delete Element.prototype.scrollIntoView;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
const q = (t, selector) => t.host.querySelector(selector);
const profileId = t => q(t, '[data-marine-profile]')?.dataset.marineProfile;
const footer = (t, action) => q(t, '[data-profile-footer-' + action + ']');
const named = (t, text) => [...t.host.querySelectorAll('button')].find(el => el.textContent === text);
async function click(el) { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); await Promise.resolve(); }); }
async function mount(seed = {}, reduceMotion = false) {
  let data = { coralReef: { section: 'guide', speciesBookmarks: { clownfish: true, blue_tang: true }, speciesFieldNotes: { clownfish: 'Preserve this note' }, speciesLog: { green_turtle: { firstSeen: 1 } }, ...seed } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key, reduceMotion }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell))); return t;
}

describe('species profile reading-end navigation', () => {
  it('follows the captured saved route even after unsaving and restores the original guide focus fallback', async () => {
    const t = await mount({ guideFilter: 'saved' }); await click(q(t, '[data-open-profile="clownfish"]'));
    const nav = q(t, '[data-profile-footer]'); expect(nav.tagName).toBe('NAV'); expect(nav.getAttribute('aria-label')).toBe('Continue exploring');
    expect(footer(t, 'next').getAttribute('aria-label')).toBe(q(t, '[data-profile-next]').getAttribute('aria-label'));
    expect(footer(t, 'previous').getAttribute('aria-label')).toBe(q(t, '[data-profile-previous]').getAttribute('aria-label'));
    await click(q(t, '[data-save-profile="clownfish"]'));
    await click(footer(t, 'next')); expect(profileId(t)).toBe('blue_tang');
    expect(document.activeElement).toBe(q(t, '.crdx-title'));
    await click(footer(t, 'previous')); expect(profileId(t)).toBe('clownfish');
    expect(q(t, '[data-profile-selection-position]').textContent).toContain('1 of 2');
    await click(footer(t, 'back')); expect(profileId(t)).toBeUndefined();
    expect(t.host.querySelectorAll('[data-species]')).toHaveLength(1); expect(document.activeElement).toBe(q(t, 'input[type="search"]'));
    expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'Preserve this note' }); expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } });
    expect(t.data.speciesPractice).toBeUndefined(); expect(JSON.stringify(t.data)).not.toMatch(/profileSelection|footer|practiceHeading/);
  });

  it('omits redundant entry buttons for a singleton and returns to its original card', async () => {
    const t = await mount({ guideFilter: 'saved', speciesBookmarks: { clownfish: true } });
    await click(q(t, '[data-open-profile="clownfish"]'));
    expect(footer(t, 'next')).toBeNull(); expect(footer(t, 'previous')).toBeNull();
    expect(footer(t, 'back').textContent).toBe('Back to the field guide');
    await click(footer(t, 'back')); expect(document.activeElement).toBe(q(t, '[data-open-profile="clownfish"]'));
  });

  it('preserves explicit outside-related navigation and the original selected collection', async () => {
    const t = await mount({ guideFilter: 'saved', speciesBookmarks: { clownfish: true } });
    await click(q(t, '[data-open-profile="clownfish"]')); await click(q(t, '[data-profile-related]'));
    expect(q(t, '[data-profile-selection-position]')).toBeNull(); expect(footer(t, 'next')).toBeTruthy();
    const target = q(t, '[data-profile-next]').getAttribute('aria-label'); expect(footer(t, 'next').getAttribute('aria-label')).toBe(target);
    await click(footer(t, 'back')); expect([...t.host.querySelectorAll('[data-species]')].map(el => el.dataset.species)).toEqual(['clownfish']);
    expect(document.activeElement).toBe(q(t, '[data-open-profile="clownfish"]'));
  });

  it.each([[false, false, 'smooth'], [true, false, 'auto'], [false, true, 'auto']])('returns to the retained practice heading only for footer Back with host reduce=%s system reduce=%s', async (hostReduce, systemReduce, behavior) => {
    const t = await mount({ guideFilter: 'saved', speciesBookmarks: { clownfish: true } }, hostReduce);
    window.matchMedia.mockReturnValue({ matches: systemReduce });
    await click(q(t, '[data-start-practice]')); await click(q(t, '[data-practice-start]'));
    await click(q(t, '[data-practice-zoom="in"]')); await click(q(t, '[data-practice-compare-toggle]'));
    const wrong = [...t.host.querySelectorAll('[data-practice-candidate-choose]')].find(el => el.dataset.practiceCandidateChoose !== 'clownfish');
    const guessed = wrong.dataset.practiceCandidateChoose; await click(wrong);
    await click(q(t, '[data-practice-guess-detail="1"]')); await click(q(t, '[data-practice-detail="2"]'));
    const pair = q(t, '[data-practice-contrast-reminder]').textContent;
    await click(q(t, '[data-practice-guess-study="' + guessed + '"]')); expect(footer(t, 'back').textContent).toBe('Back to practice');
    await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 35)); }); scroll.mockClear();
    await click(footer(t, 'back'));
    const heading = q(t, '.cr-dxp-heading'); expect(document.activeElement).toBe(heading);
    expect(scroll.mock.contexts).toEqual([heading]); expect(scroll).toHaveBeenLastCalledWith({ block: 'start', behavior });
    expect(q(t, '[data-practice-scale="1.25"]')).toBeTruthy(); expect(q(t, '[data-practice-contrast-reminder]').textContent).toBe(pair);
    expect(q(t, '[data-practice-candidate-choose]')).toBeNull(); expect(t.data.speciesPractice).toBeUndefined();
    await click(q(t, '[data-practice-guess-study="' + guessed + '"]'));
    await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 35)); }); scroll.mockClear();
    await click(q(t, '[data-close-profile]')); expect(scroll).not.toHaveBeenCalled();
    expect(q(t, '[data-practice-contrast-reminder]').textContent).toBe(pair);
    expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'Preserve this note' }); expect(t.data.speciesBookmarks).toEqual({ clownfish: true });
    expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } });
  });
});
