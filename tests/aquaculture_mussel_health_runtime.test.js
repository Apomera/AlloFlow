import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function findButton(host, text) {
  return Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes(text));
}

function setControlValue(control, value) {
  let prototype = window.HTMLInputElement.prototype;
  let eventName = 'input';
  if (control instanceof window.HTMLTextAreaElement) prototype = window.HTMLTextAreaElement.prototype;
  if (control instanceof window.HTMLSelectElement) {
    prototype = window.HTMLSelectElement.prototype;
    eventName = 'change';
  }
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
  setter.call(control, value);
  control.dispatchEvent(new Event(eventName, { bubbles: true }));
}

async function click(control) {
  await act(async () => {
    control.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
}

async function change(control, value) {
  await act(async () => {
    setControlValue(control, value);
    await Promise.resolve();
  });
}

async function blur(control) {
  await act(async () => {
    control.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await Promise.resolve();
  });
}

async function keyDown(control, key) {
  await act(async () => {
    control.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    await Promise.resolve();
  });
}

describe('Aquaculture blue-mussel health station', () => {
  let host;
  let root;
  async function mountTool() {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_aquaculture.js', 'aquacultureLab');
    const Component = () => config.render(makeCtx({ React }));
    root = ReactDOMClient.createRoot(host);
    await act(async () => {
      root.render(React.createElement(Component));
      await Promise.resolve();
    });
  }

  async function remountWithState(state) {
    if (root) {
      await act(async () => {
        root.unmount();
        await Promise.resolve();
      });
      root = null;
    }
    window.localStorage.setItem('aquacultureLab.state.v1', JSON.stringify(state));
    await mountTool();
  }

  beforeEach(async () => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.focus = vi.fn();
    window.matchMedia = vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));
    host = document.createElement('div');
    document.body.appendChild(host);
    await mountTool();
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  async function openMusselStation() {
    const musselButton = findButton(host, 'Mussel Deep');
    expect(musselButton).toBeTruthy();
    await click(musselButton);
    expect(host.querySelector('#aq-mussel-health-heading').textContent).toBe('Mussel health station');
  }

  async function predictAndReveal(prediction = 'oxygen') {
    await change(host.querySelector('#aq-mussel-prediction'), prediction);
    const reveal = findButton(host, 'Reveal model');
    expect(reveal.disabled).toBe(false);
    await click(reveal);
  }

  it('prioritizes acute signals, separates food limitation, and exposes exact units', () => {
    const assess = window.AquacultureLearningHelpers.assessMusselHealth;
    const balanced = assess({ temperature: 14, salinity: 28, oxygen: 8.1, pH: 8.05, chlorophyll: 7, fouling: 12, attachment: 92 });
    const heatwave = assess({ temperature: 24, salinity: 27, oxygen: 3.6, pH: 7.85, chlorophyll: 16, fouling: 35, attachment: 58 });
    const freshet = assess({ temperature: 12, salinity: 12, oxygen: 7.5, pH: 7.7, chlorophyll: 5, fouling: 18, attachment: 72 });
    const lowFood = assess({ temperature: 9, salinity: 30, oxygen: 8.6, pH: 8.1, chlorophyll: 0.7, fouling: 8, attachment: 88 });

    expect(balanced.status).toBe('Ready to monitor');
    expect(balanced.factors).toHaveLength(7);
    expect(balanced.priorityFactor.label).toBe('No priority signal');
    expect(heatwave.status).toBe('Act and verify');
    expect(heatwave.priorityFactor.id).toBe('oxygen');
    expect(heatwave.priorityActions[0]).toContain('Confirm the sensor');
    expect(freshet.priorityFactor.id).toBe('salinity');
    expect(freshet.priorityActions[0]).toContain('surface and crop depth');
    expect(lowFood.status).toBe('Watch closely');
    expect(lowFood.priorityFactor.id).toBe('chlorophyll');
    expect(lowFood.factors.some((factor) => factor.status === 'critical')).toBe(false);
    expect(heatwave.factors.find((factor) => factor.id === 'temperature').unit).toBe('°C');
    expect(heatwave.factors.find((factor) => factor.id === 'chlorophyll').unit).toBe('µg/L');
    expect(heatwave.modelVersion).toBe('2026.08');
    expect(JSON.stringify(heatwave)).not.toMatch(/\?C|\?g\/L|model\?s/);
  });

  it('carries paired boat evidence into either depth of the Mussel Health model', async () => {
    await remountWithState({
      completedMissions: {
        'mission-1': {
          completedAt: 123456,
          mode: '3d',
          summary: {
            elapsedSeconds: 98,
            fuelRemaining: 84,
            buoyViolations: 1,
            droppersDeployed: 5,
            surfaceReading: { depth: 'surface', temp: '14.1', salinity: '27.2', DO: '8.20', pH: '8.01', chlA: '6.5', timestamp: 100 },
            cropDepthReading: { depth: 'crop', temp: '13.2', salinity: '27.8', DO: '5.40', pH: '7.82', chlA: '4.2', timestamp: 200 },
          },
        },
      },
    });
    await openMusselStation();

    const panel = host.querySelector('.aq-mussel-mission-evidence');
    expect(panel).toBeTruthy();
    expect(panel.dataset.loadedDepth).toBe('none');
    expect(panel.querySelector('svg title').textContent).toContain('Paired boat-probe depth profile');
    expect(panel.querySelector('svg desc').textContent).toContain('same visit');
    expect(panel.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(panel.querySelector('.aq-mussel-mission-evidence-table').textContent).toContain('-2.80 mg/L');
    expect(findButton(panel, 'Use crop depth').getAttribute('aria-pressed')).toBe('false');

    await click(findButton(panel, 'Use crop depth'));
    expect(host.querySelector('#aq-mussel-temperature-number').value).toBe('13.2');
    expect(host.querySelector('#aq-mussel-oxygen-number').value).toBe('5.4');
    expect(host.querySelector('#aq-mussel-pH-number').value).toBe('7.82');
    expect(host.querySelector('#aq-mussel-chlorophyll-number').value).toBe('4.2');
    expect(host.querySelector('#aq-mussel-fouling-number').value).toBe('12');
    expect(host.querySelector('#aq-mussel-attachment-number').value).toBe('92');
    expect(host.querySelector('#aq-mussel-case-heading').textContent).toBe('Boat mission \u00B7 crop-depth evidence');
    expect(host.querySelector('#aq-mussel-temperature-source').textContent).toContain('boat probe');
    expect(host.querySelector('#aq-mussel-fouling-source').textContent).toContain('not measured by probe');
    expect(host.querySelector('#aq-mussel-temperature').getAttribute('aria-describedby')).toContain('aq-mussel-temperature-source');
    expect(findButton(panel, 'Use crop depth').getAttribute('aria-pressed')).toBe('true');

    let saved = JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1')).musselHealthWorkspace;
    expect(saved.evidenceSource).toBe('mission-crop');
    expect(saved.evidenceMissionCompletedAt).toBe(123456);
    await change(host.querySelector('#aq-mussel-fouling-number'), '35');
    saved = JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1')).musselHealthWorkspace;
    expect(saved.evidenceSource).toBe('mission-crop');

    await change(host.querySelector('#aq-mussel-temperature-number'), '13.3');
    saved = JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1')).musselHealthWorkspace;
    expect(saved.evidenceSource).toBe('');
    expect(host.querySelector('#aq-mussel-case-heading').textContent).toBe('Custom field case');

    await click(findButton(panel, 'Use surface'));
    expect(host.querySelector('#aq-mussel-temperature-number').value).toBe('14.1');
    expect(host.querySelector('#aq-mussel-oxygen-number').value).toBe('8.2');
    expect(findButton(panel, 'Use surface').getAttribute('aria-pressed')).toBe('true');

    const results = await axe.run(panel, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false }, 'scrollable-region-focusable': { enabled: false } },
    });
    expect(results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([]);
  }, 15000);
  it('sanitizes versioned checks and prints all seven readings with safety metadata', () => {
    const helpers = window.AquacultureLearningHelpers;
    const trainingSurface = helpers.missionScenarioProbeReading('training', 'surface', 'guided-2d', false);
    const freshetSurface = helpers.missionScenarioProbeReading('freshet', 'surface', 'guided-2d', false);
    const freshetCrop = helpers.missionScenarioProbeReading('freshet', 'crop', 'guided-2d', false);
    const heatCrop = helpers.missionScenarioProbeReading('heat-slack', 'crop', 'guided-2d', false);
    expect(helpers.fieldMissionScenario('unknown').id).toBe('training');
    const currentCases = [
      { id: 'training', expected: { phase: 'flood', x: 0, z: -.05 }, direction: /up-river.*landing.*lease/i, effect: /assists inbound travel.*resists the return leg/i, displacement: { x: 0, z: -.4 } },
      { id: 'freshet', expected: { phase: 'ebb', x: .03, z: .09 }, direction: /down-river.*landing.*eastward cross-channel set/i, effect: /opposes inbound travel.*steering corrections/i, displacement: { x: .24, z: .72 } },
      { id: 'heat-slack', expected: { phase: 'slack', x: .003, z: .008 }, direction: /near-slack.*outward residual set/i, effect: /little assistance.*very little flushing/i, displacement: { x: .024, z: .064 } },
    ];
    const describedCurrents = currentCases.map((currentCase) => {
      const current = helpers.describeMissionCurrent(currentCase.id);
      expect(current).toMatchObject(currentCase.expected);
      expect(current.direction).toMatch(currentCase.direction);
      expect(current.effect).toMatch(currentCase.effect);
      expect(current.narrative).toContain(current.direction);
      expect(current.narrative).toContain(current.effect);
      const displacement = helpers.missionCurrentDisplacement(currentCase.id, 1);
      expect(displacement.x).toBeCloseTo(currentCase.displacement.x, 8);
      expect(displacement.z).toBeCloseTo(currentCase.displacement.z, 8);
      return current;
    });
    expect(describedCurrents[2].magnitude).toBeLessThan(describedCurrents[0].magnitude);
    expect(describedCurrents[0].magnitude).toBeLessThan(describedCurrents[1].magnitude);
    expect(trainingSurface).toMatchObject({ depth: 'surface', DO: '8.45', salinity: '28.4' });
    expect(freshetSurface).toMatchObject({ depth: 'surface', salinity: '13.5' });
    expect(freshetSurface.warnings.join(' ')).toContain('Salinity low');
    expect(heatCrop).toMatchObject({ depth: 'crop', temp: '22.9', DO: '3.85' });
    expect(heatCrop.warnings.join(' ')).toContain('Dissolved oxygen low');
    expect(helpers.describeMissionDepthComparison(freshetSurface, freshetCrop)).toContain('11.3 PSU higher in salinity');
    expect(helpers.recommendedMissionDecisionId('freshet', freshetSurface, freshetCrop)).toBe('resample-after-mixing');
    expect(helpers.evaluateMissionDecision('freshet', freshetSurface, freshetCrop, 'declare-closure')).toMatchObject({
      id: 'declare-closure',
      recommended: false,
      recommendedId: 'resample-after-mixing',
    });
    expect(helpers.evaluateMissionDecision('freshet', freshetSurface, freshetCrop, 'resample-after-mixing')).toMatchObject({
      id: 'resample-after-mixing',
      recommended: true,
      recommendedId: 'resample-after-mixing',
    });
    const workspace = helpers.sanitizeMusselHealthWorkspace({
      temperature: 999,
      salinity: -5,
      scenarioId: 'heatwave',
      prediction: 'oxygen',
      observation: 'draft',
      checks: [{
        id: 'check-1',
        savedAt: 500,
        status: 'Act and verify',
        limitingFactor: 'Dissolved oxygen',
        prioritySignal: 'Dissolved oxygen',
        modelVersion: '2026.08',
        scenarioId: 'heatwave',
        prediction: 'oxygen',
        evidenceSource: 'mission-crop',
        evidenceMissionCompletedAt: 400,
        observation: '<script>field note</script>',
        readings: { temperature: 24, salinity: 27, oxygen: 3.6, pH: 7.85, chlorophyll: 16, fouling: 35, attachment: 58 },
      }],
    });
    expect(workspace.temperature).toBe(30);
    expect(workspace.salinity).toBe(0);
    expect(workspace.scenarioId).toBe('heatwave');
    expect(workspace.checks[0]).toMatchObject({
      prioritySignal: 'Dissolved oxygen',
      modelVersion: '2026.08',
      prediction: 'oxygen',
      evidenceSource: 'mission-crop',
      evidenceMissionCompletedAt: 400,
    });

    const missionSummary = helpers.sanitizeMissionSummary({
      scenarioId: 'freshet',
      elapsedSeconds: 98,
      fuelRemaining: 84,
      buoyViolations: 1,
      droppersDeployed: 5,
      surfaceReading: { depth: 'surface', temp: '14.1', salinity: '27.2', DO: '8.20', pH: '8.01', chlA: '6.5' },
      cropDepthReading: { depth: 'crop', temp: '13.2', salinity: '27.8', DO: '5.40', pH: '7.82', chlA: '4.2' },
      decisionId: 'resample-after-mixing',
      decisionAttempts: 2,
    });
    expect(missionSummary).toMatchObject({
      scenarioId: 'freshet',
      scenarioName: 'After-rain freshet',
      tide: 'Ebbing after rain',
      decisionId: 'resample-after-mixing',
      decisionRecommended: true,
      recommendedDecisionId: 'resample-after-mixing',
      decisionAttempts: 2,
    });
    const comparison = helpers.compareMissionDepthReadings(missionSummary);
    const mappedCrop = helpers.missionReadingToMusselReadings(missionSummary.cropDepthReading, {});
    expect(comparison.metrics.find((metric) => metric.id === 'oxygen').delta).toBe(-2.8);
    expect(mappedCrop).toMatchObject({ temperature: 13.2, oxygen: 5.4, fouling: 12, attachment: 92 });
    const groups = [{ id: 'species', label: 'Species', tabs: [{ id: 'musseldeep', label: 'Mussel Deep' }] }];
    const portfolio = helpers.buildLearningPortfolio({
      musselHealthWorkspace: workspace,
      completedMissions: {
        'mission-1': { completedAt: 600, mode: '3d', summary: missionSummary },
      },
    }, groups, [], '2026-08-25T12:00:00.000Z');
    const merged = helpers.mergeLearningPortfolio({}, portfolio, ['musseldeep']);
    const html = helpers.portfolioToHtml(portfolio);
    const trust = helpers.contentTrustForTopic('musseldeep');

    expect(portfolio.summary.musselHealthChecks).toBe(1);
    expect(merged.musselHealthWorkspace.checks).toHaveLength(1);
    expect(portfolio.learning.completedMissions['mission-1'].summary.cropDepthReading.DO).toBe('5.40');
    expect(merged.completedMissions['mission-1'].summary.surfaceReading.temp).toBe('14.1');
    expect(html).toContain('Paired boat-probe record');
    expect(html).toContain('Field condition:</strong> After-rain freshet');
    expect(html).toContain('5.40 mg/L');
    expect(html).toContain('Evidence source:</strong> boat mission crop-depth sample');
    expect(html).toContain('Mussel field-check evidence');
    expect(html).toContain('temperature 24 °C');
    expect(html).toContain('pH 7.85');
    expect(html).toContain('chlorophyll-a 16 µg/L');
    expect(html).toContain('model 2026.08');
    expect(html).toContain('&lt;script&gt;field note&lt;/script&gt;');
    expect(html).not.toContain('<script>field note</script>');
    expect(html).not.toMatch(/\?C|\?g\/L|model\?s/);
    expect(trust.label).toBe('Illustrative field-investigation model');
    expect(trust.sourceIds).toContain('maineClosures');
    expect(trust.sourceIds).toContain('maineSeaGrantMussel');
  });

  it('guides a prediction before revealing seven accessible signals', async () => {
    await openMusselStation();

    const steps = host.querySelector('.aq-mussel-steps');
    const controls = host.querySelector('.aq-mussel-controls');
    const revealStep = host.querySelector('.aq-mussel-reveal-step');
    expect(host.querySelector('.aq-mussel-factor-table')).toBeNull();
    expect(host.querySelector('.aq-mussel-result-hidden').textContent).toContain('Model result hidden');
    expect(host.querySelector('.aq-mussel-lease-figure svg title').textContent).toContain('crop-depth sampling');
    expect(host.querySelector('.aq-mussel-lease-figure svg desc').textContent).toContain('four vertical mussel droppers');
    expect(host.querySelector('.aq-mussel-culture-figure svg title').textContent).toContain('culture journey');
    expect(host.querySelector('.aq-mussel-evidence-figure svg title').textContent).toContain('field evidence ladder');
    expect(host.querySelector('.aq-mussel-visual-guide summary').textContent).toContain('two more diagrams');
    expect(findButton(host, 'Open 3D + guided mission')).toBeTruthy();
    expect(host.querySelectorAll('.aq-mussel-health-station [aria-live="polite"]')).toHaveLength(1);
    expect(host.querySelectorAll('.aq-mussel-controls input[type="range"]')).toHaveLength(7);
    expect(host.querySelectorAll('.aq-mussel-controls input[type="number"]')).toHaveLength(7);
    expect(host.querySelector('#aq-mussel-oxygen').getAttribute('aria-valuetext')).toContain('hidden until reveal');
    expect(host.querySelector('.aq-mussel-food-safety a').href).toContain('/shellfish/closures');
    expect(steps.querySelector('[aria-current="step"]').textContent).toContain('2 · Predict');
    expect(controls.compareDocumentPosition(revealStep) & window.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const presets = Array.from(host.querySelectorAll('.aq-mussel-preset'));
    expect(presets).toHaveLength(5);
    expect(presets.every((button) => button.getAttribute('role') === 'radio')).toBe(true);
    expect(presets.find((button) => button.textContent.includes('Balanced')).getAttribute('aria-checked')).toBe('true');
    expect(presets.map((button) => button.tabIndex)).toEqual([0, -1, -1, -1, -1]);
    expect(findButton(host, 'Reveal model').disabled).toBe(true);

    await keyDown(presets[0], 'ArrowRight');
    expect(presets.find((button) => button.textContent.includes('Heatwave')).getAttribute('aria-checked')).toBe('true');
    expect(presets.map((button) => button.tabIndex)).toEqual([-1, 0, -1, -1, -1]);
    expect(host.querySelector('#aq-mussel-case-heading').textContent).toBe('Heatwave + slack tide');

    await change(host.querySelector('#aq-mussel-prediction'), 'temperature');
    expect(steps.querySelector('[aria-current="step"]').textContent).toContain('3 · Inspect');
    await click(findButton(host, 'Reveal model'));
    expect(steps.querySelector('[aria-current="step"]').textContent).toContain('5 · Explain + save');
    expect(revealStep.textContent).toContain('Model revealed');
    expect(findButton(host, 'Reveal again')).toBeUndefined();
    expect(host.querySelectorAll('.aq-mussel-factor-table tbody tr')).toHaveLength(7);
    expect(host.querySelector('.aq-mussel-assessment').textContent).toContain('Act and verify');
    expect(host.querySelector('.aq-mussel-assessment').textContent).toContain('Dissolved oxygen');
    expect(host.querySelector('.aq-mussel-assessment').textContent).toContain('You predicted Temperature');
    expect(host.querySelector('#aq-mussel-oxygen-signal').textContent).toContain('Urgent verification');
    expect(host.querySelector('#aq-mussel-oxygen').getAttribute('aria-valuetext')).toContain('Urgent verification');
    expect(host.textContent).toContain('Within reference band');
    const tableText = host.querySelector('.aq-mussel-factor-table').textContent;
    expect(tableText).not.toContain('?C');
    expect(tableText).not.toContain('?g/L');
  });

  it('preserves the explanation draft across typing, scenario loads, and reset', async () => {
    await openMusselStation();
    await predictAndReveal('none');

    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    const observation = host.querySelector('#aq-mussel-observation');
    const draft = 'The balanced pattern looks workable, but I would repeat crop-depth readings after the tide turns.';
    const writesBeforeTyping = storageSpy.mock.calls.length;
    await change(observation, draft);
    expect(storageSpy.mock.calls.length).toBe(writesBeforeTyping);
    expect(observation.value).toBe(draft);

    await blur(observation);
    expect(storageSpy.mock.calls.length).toBeGreaterThan(writesBeforeTyping);
    expect(JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1')).musselHealthWorkspace.observation).toBe(draft);

    await click(findButton(host, 'Heatwave + slack tide'));
    expect(JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1')).musselHealthWorkspace.observation).toBe(draft);
    await click(findButton(host, 'Reset signals'));
    const resetState = JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1')).musselHealthWorkspace;
    expect(resetState.observation).toBe(draft);
    expect(resetState.scenarioId).toBe('balanced');

    await predictAndReveal('none');
    expect(host.querySelector('#aq-mussel-observation').value).toBe(draft);
  });

  it('connects the visual field guide to the paired-depth lease mission', async () => {
    await openMusselStation();
    expect(host.querySelectorAll('.aq-mussel-visual-guide figure')).toHaveLength(2);
    expect(host.querySelector('.aq-mussel-culture-figure svg desc').textContent).toContain('collecting spat');
    expect(host.querySelector('.aq-mussel-evidence-figure svg desc').textContent).toContain('crop-depth repetition');

    await click(findButton(host, 'Open 3D + guided mission'));
    expect(host.querySelector('.aq-guided-mission')).toBeTruthy();
    await click(findButton(host, 'Start guided 2D mission'));
    expect(host.textContent).toContain('Compare surface and crop-depth samples');
    expect(host.textContent).toContain('paired depth samples');
  });

  it('replays an after-rain field day and preserves its guided evidence', async () => {
    await openMusselStation();
    await click(findButton(host, 'Open 3D + guided mission'));

    const briefing = host.querySelector('.aq-field-mission-briefing');
    expect(briefing).toBeTruthy();
    expect(briefing.querySelector('svg title').textContent).toBe('Clear-water training sampling and current diagram');
    expect(briefing.querySelector('svg desc').textContent).toContain('two probe depths');
    let choices = Array.from(briefing.querySelectorAll('.aq-field-scenario-choice'));
    expect(choices).toHaveLength(3);
    expect(choices.map((choice) => choice.getAttribute('role'))).toEqual(['radio', 'radio', 'radio']);
    expect(choices.map((choice) => choice.tabIndex)).toEqual([0, -1, -1]);

    await keyDown(choices[0], 'ArrowRight');
    choices = Array.from(briefing.querySelectorAll('.aq-field-scenario-choice'));
    expect(choices.find((choice) => choice.textContent.includes('After-rain freshet')).getAttribute('aria-checked')).toBe('true');
    expect(briefing.textContent).toContain('Stronger outward flow');
    expect(briefing.textContent).toContain('Does the salinity signal persist at crop depth');
    expect(JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1')).missionScenarioId).toBe('freshet');

    await click(findButton(host, 'Start guided 2D mission'));
    expect(Array.from(briefing.querySelectorAll('.aq-field-scenario-choice')).every((choice) => choice.disabled)).toBe(true);
    for (const label of ['Depart the landing', 'Keep red nun to starboard', 'Follow the marked channel']) await click(findButton(host, label));
    for (let count = 1; count <= 5; count += 1) await click(findButton(host, 'Deploy seeded dropper ' + count + ' of 5'));
    await click(findButton(host, 'Take surface sample'));
    await click(findButton(host, 'Take crop-depth sample'));

    const paired = host.querySelector('.aq-guided-sample-comparison');
    expect(paired.querySelector('caption').textContent).toContain('After-rain freshet');
    expect(paired.textContent).toContain('13.5 PSU');
    expect(paired.textContent).toContain('24.8 PSU');
    expect(paired.textContent).toContain('11.3 PSU higher in salinity');

    let checkpoint = host.querySelector('.aq-guided-decision-panel');
    expect(checkpoint).toBeTruthy();
    expect(checkpoint.querySelector('h3').textContent).toContain('Choose the best next verification');
    expect(checkpoint.textContent).toContain('surface is much fresher than crop depth');
    expect(checkpoint.textContent).toContain('Surface (12.4\u00B0C, 13.5 PSU, DO 8.35 mg/L, pH 7.72)');
    expect(checkpoint.textContent).toContain('Salinity low');
    expect(checkpoint.textContent).toContain('pH low');
    expect(findButton(host, 'Return and secure the vessel')).toBeFalsy();

    await click(checkpoint.querySelector('input[value="declare-closure"]'));
    await click(findButton(checkpoint, 'Check verification response'));
    checkpoint = host.querySelector('.aq-guided-decision-panel');
    expect(checkpoint.querySelector('[role="status"]').textContent).toContain('only current authority notices determine an official closure');
    expect(checkpoint.querySelector('[role="status"]').textContent).toContain('try another response');
    expect(findButton(host, 'Return and secure the vessel')).toBeFalsy();

    const checkpointAxe = await axe.run(checkpoint, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false }, 'scrollable-region-focusable': { enabled: false } },
    });
    expect(checkpointAxe.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([]);

    await click(checkpoint.querySelector('input[value="resample-after-mixing"]'));
    await click(findButton(checkpoint, 'Check verification response'));
    const decisionResult = host.querySelector('.aq-guided-decision-result');
    expect(decisionResult.textContent).toContain('Verification plan recorded');
    expect(decisionResult.textContent).toContain('Flag the depth gradient and resample both depths as the tide mixes');
    expect(findButton(host, 'Return and secure the vessel')).toBeTruthy();

    await click(findButton(host, 'Return and secure the vessel'));
    await change(host.querySelector('#aq-guided-reflection'), 'I kept red to starboard, stayed in the channel, and compared the freshet at both sample depths.');
    await click(findButton(host, 'Save mission evidence'));
    const mission = JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1')).completedMissions['mission-1'];
    expect(mission.summary).toMatchObject({
      scenarioId: 'freshet',
      scenarioName: 'After-rain freshet',
      tide: 'Ebbing after rain',
      surfaceReading: { salinity: '13.5' },
      cropDepthReading: { salinity: '24.8' },
      decisionId: 'resample-after-mixing',
      decisionLabel: 'Flag the depth gradient and resample both depths as the tide mixes',
      decisionOutcome: 'This tests whether the freshet signal persists before the crew changes farm practice.',
      decisionRecommended: true,
      recommendedDecisionId: 'resample-after-mixing',
      recommendedDecisionLabel: 'Flag the depth gradient and resample both depths as the tide mixes',
      decisionAttempts: 2,
    });
    expect(mission.choice).toContain('After-rain freshet');
    expect(mission.choice).toContain('verification plan: Flag the depth gradient and resample both depths as the tide mixes');

    await click(findButton(host, 'Choose another condition'));
    expect(Array.from(briefing.querySelectorAll('.aq-field-scenario-choice')).every((choice) => !choice.disabled)).toBe(true);
    const results = await axe.run(briefing, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false }, 'scrollable-region-focusable': { enabled: false } },
    });
    expect(results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([]);
  }, 15000);

  it('saves versioned evidence, reloads readings, and supports undo with distinct labels', async () => {
    await openMusselStation();
    await click(findButton(host, 'Heatwave + slack tide'));
    await predictAndReveal('oxygen');

    const observation = host.querySelector('#aq-mussel-observation');
    const explanation = 'Warm water and low oxygen occur together, so I would verify calibrated crop-depth readings after the tide turns.';
    await change(observation, explanation);
    await click(findButton(host, 'Save field-check evidence'));
    await click(findButton(host, 'Save field-check evidence'));

    let saved = JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1')).musselHealthWorkspace;
    expect(saved.checks).toHaveLength(2);
    expect(saved.observation).toBe(explanation);
    expect(saved.checks[0]).toMatchObject({
      status: 'Act and verify',
      limitingFactor: 'Dissolved oxygen',
      prioritySignal: 'Dissolved oxygen',
      modelVersion: '2026.08',
      scenarioId: 'heatwave',
      prediction: 'oxygen',
    });
    expect(host.textContent).toContain('Saved field checks · 2/10');
    expect(host.textContent).toContain('pH 7.85');
    expect(host.textContent).toContain('Chl-a 16 µg/L');

    const removeLabels = Array.from(host.querySelectorAll('button[aria-label^="Remove Act and verify"]')).map((button) => button.getAttribute('aria-label'));
    expect(new Set(removeLabels).size).toBe(2);

    await change(host.querySelector('#aq-mussel-oxygen-number'), '8.8');
    expect(host.querySelector('#aq-mussel-oxygen').value).toBe('8.8');
    expect(host.querySelector('#aq-mussel-case-heading').textContent).toBe('Heatwave + slack tide · adjusted');
    expect(host.querySelector('#aq-mussel-case-heading').nextElementSibling.textContent).toContain('changed at least one reading');
    await click(findButton(host, 'Load this check'));
    expect(host.querySelector('#aq-mussel-oxygen').value).toBe('3.6');
    expect(host.querySelector('#aq-mussel-case-heading').textContent).toBe('Heatwave + slack tide');
    expect(host.querySelector('#aq-mussel-observation').value).toBe(explanation);

    await click(Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Remove'));
    saved = JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1')).musselHealthWorkspace;
    expect(saved.checks).toHaveLength(1);
    expect(findButton(host, 'Undo remove')).toBeTruthy();
    await click(findButton(host, 'Undo remove'));
    saved = JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1')).musselHealthWorkspace;
    expect(saved.checks).toHaveLength(2);
  });

  it('stops at ten saved checks without silently discarding history', async () => {
    await openMusselStation();
    await predictAndReveal('none');
    await change(host.querySelector('#aq-mussel-observation'), 'I would repeat the same calibrated sampling method at crop depth during the next tidal phase.');

    for (let index = 0; index < 10; index += 1) {
      await click(findButton(host, 'Save field-check evidence'));
    }

    const before = JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1')).musselHealthWorkspace.checks;
    expect(before).toHaveLength(10);
    expect(new Set(before.map((check) => check.id)).size).toBe(10);
    const fullButton = findButton(host, 'History full');
    expect(fullButton).toBeTruthy();
    expect(fullButton.disabled).toBe(true);

    await click(fullButton);
    const after = JSON.parse(window.localStorage.getItem('aquacultureLab.state.v1')).musselHealthWorkspace.checks;
    expect(after).toHaveLength(10);
    expect(after.map((check) => check.id)).toEqual(before.map((check) => check.id));
  });

  it('has no serious or critical accessibility findings after reveal', async () => {
    await openMusselStation();
    await click(findButton(host, 'Heatwave + slack tide'));
    await predictAndReveal('oxygen');
    host.querySelector('.aq-mussel-visual-guide').open = true;

    const results = await axe.run(host.querySelector('.aq-mussel-health-station'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
        'scrollable-region-focusable': { enabled: false },
      },
    });
    const serious = results.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => `${violation.id}: ${violation.help}`);
    expect(serious).toEqual([]);
  }, 15000);
});
