import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function findButton(host, text) {
  return Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes(text));
}
function setTextareaValue(control, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(control, value);
  control.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('Aquaculture Ecosystem Builder', () => {
  let host;
  let root;
  let config;

  beforeEach(async () => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_aquaculture.js', 'aquacultureLab');
    const Component = () => config.render(makeCtx({ React }));
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('models nutrient connections, disturbances, and compatibility warnings', () => {
    const helpers = window.AquacultureLearningHelpers;
    const water = { temperature: 13, salinity: 30, oxygen: 8.8, pH: 8, ammonia: 0.04, exchange: 82 };
    const baseline = helpers.calculateEcosystem({ environmentId: 'longline', organisms: { oyster: 2, mussel: 2, kelp: 2, phytoplankton: 1 }, water, disturbanceId: 'none' });
    const heatwave = helpers.calculateEcosystem({ environmentId: 'longline', organisms: { oyster: 2, mussel: 2, kelp: 2, phytoplankton: 1 }, water, disturbanceId: 'heatwave' });
    const mismatch = helpers.calculateEcosystem({ environmentId: 'longline', organisms: { salmon: 5 }, water, disturbanceId: 'none' });
    expect(baseline.selected).toHaveLength(4);
    expect(baseline.connections.length).toBeGreaterThan(0);
    expect(heatwave.oxygen).toBeLessThan(baseline.oxygen);
    expect(heatwave.warnings.some((item) => item.text.includes('temperature'))).toBe(true);
    expect(mismatch.status).toBe('Critical');
    expect(mismatch.warnings.some((item) => item.text.includes('not compatible'))).toBe(true);
  });

  it('saves experiment evidence and recommends Teacher Studio for teachers', async () => {
    const ecosystemButton = findButton(host, 'Ecosystem builder');
    await act(async () => { ecosystemButton.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    expect(host.querySelectorAll('.aq-eco-organism')).toHaveLength(14);
    expect(host.querySelector('[role="radiogroup"][aria-label="Farm environment"]')).toBeTruthy();
    const heatwaveButton = findButton(host, 'Marine heatwave');
    await act(async () => { heatwaveButton.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    const observation = host.querySelector('#aq-eco-observation');
    await act(async () => { setTextareaValue(observation, 'The heatwave lowered oxygen and moved kelp beyond its preferred temperature range.'); await Promise.resolve(); });
    const saveButton = findButton(host, 'Save snapshot evidence');
    expect(saveButton.disabled).toBe(false);
    await act(async () => { saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    let saved = JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1'));
    expect(saved.ecosystemWorkspace.experiments).toHaveLength(1);
    expect(saved.ecosystemWorkspace.experiments[0].observation).toContain('heatwave lowered oxygen');

    const homeButton = findButton(host, 'Home');
    await act(async () => { homeButton.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    const role = host.querySelector('#aq-profile-role');
    const selectSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    await act(async () => { selectSetter.call(role, 'teacher'); role.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); });
    const teacherButton = findButton(host, 'Open Teacher Studio');
    expect(teacherButton).toBeTruthy();
    await act(async () => { teacherButton.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    expect(host.querySelector('#aq-topic-heading').textContent).toContain('Teacher Studio');
    expect(host.textContent).toContain('Download printable assignment');
    saved = JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1'));
    expect(saved.learnerProfile).toMatchObject({ role: 'teacher', configured: true });
  });

  it('projects a 12-month timeline and saves an A/B comparison report', async () => {
    const helpers = window.AquacultureLearningHelpers;
    const water = { temperature: 13, salinity: 30, oxygen: 8.8, pH: 8, ammonia: 0.04, exchange: 82 };
    const baselineRun = helpers.simulateEcosystemYear({ environmentId: 'longline', organisms: { oyster: 2, mussel: 2, kelp: 2 }, water, disturbanceId: 'none' });
    const heatwaveRun = helpers.simulateEcosystemYear({ environmentId: 'longline', organisms: { oyster: 2, mussel: 2, kelp: 2 }, water, disturbanceId: 'heatwave' });
    const comparison = helpers.compareEcosystemRuns(baselineRun, heatwaveRun);
    expect(baselineRun.timeline).toHaveLength(12);
    expect(heatwaveRun.timeline.some((month) => month.event === 'Marine heatwave')).toBe(true);
    expect(heatwaveRun.summary.minOxygen).toBeLessThan(baselineRun.summary.minOxygen);
    expect(comparison.minOxygen).toBeLessThan(0);

    await act(async () => { findButton(host, 'Ecosystem builder').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    await act(async () => { findButton(host, 'Save current as scenario A').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    await act(async () => { findButton(host, 'Marine heatwave').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    const observation = host.querySelector('#aq-eco-observation');
    await act(async () => { setTextareaValue(observation, 'Scenario B adds a heatwave so I compared oxygen, survival, and risk months against A.'); await Promise.resolve(); });
    const compareButton = findButton(host, 'Save A/B comparison');
    expect(compareButton.disabled).toBe(false);
    await act(async () => { compareButton.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    const saved = JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1'));
    expect(saved.ecosystemWorkspace.experiments[0]).toMatchObject({ kind: 'comparison' });
    expect(saved.ecosystemWorkspace.experiments[0].baselineSummary).toBeTruthy();
    expect(host.textContent).toContain('A/B seasonal comparison');
  });

  it('completes the boat mission through the guided 2D equivalent', async () => {
    await act(async () => { findButton(host, 'Boat mission').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    expect(host.textContent).toContain('Complete the same field decisions without WebGL');
    await act(async () => { findButton(host, 'Start guided 2D mission').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    for (const label of ['Depart the landing', 'Keep red nun to starboard', 'Follow the marked channel']) {
      await act(async () => { findButton(host, label).dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    }
    for (let count = 1; count <= 5; count += 1) {
      await act(async () => { findButton(host, `Deploy seeded dropper ${count} of 5`).dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    }
    await act(async () => { findButton(host, 'Take surface sample').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    await act(async () => { findButton(host, 'Take crop-depth sample').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    const pairedRecord = host.querySelector('.aq-guided-sample-comparison');
    expect(pairedRecord).toBeTruthy();
    expect(pairedRecord.textContent).toContain('Paired depth record');
    expect(pairedRecord.textContent).toContain('0.40 mg/L lower');
    expect(pairedRecord.querySelectorAll('tbody tr')).toHaveLength(2);
    const verificationChoice = host.querySelector('input[value="repeat-baseline"]');
    expect(verificationChoice).toBeTruthy();
    expect(findButton(host, 'Return and secure the vessel')).toBeUndefined();
    await act(async () => { verificationChoice.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    await act(async () => { findButton(host, 'Check verification response').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    expect(host.textContent).toContain('Verification plan recorded');
    await act(async () => { findButton(host, 'Return and secure the vessel').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    const reflection = host.querySelector('#aq-guided-reflection');
    await act(async () => { setTextareaValue(reflection, 'I kept the red nun to starboard, stayed in the channel, compared surface and crop-depth samples, and returned safely.'); await Promise.resolve(); });
    await act(async () => { findButton(host, 'Save mission evidence').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    const saved = JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1'));
    expect(saved.completedMissions['mission-1']).toMatchObject({
      mode: 'guided-2d',
      summary: {
        buoyViolations: 0,
        droppersDeployed: 5,
        surfaceReading: { depth: 'surface', DO: '8.45' },
        cropDepthReading: { depth: 'crop', DO: '8.05' },
        decisionId: 'repeat-baseline',
        decisionRecommended: true,
        recommendedDecisionId: 'repeat-baseline',
        decisionAttempts: 1
      }
    });
    expect(saved.probeReadings.slice(-2).map((reading) => reading.depth)).toEqual(['surface', 'crop']);
    expect(saved.probeReadings.at(-2)).toMatchObject({ mode: 'guided-2d', depth: 'surface', DO: '8.45' });
    expect(saved.probeReadings.at(-1)).toMatchObject({ mode: 'guided-2d', depth: 'crop', DO: '8.05' });
    const analyze = findButton(host, 'Analyze saved samples');
    expect(analyze).toBeTruthy();
    await act(async () => { analyze.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    expect(host.querySelector('#aq-mussel-health-heading').textContent).toBe('Mussel health station');
    expect(host.querySelector('#aq-mussel-temperature-number').value).toBe('13.5');
    expect(JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1')).musselHealthWorkspace.evidenceSource).toBe('mission-crop');
  });

  it('renders scenario-specific current direction, effects, and operational clues accessibly', async () => {
    await act(async () => { findButton(host, 'Boat mission').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    const briefing = host.querySelector('.aq-field-mission-briefing');
    expect(briefing).toBeTruthy();

    await act(async () => { findButton(briefing, 'After-rain freshet').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    let figure = briefing.querySelector('.aq-field-condition-figure');
    let key = figure.querySelector('.aq-field-current-key');
    expect(figure.querySelector('svg title').textContent).toBe('After-rain freshet sampling and current diagram');
    expect(figure.querySelector('svg desc').textContent).toContain('Down-river and outward toward the landing');
    expect(figure.querySelector('.aq-field-runoff-clue').textContent).toContain('RAIN RUNOFF SURFACE LAYER');
    expect(key.textContent).toContain('Opposes inbound travel to the lease');
    expect(key.textContent).toContain('Rain runoff can freshen the surface');

    await act(async () => { findButton(briefing, 'Warm slack tide').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    figure = briefing.querySelector('.aq-field-condition-figure');
    key = figure.querySelector('.aq-field-current-key');
    expect(figure.querySelector('svg title').textContent).toBe('Warm slack tide sampling and current diagram');
    expect(figure.querySelector('svg desc').textContent).toContain('Near-slack with a slight outward residual set');
    expect(figure.querySelector('.aq-field-heat-clue').textContent).toContain('WARM HAZE');
    expect(key.textContent).toContain('Offers little assistance in either direction');
    expect(key.textContent).toContain('Warm haze and weak flushing');

    const results = await axe.run(figure, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false }, 'scrollable-region-focusable': { enabled: false } },
    });
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
  });

  it('labels model scope and exposes official primary-source gateways', async () => {
    await act(async () => { findButton(host, 'Ecosystem builder').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    const trust = host.querySelector('.aq-content-trust');
    expect(trust).toBeTruthy();
    expect(trust.textContent).toContain('Illustrative learning model');
    const links = Array.from(trust.querySelectorAll('a')).map((link) => link.href);
    expect(links.some((href) => href.includes('fisheries.noaa.gov'))).toBe(true);
    expect(links.some((href) => href.includes('nal.usda.gov'))).toBe(true);
    expect(window.AquacultureLearningHelpers.contentTrustForTopic('lease').label).toBe('Time-sensitive reference');
  });});
