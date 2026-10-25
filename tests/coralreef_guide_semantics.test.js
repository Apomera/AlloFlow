import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let X;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
});
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals();
});
const q = (t, selector) => t.host.querySelector(selector);
const records = t => JSON.stringify({ bookmarks: t.data.speciesBookmarks, notes: t.data.speciesFieldNotes, log: t.data.speciesLog, practice: t.data.speciesPractice });
async function click(el) { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); }); }
async function select(el, value) { await React.act(async () => { el.focus(); el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); }); }
async function settle() { await React.act(async () => vi.advanceTimersByTime(600)); }
async function mount(seed = {}, announceToSR) {
  let data = { coralReef: { section: 'guide', speciesBookmarks: { blue_tang: true }, speciesFieldNotes: { clownfish: 'Three white bands.' }, speciesLog: { green_turtle: { firstSeen: 1 } }, ...seed } };
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host);
  function Shell() { const [state, setState] = React.useState(data); data = state; return window.StemLab._registry.coralReef.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key, reduceMotion: true, announceToSR }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell))); return t;
}

describe('species guide heading navigation and result semantics', () => {
  it('exposes each visible organism as a heading beneath its group without changing its name or creating extra tab stops', async () => {
    const t = await mount(), before = records(t), TX = X.speciesText((key, fallback) => fallback);
    expect(t.host.querySelectorAll('[data-species]')).toHaveLength(X.SPECIES_META.length);
    for (const group of t.host.querySelectorAll('.cr-guide-group')) {
      expect(group.querySelector(':scope > h3')).toBeTruthy();
      for (const card of group.querySelectorAll('[data-species]')) {
        const name = card.querySelector('h4.cr-sp-name');
        expect(name, card.dataset.species + ' is available in heading navigation').toBeTruthy();
        expect(name.textContent).toContain(TX[card.dataset.species].name);
        expect(name.tabIndex).toBe(-1);
        expect(card.querySelector('[data-open-profile]')).toBeTruthy();
      }
    }
    expect(records(t)).toBe(before);
  });

  it('keeps a look-alike jump focused on the species heading when it expands a filtered, compact collection', async () => {
    const t = await mount({ guideFilter: 'saved', guideCompact: true, speciesBookmarks: { parrotfish: true } }), before = records(t);
    const target = 'bumphead_parrotfish', link = q(t, '[data-species="parrotfish"] [data-lookalike="' + target + '"]');
    expect(q(t, '[data-species="' + target + '"]')).toBeNull();
    await click(link);
    const heading = q(t, '[data-species="' + target + '"] h4.cr-sp-name');
    expect(heading).toBeTruthy(); expect(document.activeElement).toBe(heading);
    expect(t.data.guideFilter).toBe('all'); expect(t.data.guideCompact).toBe(true); expect(records(t)).toBe(before);
  });

  it.each(['collection', 'group', 'role'].flatMap(kind => [false, true].map(hostSpeaker => ({ kind, hostSpeaker }))))('keeps $kind empty-state help and recovery outside live content (host announcer=$hostSpeaker)', async ({ kind, hostSpeaker }) => {
    const speaker = hostSpeaker ? vi.fn() : undefined;
    const t = await mount(kind === 'collection' ? { speciesBookmarks: {} } : {}, speaker), before = records(t);
    const live = q(t, '[data-reef-announcement]');
    await click(q(t, '[data-guide-collection="saved"]'));
    if (kind === 'group') await select(q(t, '[data-guide-group-filter]'), 'coral');
    if (kind === 'role') await select(q(t, '[data-guide-role]'), 'cleaners');
    const panel = q(t, '[data-guide-' + kind + '-empty]');
    expect(panel).toBeTruthy(); expect(panel.tagName).toBe('SECTION');
    const name = document.getElementById(panel.getAttribute('aria-labelledby'));
    expect(name?.tagName).toBe('H3'); expect(panel.contains(name)).toBe(true); expect(name.textContent.length).toBeGreaterThan(10);
    const recovery = panel.querySelector('button');
    expect(recovery.closest('[role="status"], [aria-live]')).toBeNull();
    await settle();
    expect(t.host.querySelectorAll('[role="status"]')).toHaveLength(hostSpeaker ? 0 : 1);
    if (speaker) { expect(speaker).toHaveBeenCalledOnce(); expect(speaker).toHaveBeenCalledWith(q(t, '[data-guide-result-count]').textContent); }
    else { expect(q(t, '[data-reef-announcement]')).toBe(live); expect(live.textContent).toBe(q(t, '[data-guide-result-count]').textContent); }
    await click(recovery);
    expect(q(t, '[data-guide-' + kind + '-empty]')).toBeNull();
    expect(document.activeElement).toBe(q(t, 'input[type="search"]'));
    expect(t.host.querySelectorAll('h4.cr-sp-name').length).toBeGreaterThan(0);
    expect(records(t)).toBe(before);
  });
});
