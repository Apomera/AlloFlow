import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    const saveButton = findButton(host, 'Save experiment evidence');
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
});