import { describe, expect, it } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const match = find(child, predicate); if (match) return match; }
    return null;
  }
  return predicate(node) ? node : find(node.props?.children, predicate);
}

function renderRelationships() {
  resetStemLab();
  const tool = loadTool(process.env.AQUARIUM_SOURCE || 'stem_lab/stem_tool_aquarium.js', 'aquarium');
  const store = newStore({ _aquarium: {
    mode: 'tank', selectedTank: 'freshwater', soundEnabled: false, simRunning: false,
    simTick: 10, simDay: 0, simHour: 12, tutorialDismissed: true, fishIdentityVersion: 3,
    aquariumWorkspacePanel: 'decide', tankFish: ['guppy', 'guppy'],
    fishInstanceIds: ['fish-1', 'fish-2'], nextFishInstanceId: 3,
    fishNames: { 'fish-1': 'Amber', 'fish-2': 'Pearl' },
    tankPlants: ['anubias'], plantHealth: { anubias: 80 }, plantBiomass: { anubias: 2 },
    waterChem: { temp: 76, pH: 7, ammonia: 0, nitrite: 0, nitrate: 20, salinity: 0, dissolvedO2: 7, co2: 3 },
    lightsOn: true, equipment: { filter: 0, heater: 0, light: 0, airPump: 0 },
    equipmentCondition: { filter: 100, heater: 100, light: 100, airPump: 100 }, equipmentFaults: {},
    coins: 50, observationNotes: 'Keep my observation.'
  } });
  let tree;
  function Capture() { tree = tool.render(makeCtx({}, store)); return null; }
  ReactDOMServer.renderToStaticMarkup(React.createElement(Capture));
  return { tree, state: () => store.toolData._aquarium };
}

describe('Aquarium organism relationship controls', () => {
  it('groups individually named buttons without requiring missing list items and traces the chosen organism', () => {
    const t = renderRelationships();
    const group = find(t.tree, node => node.props?.['aria-label'] === 'Individual organism relationships with aquarium plants');
    expect(group).toBeTruthy();
    expect(group.props.role).toBe('group');
    const buttons = React.Children.toArray(group.props.children);
    expect(buttons).toHaveLength(2);
    buttons.forEach((button, index) => {
      expect(button.type).toBe('button');
      expect(button.props.type).toBe('button');
      expect(button.props['aria-label']).toMatch(new RegExp('^' + ['Amber', 'Pearl'][index] + '\\. '));
      expect(button.props['aria-label'].length).toBeGreaterThan(30);
      button.props.onClick();
      expect(t.state().ecosystemFocusType).toBe('fish');
      expect(t.state().ecosystemFocusId).toBe('fish-' + (index + 1));
    });
    expect(t.state().tankFish).toEqual(['guppy', 'guppy']);
    expect(t.state().tankPlants).toEqual(['anubias']);
    expect(t.state().coins).toBe(50);
    expect(t.state().observationNotes).toBe('Keep my observation.');
  });
});
