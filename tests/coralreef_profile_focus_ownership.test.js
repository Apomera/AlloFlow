import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let frames, nextFrame, scroll, oldScroll;

beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  frames = new Map(); nextFrame = 1;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    const id = nextFrame++; frames.set(id, callback); return id;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addListener() {}, removeListener() {} })));
  scroll = vi.fn(); oldScroll = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scroll });
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
});

afterEach(async () => {
  while (mounted.length) {
    const t = mounted.pop(); await React.act(async () => t.root.unmount());
    t.host.remove(); t.external.remove();
  }
  if (oldScroll) Object.defineProperty(Element.prototype, 'scrollIntoView', oldScroll);
  else delete Element.prototype.scrollIntoView;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

const q = (t, selector) => t.host.querySelector(selector);
const title = t => q(t, '[data-marine-profile] .crdx-title');
const nav = t => [...t.host.querySelectorAll('.cr-nav button')].find(button => button.textContent === 'Species guide');
async function click(element) {
  expect(element, 'control exists').toBeTruthy();
  await React.act(async () => { element.focus(); element.click(); });
}
async function flushFrames() {
  await React.act(async () => {
    const pending = [...frames.values()]; frames.clear();
    pending.forEach(callback => callback(0));
  });
}
async function mount(seed = {}) {
  let data = { coralReef: {
    section: 'guide', guideSpeciesId: 'green_turtle',
    speciesBookmarks: { green_turtle: true }, speciesFieldNotes: { green_turtle: 'Keep this observation.' },
    speciesLog: { clownfish: { firstSeen: 1 } }, ...seed
  } };
  const host = document.createElement('div'), external = document.createElement('button');
  external.textContent = 'Outside the reef tool'; document.body.append(host, external);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [state, setState] = React.useState(data); data = state;
    return cfg.render({ React, toolData: state, setToolData: setState, reduceMotion: true, t: (key, fallback) => fallback || key });
  }
  const t = { host, external, root, get data() { return data.coralReef; } };
  mounted.push(t); await React.act(async () => root.render(React.createElement(Shell))); return t;
}

describe('profile focus belongs to the person after the initial handoff', () => {
  it('initially focuses the species heading and preserves records through its deferred handoff', async () => {
    const t = await mount(), records = JSON.stringify(t.data);
    expect(document.activeElement).toBe(title(t)); expect(frames.size).toBeGreaterThan(0);
    await flushFrames(); expect(document.activeElement).toBe(title(t));
    expect(JSON.stringify(t.data)).toBe(records);
  });

  it.each(['profile button', 'field notes', 'outside button'])('does not reclaim %s focus after opening a profile', async destination => {
    const t = await mount(), records = JSON.stringify(t.data);
    const control = destination === 'profile button' ? q(t, '[data-save-profile]')
      : destination === 'field notes' ? q(t, '[data-species-field-notes]') : t.external;
    control.focus(); scroll.mockClear(); await flushFrames();
    expect(document.activeElement).toBe(control); expect(scroll).not.toHaveBeenCalled();
    expect(JSON.stringify(t.data)).toBe(records);
  });

  it('finishes section navigation from this lab masthead to the selected profile', async () => {
    const t = await mount({ section: 'hub' }); await click(nav(t));
    expect(document.activeElement).toBe(q(t, '.cr-masthead h2'));
    await flushFrames(); expect(document.activeElement).toBe(title(t));
    expect(q(t, '[data-marine-profile]').dataset.marineProfile).toBe('green_turtle');
  });

  it('surrenders the section-navigation handoff when a person has already focused another control', async () => {
    const t = await mount({ section: 'hub' }); await click(nav(t));
    const control = q(t, '[data-save-profile]'); control.focus(); scroll.mockClear();
    await flushFrames(); expect(document.activeElement).toBe(control); expect(scroll).not.toHaveBeenCalled();
  });

  it.each(['start', 'related'])('restores the %s comparison trigger once without taking focus back from field notes', async origin => {
    const t = await mount(); await flushFrames();
    const selector = origin === 'start' ? '[data-start-comparison]' : '[data-compare-with="hawksbill_turtle"]';
    const records = JSON.stringify(t.data); await click(q(t, selector)); await click(q(t, '[data-close-comparison]'));
    expect(document.activeElement).toBe(q(t, selector));
    const notes = q(t, '[data-species-field-notes]'); notes.focus(); scroll.mockClear();
    await flushFrames(); expect(document.activeElement).toBe(notes); expect(scroll).not.toHaveBeenCalled();
    expect(JSON.stringify(t.data)).toBe(records);
  });

  it.each([false, true])('returns from the closer look once and respects later focus movement (move=%s)', async move => {
    const t = await mount(); await flushFrames(); const records = JSON.stringify(t.data);
    await click(q(t, '[data-open-study]')); await flushFrames(); await click(q(t, '[data-close-study]'));
    const opener = q(t, '[data-open-study]'); expect(document.activeElement).toBe(opener);
    const expected = move ? q(t, '[data-species-field-notes]') : opener;
    if (move) expected.focus(); scroll.mockClear(); await flushFrames();
    expect(document.activeElement).toBe(expected);
    if (move) expect(scroll).not.toHaveBeenCalled();
    expect(JSON.stringify(t.data)).toBe(records);
  });

  it('does not revive a profile heading after the closer-look workspace has opened', async () => {
    const t = await mount(); await click(q(t, '[data-open-study]'));
    const heading = q(t, '[data-species-study] h4');
    expect(document.activeElement).toBe(heading); await flushFrames();
    expect(document.activeElement).toBe(heading);
  });

  it('cancels the pending old-profile handoff before moving to the next species', async () => {
    const t = await mount(), initial = title(t).textContent;
    await click(q(t, '[data-profile-next]'));
    expect(title(t).textContent).not.toBe(initial);
    const notes = q(t, '[data-species-field-notes]'); notes.focus(); scroll.mockClear();
    await flushFrames(); expect(document.activeElement).toBe(notes); expect(scroll).not.toHaveBeenCalled();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});
