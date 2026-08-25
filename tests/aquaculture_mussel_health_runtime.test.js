import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('Aquaculture blue-mussel health station', () => {
  let host;
  let root;

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
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_aquaculture.js', 'aquacultureLab');
    const Component = () => config.render(makeCtx({ React }));
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => {
      root.render(React.createElement(Component));
      await Promise.resolve();
    });
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

  it('sanitizes versioned checks and prints all seven readings with safety metadata', () => {
    const helpers = window.AquacultureLearningHelpers;
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
    });

    const groups = [{ id: 'species', label: 'Species', tabs: [{ id: 'musseldeep', label: 'Mussel Deep' }] }];
    const portfolio = helpers.buildLearningPortfolio({ musselHealthWorkspace: workspace }, groups, [], '2026-08-25T12:00:00.000Z');
    const merged = helpers.mergeLearningPortfolio({}, portfolio, ['musseldeep']);
    const html = helpers.portfolioToHtml(portfolio);
    const trust = helpers.contentTrustForTopic('musseldeep');

    expect(portfolio.summary.musselHealthChecks).toBe(1);
    expect(merged.musselHealthWorkspace.checks).toHaveLength(1);
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

    expect(host.querySelector('.aq-mussel-factor-table')).toBeNull();
    expect(host.querySelector('.aq-mussel-result-hidden').textContent).toContain('Model result hidden');
    expect(host.querySelector('.aq-mussel-lease-figure svg title').textContent).toContain('crop-depth sampling');
    expect(host.querySelector('.aq-mussel-lease-figure svg desc').textContent).toContain('four vertical mussel droppers');
    expect(host.querySelectorAll('.aq-mussel-health-station [aria-live="polite"]')).toHaveLength(1);
    expect(host.querySelectorAll('.aq-mussel-controls input[type="range"]')).toHaveLength(7);
    expect(host.querySelectorAll('.aq-mussel-controls input[type="number"]')).toHaveLength(7);
    expect(host.querySelector('#aq-mussel-oxygen').getAttribute('aria-valuetext')).toContain('hidden until reveal');
    expect(host.querySelector('.aq-mussel-food-safety a').href).toContain('/shellfish/closures');

    const presets = Array.from(host.querySelectorAll('.aq-mussel-preset'));
    expect(presets).toHaveLength(5);
    expect(presets.every((button) => button.getAttribute('role') === 'radio')).toBe(true);
    expect(presets.find((button) => button.textContent.includes('Balanced')).getAttribute('aria-checked')).toBe('true');
    expect(findButton(host, 'Reveal model').disabled).toBe(true);

    await click(findButton(host, 'Heatwave + slack tide'));
    expect(presets.find((button) => button.textContent.includes('Heatwave')).getAttribute('aria-checked')).toBe('true');
    expect(host.querySelector('#aq-mussel-case-heading').textContent).toBe('Heatwave + slack tide');

    await predictAndReveal('temperature');
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
    await click(findButton(host, 'Load this check'));
    expect(host.querySelector('#aq-mussel-oxygen').value).toBe('3.6');
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
});
