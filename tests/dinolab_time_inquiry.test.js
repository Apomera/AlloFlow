import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupDinoLab, renderTab, internals } from './helpers/dino_lab_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
let api, root, host, data;
beforeAll(() => { api = setupDinoLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(async () => { if (root) await api.React.act(async () => root.unmount()); root = null; host?.remove(); });
async function mount(initial) {
  document.body.innerHTML = ''; data = initial;
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  const render = () => root.render(api.tool.cfg.render({ React: api.React, toolData: { dinoLab: data }, updateMulti: (_, patch) => { data = { ...data, ...patch }; render(); }, announceToSR() {} }));
  await api.React.act(async () => render());
}
const button = text => [...host.querySelectorAll('button')].find(n => n.textContent.replace(/^[●○] /, '') === text);
async function click(text) { const node = button(text); expect(node).toBeTruthy(); await api.React.act(async () => node.click()); }
async function fill(value) {
  await api.React.act(async () => {
    const node = host.querySelector('#dino-inquiry-explanation');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
describe('time investigation', () => {
  it('keeps the initial prediction, teaches from errors, and preserves existing notes', async () => {
    const notes = { microraptor: { question: 'How did it glide?' } };
    await mount({ tab: 'explore', notebook: notes });
    await click('Start the investigation');
    expect(button('Inspect the dates').disabled).toBe(true);
    await click('Yes'); await click('Inspect the dates');
    await click('Their body sizes differ.');
    expect(host.textContent).toContain('Size can affect an encounter');
    expect(button('Build my explanation').disabled).toBe(true);
    await click('One ate meat and the other ate plants.');
    expect(host.textContent).toContain('Diet suggests what an animal might eat');
    await click('Their known age ranges do not overlap.'); await click('Build my explanation');
    expect(button('Test the idea on another pair').disabled).toBe(true);
    await fill('   '); expect(button('Test the idea on another pair').disabled).toBe(true);
    await fill('I changed my mind: Stegosaurus lived much earlier.');
    await click('Test the idea on another pair');
    await click('Overlapping dates prove they hunted each other.');
    expect(host.textContent).toContain('It does not, by itself, show where they met');
    expect(button('Record my investigation').disabled).toBe(true);
    await click('An encounter was possible in time, but the dates do not prove hunting.');
    await click('Record my investigation');
    expect(data.timeInquiry.prediction).toBe('yes');
    expect(data.timeInquiry.step).toBe(4);
    await click('Open my notebook');
    expect(host.textContent).toContain('I changed my mind');
    expect(data.notebook).toEqual(notes);
    expect(button('Download notebook').disabled).toBe(false);
    await click('Return to my investigation');
    await click('Revise my explanation');
    await fill('The age ranges are separated, so they could not meet.');
    expect(data.timeInquiry.prediction).toBe('yes');
    expect(data.notebook).toEqual(notes);
  });
  it('resumes typed work across tab changes and does not interpret learner text as markup', async () => {
    await mount({ tab: 'explore', timeInquiry: { started: true, prediction: 'unsure', evidence: 'time', step: 2 } });
    await fill('<img src=x onerror=alert(1)> ');
    await api.React.act(async () => host.querySelector('#dinotab-notes').click());
    expect(host.querySelector('img')).toBeNull();
    expect(host.textContent).toContain('<img src=x onerror=alert(1)>');
    await click('Return to my investigation');
    expect(host.querySelector('textarea').value).toBe('<img src=x onerror=alert(1)> ');
  });
  it('normalizes malformed and inconsistent restored progress', () => {
    const normalize = internals().timeInquiryState;
    for (const raw of [null, [], 42, { started: true, step: 4, prediction: 'forged' }]) {
      expect(normalize(raw).step).toBe(0);
      expect(renderTab({ tab: 'explore', timeInquiry: raw })).not.toContain('This section could not open');
    }
    expect(normalize({ started: true, prediction: 'no', step: 4 }).step).toBe(1);
    expect(normalize({ started: true, prediction: 'no', evidence: 'time', explanation: ' ', step: 4 }).step).toBe(2);
    expect(normalize({ explanation: 'x'.repeat(3000) }).explanation).toHaveLength(2000);
    expect(normalize({ explanation: {} }).explanation).toBe('');
  });
  it('exports a partial or completed investigation separately from specimen notes', () => {
    const I = internals();
    expect(I.timeInquiryText(null)).toBe('');
    const q = { started: true, prediction: 'unsure', evidence: 'time', explanation: 'My dates explanation', transfer: 'possible', step: 4 };
    const text = I.notebookText({ microraptor: { question: 'Gliding?' } }) + I.timeInquiryText(q);
    for (const phrase of ['Gliding?', 'Initial prediction: unsure', 'My dates explanation', 'Triceratops', 'Investigation recorded', 'has not been automatically assessed']) expect(text).toContain(phrase);
    expect(I.timeInquiryText({ started: true })).toContain('In progress');
  });
});
describe('honest fossil evidence', () => {
  it('uses sourced feather cases and excludes accidental word matches', () => {
    document.body.innerHTML = renderTab('birds');
    const cases = [...document.querySelectorAll('[data-feather-case]')];
    expect(cases).toHaveLength(6);
    for (const card of cases) {
      expect(card.querySelector('a').href).toMatch(/^https:\/\/doi.org\//);
      expect(card.textContent).toContain('Still uncertain:');
    }
    expect(cases.map(n => n.dataset.featherCase)).not.toContain('dreadnoughtus');
    expect(document.querySelector('[data-feather-case=velociraptor]').textContent).toContain('attachment marks');
    expect(document.body.textContent).toContain('not a complete list');
  });
  it('rejects placeholder ecosystems and separates energy flow from catalog counts', () => {
    for (const ecoOpen of ['Various', 'Morrison', 'Hell Creek']) {
      const html = renderTab({ tab: 'ecosystem', ecoOpen });
      expect(html).not.toContain('Various Formation');
      expect(html).not.toContain('apex predator here:');
      expect(html).toContain('Counts below are catalog entries');
      expect(html).toContain('Omnivores can feed at more than one level');
      expect(html).toContain('not measurements of this formation');
      expect(html).toContain('Even overlapping age ranges do not establish');
    }
  });
  it('does not equate scan completion with strong reasoning or call tiny dinosaurs large', () => {
    const html = renderTab({ tab: 'field3d', field3dSelected: 'microraptor', field3dWorkflowStarted: true, field3dDrawerOpen: true, field3dScanSpecies: 'microraptor', field3dScanLogged: { skull: true, shoulder: true, hip: true } });
    expect(html).toContain('Evidence route 5/5');
    expect(html).not.toContain('Claim strength'); expect(html).not.toContain('Reasoning backed');
    expect(html).toContain('does not assess your reasoning');
    expect(html).not.toContain('was a large animal');
  });
});
