import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
afterEach(() => {
  for (const { root, host } of mounted.splice(0)) { act(() => root.unmount()); host.remove(); }
  vi.restoreAllMocks();
});

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const found = find(child, predicate); if (found) return found; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}

async function mount(patch = {}, strict = false) {
  resetStemLab();
  const tool = loadTool(process.env.AQUARIUM_SOURCE || 'stem_lab/stem_tool_aquarium.js', 'aquarium');
  const store = newStore(), host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host); mounted.push({ root, host });
  const awardXP = vi.fn(), addToast = vi.fn(); let latest, tree, update;
  function Harness() {
    const [data, setData] = React.useState({ _aquarium: {
      mode: 'ocean', selectedTank: 'freshwater', soundEnabled: false, simRunning: false,
      tutorialDismissed: true, fishIdentityVersion: 3, tankFish: [], fishInstanceIds: [], nextFishInstanceId: 1,
      tankPlants: [], equipment: {}, habitatLayout: [], coins: 42, observationNotes: 'Keep my observation.',
      waterChem: { temp: 76, pH: 7, ammonia: 0, nitrite: 0, nitrate: 10, salinity: 0, dissolvedO2: 7, co2: 3 },
      ...patch
    } });
    latest = data._aquarium; update = values => setData(old => ({ ...old, _aquarium: { ...old._aquarium, ...values } }));
    tree = tool.render(makeCtx({ toolData: data, setToolData: setData, awardXP, addToast }, store));
    return tree;
  }
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, React.createElement(Harness)) : React.createElement(Harness)));
  return { host, state: () => latest, tree: () => tree, awardXP, addToast,
    update: async values => act(async () => update(values)),
    advance: years => host.querySelector('[data-aquarium-ocean-advance="' + years + '"]') };
}

async function click(button) { await act(async () => button.click()); }
function oceanReadings(state) {
  return Object.fromEntries(['oceanPop', 'oceanYear', 'oceanRevenue', 'oceanBycatch', 'oceanHistory', 'oceanCollapsed'].map(key => [key, state[key]]));
}

describe('Aquarium Ocean Ecology controls', () => {
  it('exposes selected scenario and mesh choice and preserves focus while changing policy', async () => {
    const t = await mount();
    const scenario = id => t.host.querySelector('[data-aquarium-ocean-scenario="' + id + '"]');
    const mesh = id => t.host.querySelector('[data-aquarium-ocean-mesh="' + id + '"]');
    expect(scenario('free').getAttribute('aria-pressed')).toBe('true');
    expect(scenario('free').parentElement.getAttribute('role')).toBe('group');
    expect(mesh('medium').getAttribute('aria-pressed')).toBe('true');
    expect(mesh('medium').parentElement.getAttribute('role')).toBe('group');
    mesh('large').focus(); await click(mesh('large'));
    expect(document.activeElement).toBe(mesh('large'));
    expect(mesh('large').getAttribute('aria-pressed')).toBe('true');
    expect(mesh('medium').getAttribute('aria-pressed')).toBe('false');
    expect(t.state().meshSize).toBe('large');
    await click(scenario('recover'));
    expect(scenario('recover').getAttribute('aria-pressed')).toBe('true');
    expect(scenario('free').getAttribute('aria-pressed')).toBe('false');
    expect(t.state().oceanPop).toEqual({ sardines: 30, tuna: 10, sharks: 5 });
    expect([...t.host.querySelectorAll('input[type="range"]')].map(n => n.getAttribute('aria-valuetext'))).toEqual(['0%', '10%']);
  });

  it('makes Advance 5 Years match five successive one-year actions without changing other work', async () => {
    const batch = await mount(), singles = await mount();
    expect(batch.advance(5).textContent).toBe('Advance 5 Years');
    expect(batch.advance(5).getAttribute('aria-label')).toBeNull();
    await click(batch.advance(5));
    for (let i = 0; i < 5; i++) await click(singles.advance(1));
    expect(batch.state().oceanYear).toBe(5);
    expect(batch.state().oceanHistory.map(x => x.year)).toEqual([1, 2, 3, 4, 5]);
    expect(oceanReadings(batch.state())).toEqual(oceanReadings(singles.state()));
    expect(batch.state().coins).toBe(42);
    expect(batch.state().observationNotes).toBe('Keep my observation.');
    expect(batch.state().waterChem).toEqual(singles.state().waterChem);
  });

  it('uses the latest queued state and issues one milestone reward under Strict Mode', async () => {
    const t = await mount({}, true);
    await act(async () => { const one = t.advance(1); for (let i = 0; i < 5; i++) one.click(); });
    expect(t.state().oceanYear).toBe(5);
    expect(t.state().oceanHistory.map(x => x.year)).toEqual([1, 2, 3, 4, 5]);
    expect(t.awardXP).toHaveBeenCalledTimes(1);
    expect(t.awardXP).toHaveBeenCalledWith('ocean', 3, 'Sustainable fishing for 5 years');
  });

  it('does not replay rewards from restored notices and reports a newly observed collapse once', async () => {
    const t = await mount({ oceanAdvanceNotice: { version: 12, milestones: 4, collapses: 1 }, oceanPop: { sardines: 1, tuna: 1, sharks: 1 }, oceanCollapsed: false }, true);
    expect(t.awardXP).not.toHaveBeenCalled(); expect(t.addToast).not.toHaveBeenCalled();
    await click(t.advance(5));
    expect(t.state().oceanYear).toBe(5); expect(t.state().oceanCollapsed).toBe(true);
    expect(t.addToast).toHaveBeenCalledTimes(1); expect(t.awardXP).not.toHaveBeenCalled();
    await click(t.advance(1)); expect(t.addToast).toHaveBeenCalledTimes(1);
  });
});

describe('Aquarium Water Lab inputs and feedback', () => {
  it('has stable native slider names, units, ideal descriptions and a named diagnosis destination', async () => {
    const t = await mount({ mode: 'waterlab' });
    const inputs = [...t.host.querySelectorAll('[data-aquarium-water-param]')]; expect(inputs).toHaveLength(10);
    for (const input of inputs) {
      expect(input.labels).toHaveLength(1); expect(input.labels[0].textContent.length).toBeGreaterThan(0);
      expect(input.getAttribute('aria-label')).toBeNull();
      expect(input.getAttribute('aria-valuetext')).toBeTruthy();
      const help = t.host.querySelector('#' + input.getAttribute('aria-describedby'));
      expect(help?.textContent).toMatch(/^ideal:/);
      const diagnosis = t.host.querySelector('#' + input.getAttribute('aria-controls'));
      expect(diagnosis?.tagName).toBe('SECTION');
      expect(t.host.querySelector('#' + diagnosis.getAttribute('aria-labelledby')).textContent).toContain('Live Diagnosis');
    }
    const ammonia = inputs.find(n => n.dataset.aquariumWaterParam === 'ammonia');
    const label = ammonia.labels[0].textContent; ammonia.focus();
    const element = find(t.tree(), n => n.props?.['data-aquarium-water-param'] === 'ammonia');
    await act(async () => element.props.onChange({ target: { value: '0.5' } }));
    expect(document.activeElement).toBe(ammonia);
    expect(ammonia.labels[0].textContent).toBe(label);
    expect(ammonia.getAttribute('aria-valuetext')).toBe('0.50 ppm');
    expect(t.state().waterParams.ammonia).toBe(0.5);
    expect(t.host.querySelector('[data-aquarium-water-status]').textContent).toBe('');
  });

  it('announces explicit scenario loading without moving focus or narrating every subsequent value adjustment', async () => {
    const t = await mount({ mode: 'waterlab' });
    const button = t.host.querySelector('[data-aquarium-water-scenario="nitrite-spike"]');
    const status = t.host.querySelector('[data-aquarium-water-status]');
    expect(status.getAttribute('role')).toBe('status'); expect(status.textContent).toBe('');
    button.focus(); await click(button);
    expect(document.activeElement).toBe(button);
    expect(status.textContent).toBe('Scenario loaded: Cycling — Week 3, Nitrite Spike');
    expect(t.state().waterParams.nitrite).toBe(3.5);
    const message = status.textContent;
    const nitrite = find(t.tree(), n => n.props?.['data-aquarium-water-param'] === 'nitrite');
    await act(async () => nitrite.props.onChange({ target: { value: '3' } }));
    expect(status.textContent).toBe(message);
    expect(t.host.querySelector('[data-aquarium-water-param="nitrite"]').getAttribute('aria-valuetext')).toBe('3.00 ppm');
    expect(t.state().observationNotes).toBe('Keep my observation.');
  });

  it('keeps input relationships unique across instances and hooks stable across mode changes', async () => {
    const a = await mount({ mode: 'waterlab' }), b = await mount({ mode: 'waterlab' });
    const ids = [a, b].flatMap(t => [...t.host.querySelectorAll('[data-aquarium-waterlab] [id]')].map(n => n.id));
    expect(new Set(ids).size).toBe(ids.length);
    await a.update({ mode: 'ocean' }); await a.update({ mode: 'waterlab' });
    expect(a.host.querySelectorAll('[data-aquarium-water-param]')).toHaveLength(10);
    expect(a.host.querySelector('[data-aquarium-water-param="temp"]').getAttribute('aria-valuetext')).toBe('78.0 °F');
  });
});
