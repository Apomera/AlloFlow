import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const storageKey = 'aquacultureLab.state.v1';
const water = { temperature: 13, salinity: 30, oxygen: 8.8, pH: 8, ammonia: .5, exchange: 82 };
const community = { oyster: 2, mussel: 2, kelp: 2, phytoplankton: 1 };

function button(host, label) {
  return [...host.querySelectorAll('button')].find((item) => item.textContent.includes(label));
}

describe('Aquaculture evidence integrity and ecological feedback', () => {
  let host;
  let root;

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
    resetStemLab();
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    root = null;
    host = null;
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  async function mount(state = {}) {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
    const config = loadTool('stem_lab/stem_tool_aquaculture.js', 'aquacultureLab');
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => {
      root.render(React.createElement(() => config.render(makeCtx({ React }))));
      await Promise.resolve();
    });
    return window.AquacultureLearningHelpers;
  }

  it('lowers resilience as the same community experiences oxygen and temperature stress', async () => {
    const helpers = await mount();
    const scenario = { environmentId: 'longline', organisms: community, water, disturbanceId: 'none' };
    const baseline = helpers.calculateEcosystem(scenario);
    const hypoxic = helpers.calculateEcosystem({ ...scenario, water: { ...water, oxygen: 2 } });
    const overheated = helpers.calculateEcosystem({ ...scenario, water: { ...water, temperature: 25 } });
    expect(hypoxic.status).toBe('Critical');
    expect(hypoxic.resilience).toBeLessThan(baseline.resilience);
    expect(overheated.resilience).toBeLessThan(baseline.resilience);
    const referenceYear = helpers.simulateEcosystemYear(scenario);
    const heatwaveYear = helpers.simulateEcosystemYear({ ...scenario, disturbanceId: 'heatwave' });
    expect(heatwaveYear.summary.averageResilience).toBeLessThan(referenceYear.summary.averageResilience);
  });

  it('models northern sea cucumbers as particle feeders without direct dissolved-ammonia removal', async () => {
    const helpers = await mount();
    const scenario = { environmentId: 'netpen', organisms: { salmon: 2 }, water, disturbanceId: 'none' };
    const baseline = helpers.calculateEcosystem(scenario);
    const withSeaCucumber = helpers.calculateEcosystem({ ...scenario, organisms: { salmon: 2, 'sea-cucumber': 1 } });
    expect(withSeaCucumber.clarity).toBeGreaterThan(baseline.clarity);
    expect(withSeaCucumber.ammonia).toBeGreaterThanOrEqual(baseline.ammonia);
    expect(withSeaCucumber.connections.join(' ')).not.toContain('Deposit feeders');
  });

  it('keeps the draft and all twelve records when a learner tries to save to a full log', async () => {
    const experiments = Array.from({ length: 12 }, (_, index) => ({ id: 'kept-' + index, savedAt: index + 1, environmentId: 'longline', organisms: community, status: 'Stable', observation: 'A previous recorded observation ' + index }));
    const observation = 'My unsaved explanation must stay available while I make room in the experiment log.';
    await mount({ lastTopic: 'ecosystem', ecosystemWorkspace: { environmentId: 'longline', organisms: community, water, disturbanceId: 'none', observation, experiments } });
    expect(host.querySelector('.aq-eco-history-full').textContent).toContain('full at 12');
    await act(async () => { button(host, 'Save snapshot evidence').click(); });
    let saved = JSON.parse(window.localStorage.getItem(storageKey)).ecosystemWorkspace;
    expect(saved.experiments.map((item) => item.id)).toEqual(experiments.map((item) => item.id));
    expect(host.querySelector('#aq-eco-observation').value).toBe(observation);
    await act(async () => { button(host, 'Remove').click(); });
    expect(host.querySelector('.aq-eco-history-full')).toBeNull();
    await act(async () => { button(host, 'Save snapshot evidence').click(); });
    saved = JSON.parse(window.localStorage.getItem(storageKey)).ecosystemWorkspace;
    expect(saved.experiments).toHaveLength(12);
    expect(saved.experiments[0].observation).toBe(observation);
    expect(saved.experiments.some((item) => item.id === 'kept-11')).toBe(true);
  });

  it('describes populated evidence fields as drafts and leaves the claim to the learner', async () => {
    await mount({ lastTopic: 'ecosystem', ecosystemWorkspace: { environmentId: 'longline', organisms: community, water, evidence: { claim: 'A tentative answer', evidence: 'A measurement', reasoning: 'A possible mechanism', nextTest: 'A further test' } } });
    const coach = host.querySelector('.aq-evidence-coach');
    expect(coach.textContent).toContain('4/4 fields drafted');
    expect(coach.textContent).toContain('draft completeness');
    expect(button(coach, 'Use as claim')).toBeUndefined();
    expect(host.querySelector('#aq-eco-evidence-claim').value).toBe('A tentative answer');
  });
});
