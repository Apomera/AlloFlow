import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, ReactDOMServer, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, host;

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
const event = () => ({ id: 'oxygen-check', title: 'An oxygen observation', icon: '🐟', desc: 'Compare two possible responses.', choices: [
  { label: 'Check oxygen and improve aeration', effect: { ammonia: -0.1 }, outcome: 'You compare the readings.', xp: 5 },
  { label: 'Observe before changing the tank', effect: { nitrate: 2 }, outcome: 'You record another observation.', xp: 2 }
] });
function renderTank(patch = {}) {
  resetStemLab(); const tool = loadTool(process.env.AQUARIUM_SOURCE || 'stem_lab/stem_tool_aquarium.js', 'aquarium');
  const store = newStore({ _aquarium: {
    mode: 'tank', selectedTank: 'freshwater', soundEnabled: false, simRunning: false,
    simTick: 10, simDay: 0, simHour: 12, tutorialDismissed: true, fishIdentityVersion: 3,
    tankFish: ['guppy'], fishInstanceIds: ['fish-1'], nextFishInstanceId: 2, fishNames: { 'fish-1': 'Amber' },
    tankPlants: ['anubias'], plantHealth: { anubias: 80 }, plantBiomass: { anubias: 2 },
    waterChem: { temp: 76, pH: 7, ammonia: 0.2, nitrite: 0, nitrate: 20, salinity: 0, dissolvedO2: 7, co2: 3 },
    lightsOn: true, equipment: { filter: 0, heater: 0, light: 0, airPump: 0 },
    equipmentCondition: { filter: 100, heater: 100, light: 100, airPump: 100 }, equipmentFaults: {},
    aquariumWorkspacePanel: 'decide', habitatStudioOpen: true, habitatLayout: [], nextHabitatItemId: 4,
    coins: 50, observationNotes: 'Keep my observation.', ...patch
  } });
  const announceToSR = vi.fn(), awardXP = vi.fn(); let tree;
  function Capture() { tree = tool.render(makeCtx({ announceToSR, awardXP }, store)); return null; }
  ReactDOMServer.renderToStaticMarkup(React.createElement(Capture));
  return { tree, tool, store, announceToSR, awardXP, state: () => store.toolData._aquarium,
    buttons: () => elements(tree, n => n.type === 'button'),
    choices: () => elements(tree, n => n.type === 'button' && n.props.className?.includes('ai-event-choice')),
    forecasts: () => elements(tree, n => n.type === 'button' && text(n) === 'Apply this preview') };
}
async function mountEvent(patch = {}) {
  const t = renderTank(patch); let state, update;
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [data, setData] = React.useState(t.store.toolData); state = data._aquarium; update = setData;
    const tree = t.tool.render(makeCtx({ toolData: data, setToolData: setData, announceToSR: t.announceToSR, awardXP: t.awardXP }, t.store));
    // Mount the actual event and its existing navigation target, without WebGL viewers.
    const nav = elements(tree, n => n.type === 'nav' && n.props.className === 'aquarium-workflow-nav')[0];
    const card = elements(tree, n => n.type === 'div' && n.props.className?.startsWith('ai-event-card'))[0];
    return React.createElement('div', null, nav, card, React.createElement('button', { id: 'other-task-control' }, 'Another control'));
  }
  await act(async () => { root.render(React.createElement(Harness)); });
  return { ...t, state: () => state, update };
}

afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); host = null; vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Aquarium action names and matching effects', () => {
  it.each([false, true])('exposes each event choice through its own visible label (translated=%s)', translated => {
    const scenario = event(); if (translated) scenario.choices.forEach((choice, i) => { choice.label = ['Vérifier l’oxygène et aérer', 'Observer avant de modifier'][i]; });
    const t = renderTank({ aiEvent: scenario }), buttons = t.choices(); expect(buttons).toHaveLength(2);
    expect(new Set(buttons.map(text)).size).toBe(2);
    buttons.forEach((button, i) => {
      expect(button.props['aria-label']).toBeUndefined(); expect(button.props['aria-labelledby']).toBeUndefined();
      expect(text(button)).toContain(scenario.choices[i].label); expect(button.props.type).toBe('button');
    });
    expect(t.state().aiEvent).toEqual(scenario); expect(t.awardXP).not.toHaveBeenCalled();
  });

  it('chooses the event action named by its button and preserves the simulation records', () => {
    vi.useFakeTimers(); const scenario = event(), t = renderTank({ aiEvent: scenario });
    t.choices()[1].props.onClick(); vi.advanceTimersByTime(10000); const state = t.state();
    expect(state.aiEvent).toMatchObject({ resolved: true, chosenIdx: 1, chosenOutcome: scenario.choices[1].outcome, chosenXp: 2 });
    expect(state.waterChem.nitrate).toBe(22); expect(state.waterChem.ammonia).toBe(0.2);
    expect(state.aiEventHistory).toEqual([{ title: scenario.title, icon: scenario.icon, choice: scenario.choices[1].label, outcome: scenario.choices[1].outcome, day: 0, xp: 2 }]);
    expect(t.awardXP).toHaveBeenCalledWith('aquarium', 2, 'AI Event: ' + scenario.title);
    expect(state.tankFish).toEqual(['guppy']); expect(state.coins).toBe(50); expect(state.observationNotes).toBe('Keep my observation.');
  });

  it('starts every distinct forecast name with its visible action while retaining the forecast context', () => {
    const t = renderTank(), buttons = t.forecasts(); expect(buttons).toHaveLength(5);
    expect(new Set(buttons.map(button => button.props['aria-label'])).size).toBe(5);
    for (const button of buttons) {
      expect(button.props['aria-label'].startsWith(text(button) + ': ')).toBe(true);
      expect(button.props['aria-label']).toMatch(/Add /); expect(button.props.type).toBe('button');
    }
    expect(t.state().habitatLayout).toEqual([]); expect(t.announceToSR).not.toHaveBeenCalled();
  });

  it('applies exactly the named habitat preview and retains undo and unrelated observations', () => {
    const t = renderTank(), button = t.forecasts().find(button => button.props['aria-label'].includes('Add Shelter cave'));
    expect(button).toBeTruthy(); button.props.onClick(); const state = t.state();
    expect(state.habitatLayout).toHaveLength(1); expect(state.habitatLayout[0]).toMatchObject({ id: 'habitat-4', type: 'cave', scale: 1 });
    expect(state.habitatUndoLayout).toEqual([]); expect(state.selectedHabitatItemId).toBe('habitat-4'); expect(state.nextHabitatItemId).toBe(5);
    expect(t.announceToSR).toHaveBeenCalledWith(expect.stringMatching(/^Add Shelter cave applied\./));
    expect(state.tankFish).toEqual(['guppy']); expect(state.coins).toBe(50); expect(state.observationNotes).toBe('Keep my observation.');
  });

  it('keeps an existing-object preview distinguishable and applies its reversible size change', () => {
    const layout = [{ id: 'habitat-3', type: 'rock_arch', x: 0, y: 0, z: 0, rotation: 0, scale: 1.2 }];
    const t = renderTank({ habitatLayout: layout }), button = t.forecasts().find(button => button.props['aria-label'].includes('Reopen swimming lane'));
    expect(button.props['aria-label']).toMatch(/^Apply this preview: Reopen swimming lane\./); button.props.onClick();
    expect(t.state().habitatLayout[0].scale).toBeCloseTo(0.95); expect(t.state().habitatUndoLayout).toEqual(layout);
    expect(t.state().nextHabitatItemId).toBe(4); expect(t.state().selectedHabitatItemId).toBe('habitat-3');
  });

  it('focuses the named outcome for reading, retains it beyond eight seconds, and restores Decide after explicit dismissal', async () => {
    vi.useFakeTimers(); const scenario = event(), t = await mountEvent({ aiEvent: scenario });
    const choice = host.querySelectorAll('.ai-event-choice')[1]; choice.focus();
    await act(async () => { choice.click(); });
    const outcome = host.querySelector('[role="group"]');
    expect(document.activeElement).toBe(outcome); expect(outcome.tabIndex).toBe(-1);
    expect(document.getElementById(outcome.getAttribute('aria-labelledby')).textContent).toBe(scenario.title + ' — Outcome');
    expect(document.getElementById(outcome.getAttribute('aria-describedby')).textContent).toBe(scenario.choices[1].outcome);
    expect(host.querySelector('.ai-event-choice')).toBeNull();
    await act(async () => { vi.advanceTimersByTime(10000); });
    expect(t.state().aiEvent.resolved).toBe(true); expect(outcome.isConnected).toBe(true);
    const dismiss = host.querySelector('[aria-label="Dismiss aquarium event outcome"]'); dismiss.focus();
    await act(async () => { dismiss.click(); });
    expect(t.state().aiEvent).toBeNull(); expect(host.querySelector('[role="group"]')).toBeNull();
    expect(document.activeElement).toBe(host.querySelector('[data-aquarium-workspace-nav="decide"]'));
    expect(t.state().aiEventHistory).toHaveLength(1); expect(t.state().waterChem.nitrate).toBe(22); expect(t.awardXP).toHaveBeenCalledTimes(1);
  });

  it('returns dismissal of an unanswered event to Decide without changing chemistry or awarding XP', async () => {
    const t = await mountEvent({ aiEvent: event() }), dismiss = host.querySelector('[aria-label="Dismiss aquarium event"]');
    dismiss.focus(); await act(async () => { dismiss.click(); });
    expect(document.activeElement).toBe(host.querySelector('[data-aquarium-workspace-nav="decide"]'));
    expect(t.state().aiEvent).toBeNull(); expect(t.state().waterChem.nitrate).toBe(20); expect(t.awardXP).not.toHaveBeenCalled();
  });

  it('does not take focus back when the user moves to another control before the outcome is rendered', async () => {
    const t = await mountEvent({ aiEvent: event() }), choice = host.querySelector('.ai-event-choice'), other = host.querySelector('#other-task-control');
    choice.focus(); await act(async () => { choice.click(); other.focus(); });
    expect(t.state().aiEvent.resolved).toBe(true); expect(document.activeElement).toBe(other);
  });

  it('does not autofocus a previously saved outcome on mount', async () => {
    const scenario = event(); scenario.resolved = true; scenario.chosenOutcome = scenario.choices[0].outcome; scenario.chosenXp = 5;
    const previous = document.activeElement;
    await mountEvent({ aiEvent: scenario });
    expect(host.querySelector('[role="group"]')).toBeTruthy(); expect(document.activeElement).toBe(previous);
  });
});
