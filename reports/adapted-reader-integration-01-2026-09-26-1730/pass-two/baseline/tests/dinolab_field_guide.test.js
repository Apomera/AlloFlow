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
  document.body.innerHTML = ''; data = initial; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  const render = () => root.render(api.tool.cfg.render({ React: api.React, toolData: { dinoLab: data }, updateMulti: (_, patch) => { data = { ...data, ...patch }; render(); }, announceToSR() {} }));
  await api.React.act(async () => render());
}
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent === text);
async function click(node) { expect(node).toBeTruthy(); await api.React.act(async () => node.click()); }
async function fill(node, value) {
  const proto = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await api.React.act(async () => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); });
}
describe('Dino Lab field guide and notebook', () => {
  it('bounds the catalog DOM and safely clamps restored pages', () => {
    document.body.innerHTML = renderTab({ tab: 'explore', catalogPage: 99999 });
    const count = document.querySelectorAll('[data-dino-card]').length;
    expect(count).toBeGreaterThan(0); expect(count).toBeLessThanOrEqual(24);
    document.body.innerHTML = renderTab({ tab: 'explore' });
    expect(document.querySelectorAll('[data-dino-card]')).toHaveLength(24);
  });
  it('searches formations and traits with multiple case-insensitive terms', () => {
    const I = internals();
    const result = I.catalogList({ query: 'MONGOLIA FEATHER' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(d => /mongolia/i.test(d.region))).toBe(true);
    expect(I.catalogList({ query: 'Morrison' }).some(d => d.id === 'stegosaurus')).toBe(true);
  });
  it('makes all curated period and diet filters available, including insectivores', () => {
    document.body.innerHTML = renderTab({ tab: 'explore' });
    const labels = [...document.querySelectorAll('select option')].map(n => n.textContent);
    expect(labels).toContain('Permian'); expect(labels).toContain('Insectivore');
    for (const dn of internals().DINOS) {
      expect(internals().catalogList({ query: dn.name, filterPeriod: dn.period, filterDiet: dn.diet }).map(d => d.id)).toContain(dn.id);
    }
  });
  it('recovers from no results and resets pagination when searching', async () => {
    await mount({ tab: 'explore', catalogPage: 4 });
    await fill(host.querySelector('input[type=search]'), 'nothingmatcheszz');
    expect(data.catalogPage).toBe(0);
    expect(host.textContent).toContain('No specimens match yet');
    expect(button('Surprise me').disabled).toBe(true);
    await click(button('Show all specimens'));
    expect(host.querySelectorAll('[data-dino-card]')).toHaveLength(24);
  });
  it('saves and removes specimens without destroying their notes', async () => {
    await mount({ tab: 'explore', selected: 'tyrannosaurus', notebook: { tyrannosaurus: { question: 'Why small arms?' } } });
    await click(button('Save specimen'));
    await click(button('Saved (1)'));
    expect(host.querySelectorAll('[data-dino-card]')).toHaveLength(1);
    await click(button('Saved to collection'));
    expect(host.querySelectorAll('[data-dino-card]')).toHaveLength(0);
    expect(data.notebook.tyrannosaurus.question).toBe('Why small arms?');
  });
  it('Surprise me stays inside current filters and marks its choice explored', async () => {
    await mount({ tab: 'explore', query: 'Morrison', filterDiet: 'herbivore' });
    await click(button('Surprise me'));
    const dn = internals().byId(data.selected);
    expect(dn.formation).toMatch(/Morrison/); expect(dn.diet).toBe('herbivore');
    expect(data.seen[dn.id]).toBe(true);
  });
  it('retains separate notes across specimen and tab changes, including typed spaces', async () => {
    await mount({ tab: 'explore', selected: 'tyrannosaurus' });
    await click(button('Write a field note'));
    await fill(host.querySelector('#dino-note-question'), 'Why ');
    await fill(host.querySelector('#dino-note-observation'), '<img src=x onerror=alert(1)> curved teeth');
    expect(data.notebook.tyrannosaurus.question).toBe('Why ');
    const select = host.querySelector('select');
    await api.React.act(async () => { select.value = 'microraptor'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(host.querySelector('#dino-note-question').value).toBe('');
    await fill(host.querySelector('#dino-note-question'), 'How did it glide?');
    expect(host.querySelector('#dinotab-compare'), JSON.stringify(data) + '\n' + host.innerHTML.slice(0,1000)).not.toBeNull();
    await click(host.querySelector('#dinotab-compare'));
    await click(host.querySelector('#dinotab-notes'));
    expect(host.querySelector('#dino-note-question').value).toBe('How did it glide?');
    expect(data.notebook.tyrannosaurus.observation).toContain('<img');
    expect(host.querySelector('img')).toBeNull();
    const roundTrip = JSON.parse(JSON.stringify(data));
    expect(internals().notebookMap(roundTrip.notebook).microraptor.question).toBe('How did it glide?');
  });
  it('normalizes malformed saved maps and bounds imported note text', () => {
    const I = internals();
    expect(I.specimenMap({ missing: true, tyrannosaurus: 'yes', microraptor: true })).toEqual({ microraptor: true });
    expect(I.notebookMap([1, 2])).toEqual({});
    const safe = I.notebookMap({ missing: { question: 'no' }, tyrannosaurus: { question: 'x'.repeat(3000), inference: {} }, microraptor: null });
    expect(Object.keys(safe)).toEqual(['tyrannosaurus']);
    expect(safe.tyrannosaurus.question).toHaveLength(2000);
    expect(safe.tyrannosaurus.inference).toBe('');
  });
  it('exports every written specimen with catalog evidence and student interpretations separated', () => {
    const I = internals();
    const text = I.notebookText(I.notebookMap({ tyrannosaurus: { question: 'Why?', observation: 'Teeth' }, microraptor: { inference: 'A gliding hypothesis' } }));
    expect(text).toContain('Tyrannosaurus rex'); expect(text).toContain('Microraptor gui');
    expect(text).toContain('Catalog evidence:'); expect(text).toContain('Catalog uncertainty:');
    expect(text).toContain('My explanation:\nA gliding hypothesis');
  });
  it('keeps exact positive small masses and treats absent speed estimates as unknown', () => {
    document.body.innerHTML = renderTab({ tab: 'compare', compareA: 'microraptor', compareB: 'argentinosaurus' });
    const massBars = document.querySelectorAll('[aria-label="Mass comparison value"]');
    expect(massBars[0].getAttribute('aria-valuenow')).toBe('1');
    expect(document.body.textContent).toContain('1 kg');
    expect(document.body.textContent).toContain('Not estimated');
    expect(document.querySelectorAll('[aria-label="Top speed estimate comparison value"]')).toHaveLength(1);
  });
  it('changes mass scale and swaps specimens without losing notebook data', async () => {
    await mount({ tab: 'compare', compareA: 'microraptor', compareB: 'argentinosaurus', notebook: { microraptor: { question: 'Wings?' } } });
    await click(button('Linear'));
    expect(host.querySelector('[aria-label="Mass comparison value"]').getAttribute('aria-valuetext')).not.toContain('logarithmic');
    await click(button('Swap specimens'));
    expect(data.compareA).toBe('argentinosaurus'); expect(data.compareB).toBe('microraptor');
    expect(data.notebook.microraptor.question).toBe('Wings?');
  });
  it('explains same-species comparisons, non-overlap, and limits of overlap', () => {
    expect(renderTab({ tab: 'compare', compareA: 'tyrannosaurus', compareB: 'tyrannosaurus' })).toContain('same species twice');
    expect(renderTab({ tab: 'compare', compareA: 'tyrannosaurus', compareB: 'stegosaurus' })).toContain('do not overlap');
    expect(renderTab({ tab: 'compare', compareA: 'tyrannosaurus', compareB: 'triceratops' })).toContain('do not prove these animals met');
  });
  it('corrects the deep-time relationship and quiz score denominator', () => {
    expect(renderTab({ tab: 'timeline' })).toContain('Tyrannosaurus (about 66 million years ago) lived closer in time to you');
    expect(renderTab({ tab: 'explore', quizCorrect: 7, quizDone: 9 })).toContain('7/9');
  });
});
