import { readFileSync } from 'node:fs';
import { parse } from 'acorn';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
const source = readFileSync('stem_lab/stem_tool_aquarium.js', 'utf8');
const names = ['aquariumViewNumber', 'getAquariumTankConfiguration', 'AquariumPlantSizeControl', 'AquariumModelSizing'];
const pieces = {};
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'FunctionDeclaration' && names.includes(node.id?.name)) pieces[node.id.name] = source.slice(node.start, node.end);
  for (const value of Object.values(node)) { if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') walk(value); }
}
walk(parse(source, { ecmaVersion: 'latest' }));
const { getAquariumTankConfiguration: configure, AquariumModelSizing: Sizing } = new Function(names.map(name => pieces[name]).join('\n') + '; return {getAquariumTankConfiguration,AquariumModelSizing};')();
const base = { id: 'freshwater', size: 20, pH: 7, temp: 76 };
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, host;
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); vi.restoreAllMocks(); });
async function input(control, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(control.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set.call(control, String(value));
    control.dispatchEvent(new Event(control.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
async function mount(options = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  const changeTank = vi.fn(), changePlant = vi.fn(); let updatePlant;
  function Harness() {
    const [tank, setTank] = React.useState(configure(base));
    const [plants, setPlants] = React.useState([{ id: 'anubias', name: 'Anubias', biomass: 1, maxBiomass: 3 }]);
    updatePlant = next => setPlants(old => old.map(plant => ({ ...plant, biomass: next })));
    return React.createElement(Sizing, { React, tank, plants, stockMinimum: options.minimum || 5,
      onTank: patch => { changeTank(patch); setTank(configure(base, { tankId: base.id, ...patch })); return true; },
      onPlant: (id, size) => { changePlant(id, size); updatePlant(size); return true; }
    });
  }
  await act(async () => { root.render(React.createElement(Harness)); });
  return { changeTank, changePlant, grow: async size => { await act(async () => updatePlant(size)); } };
}
const button = text => [...host.querySelectorAll('button')].find(item => item.textContent === text);

describe('Aquarium physical scenario configuration', () => {
  it('retains legacy type volumes, scopes overrides to their tank, and sanitizes saved values without mutation', () => {
    const original = { ...base };
    expect(configure(base)).toMatchObject({ size: 20, baseSize: 20, shape: 'standard', volumeScale: 1 });
    expect(configure({ id: 'reef', size: 55 })).toMatchObject({ size: 55, volumeScale: 20 / 55 });
    expect(configure(base, { tankId: 'reef', volumeGallons: 100, shape: 'cube' })).toMatchObject({ size: 20, shape: 'standard' });
    expect(configure(base, { tankId: 'freshwater', volumeGallons: '40', shape: 'bad' })).toMatchObject({ size: 20, shape: 'standard' });
    expect(configure(base, { tankId: 'freshwater', volumeGallons: Infinity })).toMatchObject({ size: 20 });
    expect(configure(base, { tankId: 'freshwater', volumeGallons: -1 }).size).toBe(5);
    expect(configure(base, { tankId: 'freshwater', volumeGallons: 900 }).size).toBe(200);
    expect(base).toEqual(original);
  });
  it.each(['standard', 'long', 'tall', 'cube'])('%s geometry preserves selected volume and meaningful5–200gallon rate scaling', shape => {
    for (const gallons of [5, 20, 55, 200]) {
      const tank = configure(base, { tankId: 'freshwater', volumeGallons: gallons, shape });
      const { width, height, depth } = tank.dimensions;
      expect(width * height * depth / (12 * 5.2 * 6.4)).toBeCloseTo(gallons / 20, 10);
      expect(tank.volumeScale * gallons).toBeCloseTo(20, 10);
      expect(tank.dimensions).toMatchObject({ volumeGallons: gallons, shape, baselineGallons: 20 });
      expect(width).toBeGreaterThan(0); expect(height).toBeGreaterThan(0); expect(depth).toBeGreaterThan(0);
    }
  });
  it('changes relative air-water exchange with shape while preserving capacity and volume', () => {
    const standard = configure(base), long = configure(base, { tankId: 'freshwater', shape: 'long' }), tall = configure(base, { tankId: 'freshwater', shape: 'tall' });
    expect(long.surfaceExchangeScale).toBeGreaterThan(standard.surfaceExchangeScale);
    expect(tall.surfaceExchangeScale).toBeLessThan(standard.surfaceExchangeScale);
    expect(long.size).toBe(tall.size); expect(long.volumeScale).toBe(tall.volumeScale);
  });
});

describe('Aquarium size controls', () => {
  it('owns native labels, bounds and descriptions separately in two mounted aquariums', async () => {
    await mount();
    const callbacks = [vi.fn(), vi.fn()];
    await act(async () => root.render(React.createElement(React.Fragment, null,
      [0, 1].map(index => React.createElement(Sizing, { key: index, React, tank: configure(base), stockMinimum: index ? 15 : 5,
        plants: [{ id: 'anubias', name: 'Anubias', biomass: 1, maxBiomass: index ? 4 : 3 }], onTank: callbacks[index], onPlant: callbacks[index]
      }))
    )));
    const panels = [...host.querySelectorAll('[data-aquarium-sizing-controls]')];
    const ids = [...host.querySelectorAll('[id]')].map(node => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const panel of panels) {
      for (const label of panel.querySelectorAll('label[for]')) {
        expect(label.control).toBeTruthy();
        expect(panel.contains(label.control)).toBe(true);
      }
      for (const control of panel.querySelectorAll('[aria-describedby]')) {
        for (const id of control.getAttribute('aria-describedby').split(' ')) expect(panel.contains(document.getElementById(id))).toBe(true);
      }
    }
    const capacity = panels[1].querySelector('[data-aquarium-tank-volume]');
    expect(capacity.min).toBe('15');
    await input(capacity, 10);
    const error = document.getElementById(capacity.getAttribute('aria-describedby').split(' ')[1]);
    expect(error.textContent).toContain('15 to 200 US gallons');
    expect(panels[1].contains(error)).toBe(true);
    expect(panels[0].querySelector('[data-aquarium-tank-volume]').getAttribute('aria-invalid')).toBe('false');
    const biomass = panels[1].querySelector('[data-aquarium-plant-biomass]');
    await input(biomass, 4.1);
    expect(biomass.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(biomass.getAttribute('aria-describedby').split(' ')[1]).textContent).toContain('0 to 4');
    expect(panels[0].querySelector('[data-aquarium-plant-biomass]').value).toBe('1');
    await act(async () => panels[1].querySelector('[aria-label="Apply plant size for Anubias"]').click());
    expect(callbacks[0]).not.toHaveBeenCalled(); expect(callbacks[1]).not.toHaveBeenCalled();
  });
  it('does not offer an intervention for rounded natural growth without a user draft', async () => {
    const events = await mount();
    await events.grow(1.1234);
    const action = button('Apply plant size');
    expect(host.querySelector('[data-aquarium-plant-biomass]').value).toBe('1.12');
    expect(action.getAttribute('aria-disabled')).toBe('true');
    await act(async () => action.click());
    expect(events.changePlant).not.toHaveBeenCalled();
  });
  it('preserves Apply focus after a successful edit and prevents unchanged repeat interventions', async () => {
    const events = await mount();
    host.querySelector('details').open = true;
    for (const [selector, actionLabel, value, callback] of [
      ['[data-aquarium-tank-volume]', 'Apply tank size', 40, events.changeTank],
      ['[data-aquarium-plant-biomass]', 'Apply plant size', 2, events.changePlant]
    ]) {
      await input(host.querySelector(selector), value);
      const action = button(actionLabel);
      expect(action.getAttribute('aria-label') || action.textContent).toContain(actionLabel);
      action.focus();
      await act(async () => action.click());
      expect(document.activeElement).toBe(action);
      expect(action.disabled).toBe(false);
      expect(action.getAttribute('aria-disabled')).toBe('true');
      await act(async () => action.click());
      expect(callback).toHaveBeenCalledTimes(1);
    }
  });
  it('keeps tank edits as drafts until Apply, then uses the chosen volume and shape', async () => {
    const events = await mount();
    expect(host.querySelector('details').open).toBe(false);
    expect(host.querySelector('summary').textContent).toBe('Tank & plant size');
    await input(host.querySelector('[data-aquarium-tank-volume]'), 40);
    await input(host.querySelector('[data-aquarium-tank-shape]'), 'long');
    expect(events.changeTank).not.toHaveBeenCalled();
    expect(events.changePlant).not.toHaveBeenCalled();
    await act(async () => button('Apply tank size').click());
    expect(events.changeTank).toHaveBeenCalledExactlyOnceWith({ volumeGallons: 40, shape: 'long' });
    expect(host.querySelector('[data-aquarium-tank-volume]').value).toBe('40');
    expect(button('Apply tank size').getAttribute('aria-disabled')).toBe('true');
    expect(host.textContent).toContain('water concentrations, resident identities, and health are retained');
  });
  it('rejects empty, nonpositive, oversized and below-current-stock capacity drafts', async () => {
    const events = await mount({ minimum: 15 });
    for (const value of ['', 0, 5, 201]) {
      await input(host.querySelector('[data-aquarium-tank-volume]'), value);
      expect(host.querySelector('[data-aquarium-tank-volume]').getAttribute('aria-invalid')).toBe('true');
      expect(button('Apply tank size').getAttribute('aria-disabled')).toBe('true');
      await act(async () => button('Apply tank size').click());
    }
    expect(events.changeTank).not.toHaveBeenCalled();
    await input(host.querySelector('[data-aquarium-tank-volume]'), 15);
    expect(button('Apply tank size').getAttribute('aria-disabled')).toBe('false');
  });
  it('keeps a plant draft through natural growth, applies only the targeted biomass and exposes zero', async () => {
    const events = await mount();
    await input(host.querySelector('[data-aquarium-plant-biomass="anubias"]'), 2);
    expect(events.changePlant).not.toHaveBeenCalled();
    await events.grow(1.1);
    expect(host.querySelector('[data-aquarium-plant-biomass="anubias"]').value).toBe('2');
    await act(async () => host.querySelector('[aria-label="Apply plant size for Anubias"]').click());
    expect(events.changePlant).toHaveBeenLastCalledWith('anubias', 2);
    await input(host.querySelector('[data-aquarium-plant-biomass="anubias"]'), 0);
    await act(async () => host.querySelector('[aria-label="Apply plant size for Anubias"]').click());
    expect(events.changePlant).toHaveBeenLastCalledWith('anubias', 0);
    expect(host.querySelector('[data-aquarium-plant-size="anubias"]').getAttribute('aria-valuetext')).toBe('0.00 biomass index');
    await input(host.querySelector('[data-aquarium-plant-biomass="anubias"]'), 3.1);
    expect(host.querySelector('[aria-label="Apply plant size for Anubias"]').getAttribute('aria-disabled')).toBe('true');
  });
});
