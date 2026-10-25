import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let mounted, X;
beforeEach(() => {
  mounted = [];
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('matchMedia', () => ({ matches: true, addListener() {}, removeListener() {} }));
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
});
afterEach(async () => {
  for (const t of mounted) { await React.act(async () => t.root.unmount()); t.host.remove(); }
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals();
});
const q = (t, selector) => t.host.querySelector(selector);
const count = t => q(t, '[data-guide-result-count]').textContent;
const status = t => q(t, '[data-reef-announcement]');
async function settle(ms = 600) { await React.act(async () => vi.advanceTimersByTime(ms)); }
async function click(el) { expect(el).toBeTruthy(); await React.act(async () => { el.focus(); el.click(); }); }
async function change(el, value) {
  await React.act(async () => {
    el.focus();
    Object.getOwnPropertyDescriptor(el.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLSelectElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event(el.tagName === 'INPUT' ? 'input' : 'change', { bubbles: true }));
  });
}
async function mount({ announce, data = {} } = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), t = { host, root };
  function Shell() {
    const [state, setState] = React.useState({ coralReef: { section: 'guide', speciesBookmarks: { clownfish: true, blue_tang: true }, ...data } });
    const [speaker, setSpeaker] = React.useState(() => announce);
    t.data = state.coralReef; t.setState = setState; t.setSpeaker = fn => setSpeaker(() => fn);
    return window.StemLab._registry.coralReef.render({ React, toolData: state, setToolData: setState, t: (k, f) => f, reduceMotion: true, announceToSR: speaker });
  }
  mounted.push(t); await React.act(async () => root.render(React.createElement(Shell))); return t;
}

describe('guide result announcements', () => {
  it('mounts a quiet local status and debounces current results without moving focus', async () => {
    const t = await mount(), live = status(t), input = q(t, 'input[type=search]');
    expect(live.getAttribute('role')).toBe('status'); expect(live.getAttribute('aria-atomic')).toBe('true');
    await settle(); expect(live.textContent).toBe('');
    await change(input, 'blue'); await settle(300); await change(input, 'blue tang');
    await settle(599); expect(live.textContent).toBe('');
    await settle(1); expect(live.textContent).toBe(count(t)); expect(live.textContent).toBe(`Showing 1 of ${X.SPECIES_META.length}.`);
    expect(status(t)).toBe(live); expect(document.activeElement).toBe(input);
  });

  it('announces the restored collection after deleting the last search character', async () => {
    const t = await mount(), input = q(t, 'input[type=search]');
    await change(input, 'clownfish'); await settle(); expect(status(t).textContent).toBe(count(t));
    await change(input, ''); await settle(); expect(status(t).textContent).toBe(`Showing ${X.SPECIES_META.length} of ${X.SPECIES_META.length}.`);
    expect(document.activeElement).toBe(input);
  });

  it('announces filter resets and changed saved counts, preserving bookmarks and notes', async () => {
    const t = await mount({ data: { speciesFieldNotes: { clownfish: 'Three bands' } } });
    await click(q(t, '[data-guide-collection=saved]')); await settle(); expect(status(t).textContent).toBe('Showing 2 of 2.');
    await click(q(t, '[data-save-guide=blue_tang]')); expect(status(t).textContent).toBe('Removed from your saved species.');
    await settle(); expect(status(t).textContent).toBe('Showing 1 of 1.');
    expect(t.data.speciesBookmarks).toEqual({ clownfish: true }); expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'Three bands' });
    await click(q(t, '[data-guide-collection=all]')); await settle(); expect(status(t).textContent).toBe(count(t));
  });

  it.each(['profile', 'practice', 'section'])('cancels pending results when opening %s', async destination => {
    const speaker = vi.fn(), t = await mount({ announce: speaker });
    await change(q(t, 'input[type=search]'), 'clownfish'); await settle(200);
    if (destination === 'profile') await click(q(t, '[data-open-profile=clownfish]'));
    else if (destination === 'practice') await click(q(t, '[data-start-practice]'));
    else await click([...t.host.querySelectorAll('.cr-nav button')].find(b => b.textContent.trim() === 'Start'));
    speaker.mockClear(); await settle(); expect(speaker).not.toHaveBeenCalled();
  });

  it('reports a result canceled by profile entry only when returning to the guide', async () => {
    const speaker = vi.fn(), t = await mount({ announce: speaker });
    await change(q(t, 'input[type=search]'), 'clownfish'); await click(q(t, '[data-open-profile=clownfish]')); await settle();
    expect(speaker).not.toHaveBeenCalled();
    await React.act(async () => t.setState(prev => ({ ...prev, coralReef: { ...prev.coralReef, guideSpeciesId: null } })));
    await settle(); expect(speaker).toHaveBeenCalledOnce(); expect(speaker).toHaveBeenCalledWith(count(t));
    await click(q(t, '[data-open-profile=clownfish]'));
    await React.act(async () => t.setState(prev => ({ ...prev, coralReef: { ...prev.coralReef, guideSpeciesId: null } })));
    await settle(); expect(speaker).toHaveBeenCalledOnce();
  });

  it('uses the current host speaker without also creating a local status', async () => {
    const first = vi.fn(), second = vi.fn(), t = await mount({ announce: first });
    expect(status(t)).toBeNull(); await change(q(t, 'input[type=search]'), 'clownfish');
    await React.act(async () => t.setSpeaker(second)); await settle();
    expect(first).not.toHaveBeenCalled(); expect(second).toHaveBeenCalledWith(count(t)); expect(status(t)).toBeNull();
  });

  it('makes repeated identical fallback feedback observable while preserving the live container', async () => {
    const t = await mount(), live = status(t);
    await click(q(t, '[data-save-guide=clownfish]')); const first = live.firstElementChild;
    await click(q(t, '[data-save-guide=blue_tang]'));
    expect(status(t)).toBe(live); expect(live.textContent).toBe('Removed from your saved species.');
    expect(live.firstElementChild).not.toBe(first); expect(document.activeElement).toBe(q(t, '[data-save-guide=blue_tang]'));
  });

  it('announces no-match results through the fallback and then recovers the full collection', async () => {
    const t = await mount(), input = q(t, 'input[type=search]');
    await change(input, 'not-a-real-organism'); await settle(); expect(status(t).textContent).toBe('No species match that name.');
    await click(q(t, '[data-guide-reset]')); await settle(); expect(status(t).textContent).toBe(count(t)); expect(document.activeElement).toBe(input);
  });
});
