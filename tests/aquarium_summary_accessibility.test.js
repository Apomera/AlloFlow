import { describe, expect, it } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function elements(node, predicate, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach(child => elements(child, predicate, out)); return out; }
  if (predicate(node)) out.push(node);
  elements(node.props?.children, predicate, out); return out;
}
function text(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node !== 'object') return String(node);
  return Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
}
function setup(patch = {}) {
  resetStemLab(); const tool = loadTool(process.env.AQUARIUM_SOURCE || 'stem_lab/stem_tool_aquarium.js', 'aquarium');
  const store = newStore({ _aquarium: {
    mode: 'tank', selectedTank: 'freshwater', soundEnabled: false, simRunning: false,
    simTick: 10, simDay: 0, simHour: 12, tutorialDismissed: true, fishIdentityVersion: 3,
    aquariumWorkspacePanel: 'decide', habitatStudioOpen: true, habitatLayout: [], nextHabitatItemId: 4,
    tankFish: ['guppy', 'guppy'], fishInstanceIds: ['fish-1', 'fish-2'], nextFishInstanceId: 3,
    fishNames: { 'fish-1': 'Amber', 'fish-2': 'Pearl' }, hungerLevels: { 'fish-1': 80, 'fish-2': 80 },
    tankPlants: ['anubias'], plantHealth: { anubias: 80 }, plantBiomass: { anubias: 2 },
    waterChem: { temp: 76, pH: 7, ammonia: 0, nitrite: 0, nitrate: 20, salinity: 0, dissolvedO2: 7, co2: 3 },
    lightsOn: true, equipment: { filter: 0, heater: 0, light: 0, airPump: 0 },
    equipmentCondition: { filter: 100, heater: 100, light: 100, airPump: 100 }, equipmentFaults: {},
    coins: 50, habitatMissionPoints: 12, observationNotes: 'Keep my observation.', ...patch
  } });
  function render() {
    let tree;
    function Capture() { tree = tool.render(makeCtx({}, store)); return null; }
    ReactDOMServer.renderToStaticMarkup(React.createElement(Capture)); return tree;
  }
  return { render, state: () => store.toolData._aquarium };
}
const named = (tree, pattern) => elements(tree, node => pattern.test(node.props?.['aria-label'] || ''));
function domFor(node) {
  const container = document.createElement('div');
  container.innerHTML = ReactDOMServer.renderToStaticMarkup(node); return container;
}

describe('Aquarium named summaries and numeric habitat information', () => {
  it('exposes vessel configuration and mission points with supported roles and unchanged visible values', () => {
    const t = setup(), tree = t.render();
    const liveDisplay = elements(tree, node => typeof node.type === 'function' && node.props?.id === 'aquarium-live-tank')[0];
    expect(liveDisplay).toBeTruthy();
    // Render the actual display component without its large illustrated tank child.
    const display = domFor(React.cloneElement(liveDisplay, { mode: 'illustrated', children: null }));
    const vessel = display.querySelector('[aria-label="Vessel configuration"]');
    expect(vessel?.getAttribute('role')).toBe('group');
    expect(vessel.textContent).toContain(liveDisplay.props.tankConfiguration.size + ' US gal');
    expect(vessel.textContent).toContain(liveDisplay.props.tankConfiguration.shape + ' profile');
    const points = named(tree, /^12 habitat mission points$/)[0];
    expect(points?.props.role).toBe('group'); expect(text(points)).toContain('12 pts');
    expect(t.state().habitatMissionPoints).toBe(12); expect(t.state().observationNotes).toBe('Keep my observation.');
  });

  it('keeps stocked-organism removal buttons inside a named group without suppressing the individual actions', () => {
    const t = setup(), group = named(t.render(), /^Organisms currently stocked$/)[0];
    expect(group?.props.role).toBe('group'); expect(group.props['aria-hidden']).toBeUndefined();
    const buttons = elements(group, node => node.type === 'button');
    expect(buttons.map(b => b.props['aria-label'])).toEqual(['Remove Amber from tank', 'Remove Pearl from tank']);
    buttons[0].props.onClick();
    expect(t.state().fishInstanceIds).toEqual(['fish-2']);
    expect(t.state().tankFish).toEqual(['guppy']); expect(t.state().fishNames['fish-2']).toBe('Pearl');
    expect(t.state().observationNotes).toBe('Keep my observation.');
  });

  it('identifies each resident’s vitality summary and retains the underlying readable detail', () => {
    const tree = setup().render(), summaries = named(tree, /^(Amber|Pearl) vitality \d+ out of 100\. Limiting factor:/);
    expect(summaries).toHaveLength(2);
    summaries.forEach(summary => {
      expect(summary.props.role).toBe('group');
      expect(summary.props['aria-label']).toContain('Time in tank');
      expect(text(summary)).toContain('Vitality '); expect(text(summary)).toContain('/100');
      expect(text(summary)).toContain('Time in tank');
      expect(summary.props['aria-hidden']).toBeUndefined();
    });
  });

  it('exposes matching current/forecast readings and updates the habitat meter after applying a forecast', () => {
    const t = setup(), initial = t.render();
    const meter = named(initial, /^Average organism habitat fit$/)[0];
    expect(meter?.props.role).toBe('meter');
    expect(meter.props['aria-valuemin']).toBe(0); expect(meter.props['aria-valuemax']).toBe(100);
    const current = meter.props['aria-valuenow'];
    expect(current).toBeGreaterThanOrEqual(0); expect(current).toBeLessThanOrEqual(100);
    expect(meter.props['aria-valuetext']).toBe(current + ' out of 100'); expect(text(meter)).toContain(current + '/100');
    const comparisons = named(initial, / comparison\. Current average /);
    expect(comparisons.length).toBeGreaterThan(0);
    comparisons.forEach(group => {
      expect(group.props.role).toBe('group');
      expect(group.props['aria-label']).toContain('Current average ' + current + ',');
      expect(text(group)).toMatch(/Current\d+Forecast\d+/);
    });
    const apply = elements(initial, node => node.type === 'button' && /^Apply this preview:/.test(node.props['aria-label'] || ''))[0];
    apply.props.onClick();
    const updated = named(t.render(), /^Average organism habitat fit$/)[0];
    expect(updated.props['aria-valuenow']).toBeGreaterThanOrEqual(current);
    expect(updated.props['aria-valuetext']).toBe(updated.props['aria-valuenow'] + ' out of 100');
    expect(t.state().habitatLayout.length).toBe(1); expect(t.state().tankFish).toEqual(['guppy', 'guppy']);
    expect(t.state().habitatMissionPoints).toBe(12); expect(t.state().observationNotes).toBe('Keep my observation.');
  });
});
