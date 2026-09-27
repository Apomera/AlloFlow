import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
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
const button = text => [...host.querySelectorAll('button')].find(n => n.textContent === text);
async function click(text) { expect(button(text)).toBeTruthy(); await api.React.act(async () => button(text).click()); }
async function input(selector, value) {
  await api.React.act(async () => {
    const node = host.querySelector(selector);
    if (node.tagName === 'SELECT') { node.value = value; node.dispatchEvent(new Event('change', { bubbles: true })); }
    else { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); }
  });
}
const prepared = () => ({ caseId: 'quills', cases: { quills: { step: 1, firstSort: { marks: 'observation', flight: 'inference', feathers: 'overreach' } } } });
const draft = () => ({ citations: ['fossil'], claim: 'Feathers were attached.', reasoning: 'The knobs resemble feather attachments in living birds.', limit: 'Flight would need more anatomical evidence.' });

describe('evidence workbench', () => {
  it('distinguishes observation, inference, and overreach with source-specific feedback, not a score', async () => {
    await mount({ tab: 'anatomy' });
    expect(button('Check my distinctions').disabled).toBe(true);
    expect(button('2 · Explain and revise').disabled).toBe(true);
    await input('#dino-bench-sort-marks', 'inference');
    await input('#dino-bench-sort-flight', 'inference');
    await input('#dino-bench-sort-feathers', 'observation');
    await click('Check my distinctions');
    expect(host.textContent).toContain('Feather attachment is not a test of flight');
    expect(host.textContent).toContain('An inference can be strongly supported');
    expect(host.querySelectorAll('[id^=dino-bench-response-]')).toHaveLength(3);
    await input('#dino-bench-sort-flight', 'overreach');
    expect(host.querySelector('#dino-bench-feedback')).toBeNull();
    await click('Check my distinctions');
    expect(data.evidenceWorkbench.cases.quills.firstSort.flight).toBe('inference');
    expect(data.evidenceWorkbench.cases.quills.sort.flight).toBe('overreach');
    await click('Write my explanation →');
    expect(host.querySelector('#dino-bench-claim')).toBeTruthy();
    expect(data.quizScore).toBeUndefined();
  });

  it('preserves the first explanation and citations when the learner records a revision', async () => {
    const notes = { microraptor: { question: 'Gliding?' } };
    await mount({ tab: 'anatomy', notebook: notes, evidenceWorkbench: prepared() });
    expect(button('Record my explanation').disabled).toBe(true);
    for (const [field, value] of Object.entries(draft())) if (field !== 'citations') await input('#dino-bench-' + field, value);
    expect(button('Record my explanation').disabled).toBe(true);
    await api.React.act(async () => host.querySelector('[data-bench-citation=fossil]').click());
    expect(button('Record my explanation').disabled).toBe(false);
    await click('Record my explanation');
    expect(data.evidenceWorkbench.cases.quills.first).toEqual(draft());
    expect(button('Record my revision').disabled).toBe(true);
    await api.React.act(async () => host.querySelector('section[aria-labelledby="dino-bench-task"] fieldset input').click());
    expect(data.evidenceWorkbench.cases.quills.review.link).toBe(true);
    await input('#dino-bench-claim', 'The sampled forearm carried feathers.');
    expect(host.textContent).toContain('unrecorded revision');
    expect(data.evidenceWorkbench.cases.quills.review).toEqual({});
    await api.React.act(async () => host.querySelector('[data-bench-citation=comparison]').click());
    await click('Record my revision');
    expect(data.evidenceWorkbench.cases.quills.first).toEqual(draft());
    expect(data.evidenceWorkbench.cases.quills.record.citations).toEqual(['fossil', 'comparison']);
    expect(data.evidenceWorkbench.cases.quills.record.claim).toBe('The sampled forearm carried feathers.');
    expect(data.notebook).toEqual(notes);
    await click('View in field notebook');
    expect(host.textContent).toContain('The sampled forearm carried feathers.');
    expect(button('Download notebook').disabled).toBe(false);
    await click('Resume this evidence case');
    expect(host.querySelector('#dino-bench-claim').value).toBe('The sampled forearm carried feathers.');
  });

  it('keeps both cases independent and retains drafts across navigation', async () => {
    await mount({ tab: 'anatomy', evidenceWorkbench: prepared() });
    await input('#dino-bench-claim', 'My unfinished idea');
    const cases = host.querySelectorAll('[aria-label="Choose an evidence case"] button');
    await api.React.act(async () => cases[1].click());
    expect(host.querySelector('[data-evidence-workbench]').dataset.evidenceWorkbench).toBe('scales');
    expect(button('2 · Explain and revise').disabled).toBe(true);
    await input('#dino-bench-sort-everywhere', 'overreach');
    await api.React.act(async () => host.querySelector('#dinotab-notes').click());
    expect(button('Download notebook').disabled).toBe(false);
    await api.React.act(async () => host.querySelector('#dinotab-anatomy').click());
    expect(host.querySelector('#dino-bench-sort-everywhere').value).toBe('overreach');
    await api.React.act(async () => host.querySelector('[aria-label="Choose an evidence case"] button').click());
    expect(host.querySelector('#dino-bench-claim').value).toBe('My unfinished idea');
  });

  it('normalizes malformed restore values, bounds text, deduplicates citations, and rejects incomplete records', () => {
    const normalize = internals().evidenceWorkbenchState;
    for (const raw of [null, [], 1, 'bad', { caseId: '__proto__', cases: { quills: { step: 1, checked: true, firstSort: {}, record: draft() } } }]) {
      const s = normalize(raw);
      expect(s.caseId).toBe('quills'); expect(s.cases.quills.step).toBe(0); expect(s.cases.quills.checked).toBe(false);
      expect(renderTab({ tab: 'anatomy', evidenceWorkbench: raw })).not.toContain('This section could not open');
    }
    const s = normalize({ cases: { quills: { claim: 'x'.repeat(1500), reasoning: {}, limit: false, citations: ['fossil', 'fossil', 'fake'], first: { ...draft(), citations: ['fake'] }, record: { ...draft(), limit: '  ' }, sort: { marks: 'bad', other: 'observation' }, review: { scope: 'yes' } } } }).cases.quills;
    expect(s.claim).toHaveLength(1000); expect(s.reasoning).toBe(''); expect(s.citations).toEqual(['fossil']);
    expect(s.first).toBeNull(); expect(s.record).toBeNull(); expect(s.sort).toEqual({}); expect(s.review.scope).toBe(false);
  });

  it('exports partial drafts, source attribution, preserved first attempts, and unsaved revisions separately', () => {
    const I = internals();
    expect(I.evidenceWorkbenchText(null)).toBe('');
    const state = prepared(); state.cases.quills = { ...state.cases.quills, ...draft(), first: draft(), record: { ...draft(), claim: 'Recorded revision' }, claim: 'Still revising' };
    state.cases.scales = { claim: 'A second case draft' };
    const text = I.evidenceWorkbenchText(state);
    for (const label of ['First classification attempt', 'First recorded explanation', 'Latest recorded explanation', 'Current draft (not yet recorded)', 'Still revising', 'A second case draft', 'https://doi.org/10.1126/science.1145076', 'https://doi.org/10.1098/rsbl.2017.0092', 'without automatic assessment']) expect(text).toContain(label);
    expect(text).not.toContain('undefined');
  });

  it('renders learner markup as plain text and never treats a worked example as learner writing', async () => {
    await mount({ tab: 'anatomy', evidenceWorkbench: prepared() });
    await input('#dino-bench-claim', '<img src=x onerror=alert(1)>');
    const support = [...host.querySelectorAll('summary')].find(n => n.textContent === 'Sentence starters and a worked example');
    await api.React.act(async () => support.click());
    expect(data.evidenceWorkbench.cases.quills.reasoning).toBe('');
    expect(data.evidenceWorkbench.cases.quills.first).toBeNull();
    await click('View in field notebook');
    expect(host.querySelector('img')).toBeNull(); expect(host.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('records completeness without automatically interpreting the student prose', async () => {
    await mount({ tab: 'anatomy', evidenceWorkbench: prepared() });
    for (const field of ['claim', 'reasoning', 'limit']) await input('#dino-bench-' + field, ' ');
    await api.React.act(async () => host.querySelector('[data-bench-citation=fossil]').click());
    expect(button('Record my explanation').disabled).toBe(true);
    for (const field of ['claim', 'reasoning', 'limit']) await input('#dino-bench-' + field, 'I need help with this.');
    await click('Record my explanation');
    expect(data.evidenceWorkbench.cases.quills.record.claim).toBe('I need help with this.');
    expect(host.textContent).toContain('your writing is not automatically assessed');
  });

  it('uses keyboard-native controls, descriptive diagrams, and real research links for both cases', () => {
    for (const caseId of ['quills', 'scales']) {
      document.body.innerHTML = renderTab({ tab: 'anatomy', evidenceWorkbench: { caseId } });
      expect(document.querySelectorAll('[data-evidence-workbench] select')).toHaveLength(3);
      expect(document.querySelector('[data-evidence-workbench] svg[role="img"]').getAttribute('aria-label')).toContain('Schematic');
      expect(document.querySelector('[data-evidence-workbench] a').href).toMatch(/^https:\/\/doi.org\//);
      expect(document.querySelectorAll('[data-bench-citation]')).toHaveLength(2);
    }
  });

  it('localizes case content and keeps English registry fallbacks and the shipped mirror synchronized', () => {
    const I = internals(); const calls = [];
    I.evidenceCases((key, value) => { calls.push([key, value]); return value; });
    const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');
    for (const match of source.matchAll(/\b(?:bt|et)\('([^']+)', '((?:[^'\\]|\\.)*)'\)/g)) calls.push(['stem.dinolab.bench_' + match[1], match[2].replace(/\\'/g, "'")]);
    for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
      const registry = JSON.parse(readFileSync(file, 'utf8'));
      for (const [key, value] of calls) expect(key.split('.').reduce((v, k) => v[k], registry), key).toBe(value);
    }
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js', 'utf8')).toBe(source);
  });
});
