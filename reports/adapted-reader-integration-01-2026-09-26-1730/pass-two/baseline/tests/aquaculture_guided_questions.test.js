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
describe('Aquaculture guided questions and backup integrity', () => {
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
  it.each([
    ['oxygen-buffer', 'Oxygen buffer', 'Starting oxygen'],
    ['stocking-tradeoff', 'Stocking trade-off', 'Atlantic salmon'],
    ['flow-response', 'Flow without a crash', 'Water exchange']
  ])('makes %s a reproducible one-input investigation without replacing the previous draft', async (id, title, inputLabel) => {
    await click(button(host, 'Ecosystem builder'));
    const prior = 'My existing explanation must remain available when I choose a guided question.';
    await change(host.querySelector('#aq-eco-observation'), prior);
    await click(button(host, title));
    const helpers = window.AquacultureLearningHelpers;
    const question = helpers.ecosystemInvestigation(id);
    expect(host.querySelector('.aq-question-brief').textContent).toContain(question.question);
    expect(JSON.parse(localStorage.getItem('aquacultureLab.state.v1')).ecosystemWorkspace.parkedDraft.observation).toBe(prior);
    await change(host.querySelector('#aq-eco-prediction'), 'I predict no change; I will revise this explanation if the evidence differs.');
    await click(button(host, 'Begin comparison with this design'));
    await click(button(host, question.change));
    const workspace = JSON.parse(localStorage.getItem('aquacultureLab.state.v1')).ecosystemWorkspace;
    const changes = helpers.ecosystemChanges(workspace.baselineScenario, workspace);
    expect(changes).toHaveLength(1);
    expect(changes[0].label).toContain(inputLabel);
    const a = helpers.simulateEcosystemYear(workspace.baselineScenario);
    const b = helpers.simulateEcosystemYear(workspace);
    expect(b.summary.minOxygen).toBeLessThan(a.summary.minOxygen);
    if (id === 'flow-response') expect(b.summary.survival).toBe(a.summary.survival);
    if (id === 'stocking-tradeoff') {
      expect(b.summary.endingBiomass).toBeGreaterThan(a.summary.endingBiomass);
      expect(b.summary.operatingEffort).toBeGreaterThan(a.summary.operatingEffort);
    }
    expect(host.querySelector('.aq-loop-results').textContent).toContain('mg/L');
    await change(host.querySelector('#aq-eco-observation'), 'The evidence differs from my prediction. I will cite the oxygen values and revise my explanation.');
    await change(host.querySelector('#aq-eco-evidence-nextTest'), question.nextTest);
    await click(button(host, 'Save A/B comparison'));
    const state = JSON.parse(localStorage.getItem('aquacultureLab.state.v1'));
    const record = state.ecosystemWorkspace.experiments[0];
    expect(record.investigationId).toBe(id);
    expect(record.prediction).toContain('I predict no change');
    expect(record.evidence.nextTest).toBe(question.nextTest);
    expect(host.querySelector('#aq-investigation-heading').textContent).toBe('Evidence saved');
    expect(host.querySelector('.aq-investigation-loop').textContent).toContain(question.nextTest);
    const exported = helpers.portfolioToHtml(helpers.buildLearningPortfolio(state, [], []));
    expect(exported).toContain('I predict no change');
    expect(exported).toContain(question.nextTest);
    await click(button(host, 'Return to my draft'));
    expect(host.querySelector('#aq-eco-observation').value).toBe(prior);
    expect(JSON.parse(localStorage.getItem('aquacultureLab.state.v1')).ecosystemWorkspace.experiments).toHaveLength(1);
  });

  it('merges backups without silently replacing duplicate records or evicting records beyond capacity', () => {
    const h = window.AquacultureLearningHelpers;
    const record = (id, savedAt = 1, observation = 'Original recorded evidence stays intact') => ({ id, savedAt, environmentId: 'longline', organisms: { mussel: 2 }, status: 'Stable', observation });
    const current = { ecosystemWorkspace: { experiments: Array.from({ length: 12 }, (_, i) => record('original-' + i, i + 1)) } };
    const payload = h.buildLearningPortfolio({ ecosystemWorkspace: { experiments: [record('extra', 20)] } }, [], []);
    expect(() => h.mergeLearningPortfolio(current, payload, [])).toThrow('experiment-capacity');
    expect(current.ecosystemWorkspace.experiments).toHaveLength(12);
    const duplicate = h.buildLearningPortfolio({ ecosystemWorkspace: { experiments: [record('original-0', 100, 'Incoming copy must not replace the original')] } }, [], []);
    const merged = h.mergeLearningPortfolio(current, duplicate, []);
    expect(merged.ecosystemWorkspace.experiments).toHaveLength(12);
    expect(merged.ecosystemWorkspace.experiments.find(item => item.id === 'original-0').observation).toBe('Original recorded evidence stays intact');
    const withDraft = { ecosystemWorkspace: { prediction: 'My unfinished prediction', observation: 'A draft already in progress', water: { oxygen: 4 } } };
    const draftMerged = h.mergeLearningPortfolio(withDraft, payload, []);
    expect(draftMerged.ecosystemWorkspace.prediction).toBe('My unfinished prediction');
    expect(draftMerged.ecosystemWorkspace.water.oxygen).toBe(4);
    expect(draftMerged.ecosystemWorkspace.experiments).toHaveLength(1);
  });

  it('keeps a bounded parked draft without nested records or invalid investigation identifiers', () => {
    const h = window.AquacultureLearningHelpers;
    const draft = h.sanitizeEcosystemWorkspace({ investigationId: 'invented', parkedDraft: { observation: 'Keep this text', prediction: 'Keep this prediction', investigationId: 'oxygen-buffer', experiments: [{ id: 'nested' }], parkedDraft: { observation: 'nested' } } });
    expect(draft.investigationId).toBe('');
    expect(draft.parkedDraft.observation).toBe('Keep this text');
    expect(draft.parkedDraft.investigationId).toBe('oxygen-buffer');
    expect(draft.parkedDraft).not.toHaveProperty('experiments');
    expect(draft.parkedDraft).not.toHaveProperty('parkedDraft');
  });
});
