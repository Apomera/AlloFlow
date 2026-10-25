// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const h = React.createElement;
const act = React.act;
const canonical = 'stem_lab/stem_tool_raptorhunt.js';
const list = scope => `[data-raptor-reference-tabs="${scope}"]`;
const filter = '[data-raptor-history-filter="era"]';
const initial = section => ({
  siblingTool: { draft: 'A sibling draft must survive', count: 17 },
  raptorHunt: { activeSection: section, selectedSpecies: 'peregrine', huntTutorialDismissed: true,
    xp: 73, huntStats: { attempts: 6, captures: 2 }, recordsMarker: 'Retained learning evidence' }
});

let config, host, root, latest, setStore, changes, resource, announcements, actDescriptor;
function query(selector) { return host.querySelector(selector); }
function all(selector) { return [...host.querySelectorAll(selector)]; }
function selected(scope) { return query(`${list(scope)} [role="tab"][aria-selected="true"]`); }
function tabStops(scope) { return all(`${list(scope)} [role="tab"]`).filter(tab => tab.tabIndex === 0); }
function pane(scope) { return query(scope === 'anatomy' ? '#rh-anatomy-workbench' : `[data-raptor-reference-panel="${scope}"]`); }
function resources() { return resource.map(mock => mock.mock.calls.length); }
function accessibleLabel(element) {
  return element.getAttribute('aria-label') || (element.getAttribute('aria-labelledby') || '').split(/\s+/)
    .filter(Boolean).map(id => query(`#${id}`)?.textContent || '').join(' ');
}

function Host({ seed }) {
  const [store, update] = React.useState(seed);
  setStore = update;
  latest = store;
  const setToolData = React.useCallback(arg => {
    changes(arg);
    update(prev => typeof arg === 'function' ? arg(prev) : arg);
  }, []);
  return config.render(makeCtx({ toolData: store, setToolData, announceToSR: announcements }));
}
async function mount(section, patch = {}) {
  const seed = initial(section); Object.assign(seed.raptorHunt, patch);
  await act(async () => { root.render(h(Host, { seed })); });
}
async function commit(section, patch = {}) {
  const next = initial(section); Object.assign(next.raptorHunt, patch);
  await act(async () => { setStore(next); });
}
async function key(element, name, options = {}) {
  expect(element).not.toBeNull();
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...options });
  await act(async () => { element.dispatchEvent(event); });
  return event;
}
async function activate(element) {
  expect(element).not.toBeNull();
  element.focus();
  await act(async () => { element.click(); });
}
function relationships(scope, count) {
  const tabs = all(`${list(scope)} [role="tab"]`), active = selected(scope), panel = pane(scope);
  expect(tabs).toHaveLength(count); expect(active).not.toBeNull(); expect(panel).not.toBeNull();
  expect(accessibleLabel(query(list(scope))).trim().length).toBeGreaterThan(3);
  expect(tabs.filter(tab => tab.getAttribute('aria-selected') === 'true')).toEqual([active]);
  expect(tabStops(scope)).toEqual([active]);
  expect(panel.getAttribute('role')).toBe('tabpanel'); expect(panel.tabIndex).toBe(0);
  expect(panel.getAttribute('aria-labelledby')).toBe(active.id);
  expect(active.id).not.toBe(''); expect(panel.id).not.toBe('');
  for (const tab of tabs) {
    expect(tab.getAttribute('type')).toBe('button');
    expect(tab.getAttribute('aria-controls')).toBe(panel.id);
    expect(tab.tabIndex).toBe(tab === active ? 0 : -1);
  }
  return { tabs, active, panel };
}

beforeEach(() => {
  actDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const registry = resetStemLab(); config = loadTool(canonical, 'raptorHunt');
  changes = vi.fn(); announcements = vi.fn();
  resource = [vi.spyOn(registry, 'ensureThree'), vi.spyOn(registry, 'loadScriptResilient'),
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => { throw new Error('Reference tabs must not allocate a renderer'); }),
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => { throw new Error('Reference tabs must not capture a canvas'); })];
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  try { if (root) await act(async () => { root.unmount(); }); }
  finally {
    if (host) host.remove(); vi.restoreAllMocks(); root = null; host = null; setStore = null; config = null;
    if (actDescriptor) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actDescriptor);
    else delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

describe('Raptor reference tabs and history-filter accessibility', () => {
  it('exposes one Anatomy Atlas tab stop with a named focusable panel and the saved selected structure', async () => {
    await mount('anatomyatlas', { anatomyView: 3, anatomyFocus: 4 });
    const { active, panel } = relationships('anatomy', 7);
    expect(active.id).toBe('rh-anatomy-tab-3'); expect(panel.id).toBe('rh-anatomy-workbench');
    expect(query('[data-raptor-anatomy-detail]').textContent).toContain('Fovea (deep fovea)');
    expect(changes).not.toHaveBeenCalled(); expect(resources()).toEqual([0, 0, 0, 0]);
  });

  it('wraps Anatomy Atlas arrow keys and Home/End with automatic activation, post-render focus and a reset structure', async () => {
    await mount('anatomyatlas', { anatomyView: 0, anatomyFocus: 4 });
    const frozen = JSON.parse(JSON.stringify(latest)); const counts = resources();
    selected('anatomy').focus();
    const sequence = [['ArrowLeft', 6], ['ArrowRight', 0], ['End', 6], ['Home', 0], ['ArrowRight', 1], ['ArrowLeft', 0]];
    for (const [pressed, index] of sequence) {
      let observed;
      query(`#rh-anatomy-tab-${index}`).addEventListener('focus', event => {
        observed = { selected: event.target.getAttribute('aria-selected'),
          label: pane('anatomy').getAttribute('aria-labelledby'), view: latest.raptorHunt.anatomyView,
          structure: latest.raptorHunt.anatomyFocus };
      }, { once: true });
      const event = await key(selected('anatomy'), pressed);
      expect(event.defaultPrevented).toBe(true);
      const { active, panel } = relationships('anatomy', 7);
      expect(active.id).toBe(`rh-anatomy-tab-${index}`); expect(document.activeElement).toBe(active);
      expect(latest.raptorHunt.anatomyView).toBe(index); expect(latest.raptorHunt.anatomyFocus).toBe(0);
      expect(panel.getAttribute('aria-labelledby')).toBe(active.id);
      expect(query('[data-raptor-anatomy-detail]').textContent).toMatch(/Structure 1 of/);
      expect(observed).toEqual({ selected: 'true', label: `rh-anatomy-tab-${index}`, view: index, structure: 0 });
    }
    expect(changes).toHaveBeenCalledTimes(sequence.length); expect(resources()).toEqual(counts);
    const { anatomyView, anatomyFocus, ...after } = latest.raptorHunt;
    const { anatomyView: oldView, anatomyFocus: oldFocus, ...before } = frozen.raptorHunt;
    expect(after).toEqual(before); expect(latest.siblingTool).toEqual(frozen.siblingTool);
  });

  it('connects every Rehabilitation tab to its active panel and supports ordered wrap and endpoint navigation', async () => {
    await mount('rehab', { rehabTab: 'conditions', rehabStateFilter: 'NY' });
    relationships('rehab', 4); selected('rehab').focus();
    const sequence = [['ArrowLeft', 'directory'], ['ArrowRight', 'conditions'], ['End', 'directory'], ['Home', 'conditions'], ['ArrowRight', 'steps']];
    for (const [pressed, id] of sequence) {
      const event = await key(selected('rehab'), pressed); expect(event.defaultPrevented).toBe(true);
      const { active, panel } = relationships('rehab', 4);
      expect(active.id).toBe(`rh-rehab-tab-${id}`); expect(document.activeElement).toBe(active);
      expect(latest.raptorHunt.rehabTab).toBe(id); expect(panel.id).toBe('rh-rehab-content');
      expect(latest.raptorHunt.rehabStateFilter).toBe('NY');
    }
    expect(pane('rehab').textContent).toContain('If you find an injured raptor:');
    expect(changes).toHaveBeenCalledTimes(sequence.length); expect(resources()).toEqual([0, 0, 0, 0]);
    expect(latest.siblingTool).toEqual(initial('rehab').siblingTool);
  });

  it('leaves modified arrows and unrelated keys to the browser without activating another tab or allocating resources', async () => {
    await mount('anatomyatlas', { anatomyView: 2, anatomyFocus: 2 });
    for (const scope of ['anatomy', 'rehab']) {
      if (scope === 'rehab') await commit('rehab', { rehabTab: 'ethics' });
      const active = selected(scope); active.focus(); const before = latest, calls = changes.mock.calls.length, counts = resources();
      for (const options of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }, { shiftKey: true }]) {
        const event = await key(active, 'ArrowRight', options); expect(event.defaultPrevented).toBe(false);
      }
      for (const name of ['ArrowUp', 'ArrowDown', 'PageDown', 'Tab', 'Escape', 'a']) {
        const event = await key(active, name); expect(event.defaultPrevented).toBe(false);
      }
      expect(latest).toBe(before); expect(changes).toHaveBeenCalledTimes(calls); expect(resources()).toEqual(counts);
      expect(document.activeElement).toBe(active); expect(selected(scope)).toBe(active);
    }
  });

  it('keeps click activation compatible with tab relationships and resets only the selected anatomy structure', async () => {
    await mount('anatomyatlas', { anatomyView: 3, anatomyFocus: 4, anatomyCompare: 'peregrine' });
    const frozen = JSON.parse(JSON.stringify(latest));
    await activate(query('#rh-anatomy-tab-1'));
    expect(selected('anatomy').id).toBe('rh-anatomy-tab-1'); relationships('anatomy', 7);
    expect(latest.raptorHunt).toEqual({ ...frozen.raptorHunt, anatomyView: 1, anatomyFocus: 0 });
    expect(document.activeElement).toBe(selected('anatomy')); expect(changes).toHaveBeenCalledTimes(1);
    await commit('rehab', { rehabTab: 'conditions', rehabStateFilter: 'NY' }); changes.mockClear();
    await activate(query('#rh-rehab-tab-ethics')); relationships('rehab', 4);
    expect(latest.raptorHunt.rehabTab).toBe('ethics'); expect(latest.raptorHunt.rehabStateFilter).toBe('NY');
    expect(pane('rehab').textContent).not.toContain('If you find an injured raptor:');
    expect(changes).toHaveBeenCalledTimes(1); expect(resources()).toEqual([0, 0, 0, 0]);
  });

  it('models History eras as a named pressed-filter group and changes only the era while preserving the timeline', async () => {
    await mount('history', { historyEra: 'all', historyMarker: 'Retain this history note' });
    const group = query(filter), buttons = all(`${filter} [data-raptor-history-era]`), frozen = JSON.parse(JSON.stringify(latest));
    expect(group.getAttribute('role')).toBe('group'); expect(accessibleLabel(group)).toMatch(/history/i);
    expect(buttons).toHaveLength(5); expect(group.querySelector('[role="tab"],[role="tablist"]')).toBeNull();
    for (const button of buttons) { expect(button.type).toBe('button'); expect(button.hasAttribute('aria-selected')).toBe(false); }
    expect(buttons.filter(button => button.getAttribute('aria-pressed') === 'true')).toEqual([query('[data-raptor-history-era="all"]')]);
    const timeline = group.nextElementSibling, allRows = timeline.children.length; expect(allRows).toBeGreaterThan(5);
    await activate(query('[data-raptor-history-era="modern"]'));
    const modernRows = query(filter).nextElementSibling;
    expect(modernRows.children.length).toBeGreaterThan(0); expect(modernRows.children.length).toBeLessThan(allRows);
    for (const row of modernRows.children) expect(Number(row.firstElementChild.textContent.match(/\d+/)[0])).toBeGreaterThanOrEqual(2000);
    expect(latest).toEqual({ ...frozen, raptorHunt: { ...frozen.raptorHunt, historyEra: 'modern' } });
    expect(all(`${filter} [aria-pressed="true"]`)).toEqual([query('[data-raptor-history-era="modern"]')]);
    expect(document.activeElement).toBe(query('[data-raptor-history-era="modern"]'));
    await activate(query('[data-raptor-history-era="all"]')); expect(query(filter).nextElementSibling.children.length).toBe(allRows);
    expect(resources()).toEqual([0, 0, 0, 0]);
  });

  it('renders safe selections for malformed saved values without rewriting the learner’s data', async () => {
    await mount('rehab', { rehabTab: 'not-a-tab' });
    expect(selected('rehab').id).toBe('rh-rehab-tab-conditions'); relationships('rehab', 4);
    expect(latest.raptorHunt.rehabTab).toBe('not-a-tab'); expect(changes).not.toHaveBeenCalled();
    await commit('history', { historyEra: 'not-an-era' });
    expect(query('[data-raptor-history-era="all"]').getAttribute('aria-pressed')).toBe('true');
    expect(latest.raptorHunt.historyEra).toBe('not-an-era'); expect(changes).not.toHaveBeenCalled();
    for (const patch of [{ anatomyView: 1.5, anatomyFocus: 0 }, { anatomyView: NaN, anatomyFocus: 0 },
      { anatomyView: 0, anatomyFocus: 1.5 }, { anatomyView: 0, anatomyFocus: NaN }]) {
      await commit('anatomyatlas', patch); relationships('anatomy', 7);
      expect(selected('anatomy').id).toBe('rh-anatomy-tab-0');
      expect(query('[data-raptor-anatomy-detail]').textContent).toMatch(/Structure 1 of/);
      expect(latest.raptorHunt.anatomyView).toBe(patch.anatomyView); expect(latest.raptorHunt.anatomyFocus).toBe(patch.anatomyFocus);
      expect(changes).not.toHaveBeenCalled();
    }
    expect(resources()).toEqual([0, 0, 0, 0]);
  });
});
