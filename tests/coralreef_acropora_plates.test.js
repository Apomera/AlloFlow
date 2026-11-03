import { beforeEach, afterEach, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, host, data;
const find = selector => host.querySelector(selector);
async function click(node) { await React.act(async () => node.click()); }
async function change(node, value) {
  await React.act(async () => {
    const isInput = node instanceof HTMLInputElement;
    const prototype = isInput ? HTMLInputElement.prototype : HTMLSelectElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event(isInput ? 'input' : 'change', {bubbles:true}));
  });
}
beforeEach(async () => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_coralreef.js', 'coralReef');
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function Shell() {
    const [state, setState] = React.useState({coralReef:{section:'guide',speciesLog:{clownfish:{firstSeen:1}}}});
    data = state.coralReef;
    return window.StemLab._registry.coralReef.render({React, toolData:state, setToolData:setState, t:(key, fallback)=>fallback, reduceMotion:true});
  }
  await React.act(async () => root.render(React.createElement(Shell)));
});
afterEach(async () => { await React.act(async () => root.unmount()); host.remove(); });

it('finds plates by scientific name and field marks, and respects the guide filters', async () => {
  const input = find('input[type=search]');
  await change(input, 'Acropora humilis');
  expect(find('[data-guide-result-count]').textContent).toContain('Showing 1 of 3.');
  expect(find('[data-acropora-species]').dataset.acroporaSpecies).toBe('humilis');
  expect(host.textContent).not.toContain('Nothing here matches');
  await change(input, 'scale-like appearance');
  expect(find('[data-acropora-shelf]')).toBeNull();
  await change(find('[data-guide-search-mode]'), 'description');
  expect(find('[data-acropora-species]').dataset.acroporaSpecies).toBe('millepora');
  await change(find('[data-guide-group-filter]'), 'fish'); expect(find('[data-acropora-shelf]')).toBeNull();
  await change(find('[data-guide-group-filter]'), 'coral');
  expect(find('[data-acropora-species]')).toBeTruthy();
  await click(find('[data-guide-collection=saved]')); expect(find('[data-acropora-shelf]')).toBeNull();
});

it('renders three named, sourced plates on request and zooms each independently', async () => {
  const records = JSON.stringify(data);
  expect(find('[data-acropora-species]')).toBeNull();
  const details = find('[data-acropora-shelf] details');
  await React.act(async () => { details.open=true; details.dispatchEvent(new Event('toggle')); });
  const cards = [...host.querySelectorAll('[data-acropora-species]')];
  expect(cards.map(card=>card.dataset.acroporaSpecies)).toEqual(['humilis','millepora','clathrata']);
  const frames = cards.map(card=>card.querySelector('svg').getAttribute('viewBox'));
  for (const card of cards) {
    const sources = [...card.querySelectorAll('a')].map(link=>link.href);
    expect(sources.some(url=>url.includes('acropora-'+card.dataset.acroporaSpecies+'/'))).toBe(true);
    expect(card.querySelectorAll('dd[lang=en]').length).toBeGreaterThanOrEqual(2);
    expect(card.querySelector('q')).toBeNull(); // Original accounts are not source quotations.
    if (card.dataset.acroporaSpecies === 'clathrata') expect(sources).toContain('https://creativecommons.org/licenses/by/4.0/');
  }
  const control = cards[2].querySelector('button'); control.focus(); await click(control);
  expect(document.activeElement).toBe(control);
  expect(cards[2].querySelector('svg').getAttribute('viewBox')).not.toBe(frames[2]);
  expect(cards[0].querySelector('svg').getAttribute('viewBox')).toBe(frames[0]);
  await click(control); expect(cards[2].querySelector('svg').getAttribute('viewBox')).toBe(frames[2]);
  expect(JSON.stringify(data)).toBe(records);
});

it('reads a cited dive entry and returns to the exact plate without recording a sighting', async()=>{
  await change(find('input[type=search]'),'Acropora clathrata');
  const original = JSON.stringify(data.speciesLog);
  await click(find('[data-plate-observe=clathrata]'));
  const reference = find('[data-dive-reference=acropora_clathrata]');
  await React.act(async()=>{reference.open=true;reference.dispatchEvent(new Event('toggle'));});
  expect(reference.querySelector('article').textContent).toContain('Western Australian Museum');
  expect(reference.querySelector('a[href="https://creativecommons.org/licenses/by/4.0/"]')).toBeTruthy();
  await click(find('[data-observation-return]')); await click(find('[data-close-profile]'));
  expect(document.activeElement).toBe(find('[data-plate-observe=clathrata]'));
  expect(find('input[type=search]').value).toBe('Acropora clathrata');
  expect(JSON.stringify(data.speciesLog)).toBe(original);
});
