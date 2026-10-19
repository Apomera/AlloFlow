import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupDinoLab, renderTab, internals } from './helpers/dino_lab_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');
const start = source.indexOf('  // Inquiry controls belong to a species;');
const end = source.indexOf('  function catalogList(state)', start);
if (start < 0 || end < 0) throw new Error('Specimen inquiry helper bounds missing');
let api, root, host, data, render;
beforeAll(() => { api = setupDinoLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(async () => { if (root) await api.React.act(async () => root.unmount()); root = null; host?.remove(); });
function normalize(raw) {
  return new Function('DINOS', source.slice(start, end) + '\nreturn specimenInquiryState;')(internals().DINOS)(raw);
}
async function mount(initial) {
  document.body.innerHTML = ''; data = initial;
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  render = () => root.render(api.tool.cfg.render({ React: api.React, toolData: { dinoLab: data }, updateMulti: (_, patch) => { data = { ...data, ...patch }; render(); }, announceToSR() {} }));
  await api.React.act(async () => render());
}
async function click(node) { expect(node).toBeTruthy(); await api.React.act(async () => node.click()); }
async function fill(id, value) {
  const node = host.querySelector('#' + id); expect(node).toBeTruthy();
  await api.React.act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function choose(value) {
  const node = host.querySelector('#dino-specimen-inquiry-source');
  await api.React.act(async () => { node.value = value; node.dispatchEvent(new Event('change', { bubbles: true })); });
}
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent === text);

describe('specimen inquiry and transfer to the field notebook', () => {
  it('normalizes only known species, explicit booleans and valid evidence sources without mutating input', () => {
    for (const raw of [null, [], 1, 'x']) expect(normalize(raw)).toEqual({});
    const raw = { missing: { open: true, source: 'model' }, tyrannosaurus: { open: 'true', source: 'fossil', reviewed: 1 }, microraptor: { open: true, source: '<img src=x>', reviewed: true }, stegosaurus: [] };
    const copy = JSON.stringify(raw);
    expect(normalize(raw)).toEqual({ tyrannosaurus: { open: false, source: 'fossil', reviewed: false }, microraptor: { open: true, source: '', reviewed: true } });
    expect(JSON.stringify(raw)).toBe(copy);
    expect(normalize(Object.create({ tyrannosaurus: { open: true } }))).toEqual({});
  });

  it('shows actionable completeness feedback without treating any prose as automatically correct', async () => {
    await mount({ tab: 'explore', selected: 'tyrannosaurus', specimenInquiry: { tyrannosaurus: { open: true } } });
    await click(button('Review my explanation'));
    const feedback = host.querySelector('#dino-specimen-inquiry-feedback');
    expect(feedback.textContent).toContain('0/3 writing prompts filled');
    expect(feedback.textContent).toContain('Choose a source');
    expect(feedback.textContent).toContain('Describe the evidence');
    expect(feedback.textContent).toContain('Written reasoning has not been automatically assessed');
    await choose('model');
    expect(host.textContent).toContain('find fossil evidence before making a claim');
    expect(host.querySelector('#dino-specimen-inquiry-feedback')).toBeNull();
    for (const field of ['observation', 'inference', 'uncertainty']) await fill('dino-specimen-inquiry-' + field, 'x');
    await click(button('Review my explanation'));
    expect(host.querySelector('#dino-specimen-inquiry-feedback').textContent).toContain('3/3 writing prompts filled. This checks completeness only.');
    expect(host.querySelector('#dino-specimen-inquiry-feedback').textContent).toContain('consider an alternative');
    expect(data).not.toHaveProperty('quizCorrect');
  });

  it('shares exact prose with the existing notebook in both directions and retains another species draft', async () => {
    await mount({ tab: 'explore', selected: 'tyrannosaurus', specimenInquiry: { tyrannosaurus: { open: true } }, notebook: { tyrannosaurus: { question: 'Why small arms?' }, microraptor: { inference: 'A gliding idea' } } });
    await choose('fossil');
    await fill('dino-specimen-inquiry-observation', 'Fossil teeth ');
    await fill('dino-specimen-inquiry-inference', '<img src=x> My interpretation');
    await click(button('Continue in my notebook'));
    expect(data.tab).toBe('notes'); expect(data.notebookSpecies).toBe('tyrannosaurus');
    expect(host.querySelector('#dino-note-question').value).toBe('Why small arms?');
    expect(host.querySelector('#dino-note-observation').value).toBe('Fossil teeth ');
    expect(host.querySelector('#dino-note-inference').value).toBe('<img src=x> My interpretation');
    expect(host.textContent).toContain('My selected evidence source: Reported fossil evidence');
    await fill('dino-note-inference', 'A revised explanation');
    await click(host.querySelector('#dinotab-explore'));
    expect(host.querySelector('#dino-specimen-inquiry-inference').value).toBe('A revised explanation');
    expect(data.notebook.microraptor.inference).toBe('A gliding idea');
    expect(data.specimenInquiry.tyrannosaurus.source).toBe('fossil');
    expect(host.querySelector('img')).toBeNull();
  });

  it('restores independent species controls and bounds pasted writing before storing it', async () => {
    await mount({ tab: 'explore', selected: 'tyrannosaurus', specimenInquiry: { tyrannosaurus: { open: true, source: 'catalog' }, microraptor: { open: true, source: 'fossil' } } });
    await fill('dino-specimen-inquiry-observation', 'a'.repeat(3000));
    expect(data.notebook.tyrannosaurus.observation).toHaveLength(2000);
    await api.React.act(async () => { data = { ...JSON.parse(JSON.stringify(data)), selected: 'microraptor' }; render(); });
    expect(host.querySelector('#dino-specimen-inquiry-source').value).toBe('fossil');
    expect(host.querySelector('#dino-specimen-inquiry-observation').value).toBe('');
    await fill('dino-specimen-inquiry-observation', 'Feather impressions');
    await api.React.act(async () => { data = { ...data, selected: 'tyrannosaurus' }; render(); });
    expect(host.querySelector('#dino-specimen-inquiry-source').value).toBe('catalog');
    expect(host.querySelector('#dino-specimen-inquiry-observation').value).toHaveLength(2000);
    expect(data.notebook.microraptor.observation).toBe('Feather impressions');
  });

  it('includes student-selected provenance in notebook export and escapes restored prose in rendering', () => {
    const I = internals();
    const notes = I.notebookMap({ tyrannosaurus: { observation: '<img src=x> shape', inference: 'A hypothesis' } });
    const text = I.notebookText(notes, { tyrannosaurus: { source: 'model', reviewed: true } });
    expect(text).toContain('Student evidence source: Observation of an illustrative model');
    expect(text).toContain('Written reasoning has not been automatically assessed.');
    expect(text).toContain('My explanation:\nA hypothesis');
    expect(I.notebookText(notes, { tyrannosaurus: { source: 'forged' } })).not.toContain('Student evidence source:');
    const html = renderTab({ tab: 'explore', selected: 'tyrannosaurus', notebook: notes, specimenInquiry: { tyrannosaurus: { open: true } } });
    expect(html).toContain('&lt;img src=x&gt;'); expect(html).not.toContain('<img src=x>');
    expect(html).toContain('aria-describedby="dino-specimen-inquiry-observation-hint"');
  });
});
