import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const button = (host, label) => Array.from(host.querySelectorAll('button')).find(el => el.textContent.includes(label));
async function click(el) { expect(el).toBeTruthy(); await act(async () => { el.click(); }); }
async function change(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
describe('Aquaculture investigation loop', () => {
  let host, root, config;
  async function mount() {
    config = loadTool('stem_lab/stem_tool_aquaculture.js', 'aquacultureLab');
    root = ReactDOMClient.createRoot(host);
    await act(async () => root.render(React.createElement(() => config.render(makeCtx({ React })))));
  }
  beforeEach(async () => {
    localStorage.clear(); resetStemLab(); window.history.replaceState({}, '', '/');
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
    host = document.createElement('div'); document.body.appendChild(host); await mount();
  });
  afterEach(() => { if(root) act(() => root.unmount()); host.remove(); localStorage.clear(); vi.restoreAllMocks(); });
  it('keeps one next action visible while secondary home choices use native disclosures', () => {
    expect(host.querySelectorAll('.aq-next-action-card')).toHaveLength(1);
    expect(host.querySelector('.aq-next-action-card').textContent).toContain('Start an ecosystem investigation');
    for (const name of ['aq-profile-card', 'aq-learning-card', 'aq-journeys-card', 'aq-operations-card', 'aq-mission-studio']) {
      const section = host.querySelector('.' + name);
      expect(section.tagName).toBe('DETAILS'); expect(section.open).toBe(false);
      expect(section.querySelector(':scope > summary')).toBeTruthy();
    }
  });
  it('guides a reproducible comparison, prevents unchanged saves, and restores saved progress', async () => {
    await click(button(host, 'Ecosystem builder'));
    expect(host.querySelector('#aq-investigation-heading').textContent).toBe('Predict & save A');
    await change(host.querySelector('#aq-eco-prediction'), 'Less starting oxygen will reduce survival because organisms need oxygen.');
    await click(button(host, 'Begin comparison with this design'));
    expect(host.querySelector('#aq-investigation-heading').textContent).toBe('Change one input');
    await change(host.querySelector('#aq-eco-observation'), 'I will compare the oxygen measurement and modeled survival with A.');
    expect(button(host, 'Save A/B comparison').disabled).toBe(true);
    await click(button(host, 'Try changing starting oxygen'));
    expect(document.activeElement.id).toBe('aq-eco-oxygen');
    await change(host.querySelector('#aq-eco-oxygen'), '3');
    expect(host.querySelector('#aq-investigation-heading').textContent).toBe('Compare & explain');
    expect(host.querySelector('.aq-loop-changes').textContent).toContain('One input changed');
    expect(button(host, 'Save A/B comparison').disabled).toBe(false);
    await click(button(host, 'Save A/B comparison'));
    const state = JSON.parse(localStorage.getItem('aquacultureLab.state.v1'));
    const record = state.ecosystemWorkspace.experiments[0];
    expect(record.currentScenario.water.oxygen).toBe(3);
    expect(record.baselineScenario.water.oxygen).not.toBe(3);
    expect(record.prediction).toContain('Less starting oxygen');
    expect(host.querySelector('#aq-investigation-heading').textContent).toBe('Evidence saved');
    const helpers = window.AquacultureLearningHelpers;
    const portfolio = helpers.buildLearningPortfolio(state, [], []);
    const html = helpers.portfolioToHtml(portfolio);
    expect(html).toContain('Less starting oxygen'); expect(html).toContain('Full saved scenario settings');
    await act(async () => root.unmount()); root = null; resetStemLab(); await mount();
    expect(host.querySelector('#aq-investigation-heading').textContent).toBe('Evidence saved');
    await click(button(host, 'Start another investigation'));
    expect(host.querySelector('#aq-eco-prediction').value).toBe('');
    expect(JSON.parse(localStorage.getItem('aquacultureLab.state.v1')).ecosystemWorkspace.experiments).toHaveLength(1);
  });
  it('identifies confounding inputs and restores A without deleting a reflection draft', async () => {
    await click(button(host, 'Ecosystem builder')); await click(button(host, 'Begin comparison with this design'));
    await change(host.querySelector('#aq-eco-oxygen'), '3');
    await click(button(host, 'Marine heatwave'));
    await change(host.querySelector('#aq-eco-observation'), 'This draft explains the combined change and is kept when I restore A.');
    expect(host.querySelector('.aq-loop-changes').textContent).toContain('2 inputs changed');
    expect(host.querySelector('.aq-loop-changes').textContent).toContain('cannot attribute it to just one input');
    await click(button(host, 'Restore inputs from A'));
    expect(host.querySelector('.aq-loop-changes').textContent).toContain('same settings');
    expect(host.querySelector('#aq-eco-observation').value).toContain('This draft');
    expect(button(host, 'Save A/B comparison').disabled).toBe(true);
  });
  it('compares semantic inputs independently of key ordering, notes, and rounded outcomes', async () => {
    const h = window.AquacultureLearningHelpers;
    const a = { environmentId: 'longline', organisms: { mussel: 2, kelp: 1 }, water: { oxygen: 8 }, disturbanceId: 'none' };
    const b = { ...a, organisms: { kelp: 1, mussel: 2 }, observation: 'Different text' };
    expect(h.ecosystemChanges(a, b)).toEqual([]);
    b.water = { oxygen: 8.001 };
    expect(h.ecosystemChanges(a, b)).toEqual([{ label: 'Starting oxygen', before: 8, after: 8.001, unit: ' mg/L' }]);
    expect(h.ecosystemChanges(null, a)).toEqual([]);
  });
  it('moves custom radio selection with arrow keys and keeps a single tab stop', async () => {
    await click(button(host, 'Ecosystem builder'));
    const group = host.querySelector('[aria-label="Ecosystem disturbance"]');
    const radios = Array.from(group.querySelectorAll('[role="radio"]'));
    expect(radios.filter(r => r.tabIndex === 0)).toHaveLength(1);
    await act(async () => radios[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    expect(radios[1].getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(radios[1]);
    expect(radios.filter(r => r.tabIndex === 0)).toHaveLength(1);
  });
});
