import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupDinoLab, renderTab, internals } from './helpers/dino_lab_harness.js';

const src = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');
const fn = src.match(/function ecoTimeSlice\([\s\S]*?\n  }/);
if (!fn) throw Error('ecoTimeSlice missing');
const sliceFor = new Function('return (' + fn[0] + ')')();
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
let api, root, host, data;
beforeAll(() => { api = setupDinoLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(async () => { if (root) await api.React.act(async () => root.unmount()); root = null; host?.remove(); });
const records = formation => internals().DINOS.filter(animal => animal.formation === formation && animal.group !== 'other');
const at = (formation, age) => sliceFor(records(formation), { formation, age, scope: 'slice' }, formation);

describe('catalog range time slice', () => {
  it.each([
    ['Cedar Mountain', 130, ['utahraptor', 'falcarius']],
    ['Cedar Mountain', 132.5, ['utahraptor']],
    ['Cedar Mountain', 115, []],
    ['Cedar Mountain', 100, ['eolambia']],
    ['Hell Creek', 72, ['edmontosaurus']],
  ])('filters %s at %s Ma inclusively', (formation, age, ids) => {
    expect(at(formation, age).matches.map(animal => animal.id).sort()).toEqual(ids.sort());
  });
  it('keeps endpoint membership and full records independent of chosen age', () => {
    expect(at('Djadochta', 75).matches).toHaveLength(12);
    expect(at('Djadochta', 75.1).matches).toHaveLength(4);
    expect(at('Djadochta', 74.9).matches).toHaveLength(8);
    expect(at('Hell Creek', 66).matches).toHaveLength(12);
    expect(at('Hell Creek', 68).matches).toHaveLength(11);
    expect(at('Cedar Mountain', 115).all).toHaveLength(5);
  });
  it('normalizes bad restored input and resets foreign-formation dates', () => {
    const list = records('Cedar Mountain');
    for (const raw of [null, [], 42, { formation: 'Cedar Mountain', age: NaN }, { formation: 'Cedar Mountain', age: Infinity }, { formation: 'Cedar Mountain', age: '130' }, { formation: 'Morrison', age: 150 }]) {
      const q = sliceFor(list, raw, 'Cedar Mountain');
      expect(q.age).toBe(115.5); expect(q.scope).toBe('all');
    }
    expect(at('Cedar Mountain', -10).age).toBe(96);
    expect(at('Cedar Mountain', 300).age).toBe(135);
    expect(sliceFor([{ id: 'point', myaLo: 73, myaHi: 73 }], null, 'Point')).toMatchObject({ age: 73, span: 0, matches: [{ id: 'point', myaLo: 73, myaHi: 73 }] });
    expect(sliceFor([{ myaLo: 5, myaHi: 2 }, { myaLo: NaN, myaHi: 4 }], null, 'bad')).toMatchObject({ age: 0, lo: 0, hi: 0, matches: [] });
  });
  it('shows catalog limits and a gap without claiming an absent community', () => {
    const html = renderTab({ tab: 'ecosystem', ecoOpen: 'Cedar Mountain', ecoTime: { formation: 'Cedar Mountain', age: 115, scope: 'slice' } });
    expect(html).toContain('data-eco-empty');
    expect(html).toContain('this filter does not date a local fossil occurrence');
    expect(html).toContain('the fossil record and this catalog are incomplete');
    expect(html).not.toContain('data-eco-species=');
    expect((html.match(/data-eco-range=/g) || [])).toHaveLength(5);
    expect(html).toContain('not measurements of this formation');
  });
});

async function mount(initial) {
  document.body.innerHTML = ''; data = initial;
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  const render = () => root.render(api.tool.cfg.render({ React: api.React, toolData: { dinoLab: data }, updateMulti: (_, patch) => { data = { ...data, ...patch }; render(); }, announceToSR() {} }));
  await api.React.act(async () => render());
}
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent === text);
const click = async text => { const node = button(text); expect(node).toBeTruthy(); await api.React.act(async () => node.click()); };
async function choose(id, value) {
  await api.React.act(async () => {
    const node = host.querySelector('#' + id); node.value = value;
    node.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('ecosystem investigation actions', () => {
  it('retains a chosen slice across tabs, clamps movement, and switches formation safely', async () => {
    await mount({ tab: 'ecosystem', notebook: { microraptor: { question: 'How did it glide?' } } });
    await click('Time puzzle: one formation, different chapters');
    expect(data.ecoTime).toMatchObject({ formation: 'Cedar Mountain', age: 132.5, scope: 'slice' });
    expect([...host.querySelectorAll('[data-eco-species]')].map(n => n.dataset.ecoSpecies)).toEqual(['utahraptor']);
    await click('1 million years younger'); expect(data.ecoTime.age).toBe(131.5);
    await click('1 million years older'); expect(data.ecoTime.age).toBe(132.5);
    await api.React.act(async () => host.querySelector('[data-eco-range=eolambia]').click());
    expect(data.ecoTime.age).toBe(98); expect(host.querySelector('[data-eco-species=eolambia]')).toBeTruthy();
    await click('Whole formation record'); expect(host.querySelectorAll('[data-eco-species]')).toHaveLength(5);
    await choose('dino-eco-formation', 'Hell Creek');
    expect(host.querySelector('#dino-eco-age').getAttribute('aria-valuetext')).toContain('69.5 million years ago');
    expect(host.querySelectorAll('[data-eco-species]')).toHaveLength(12);
    await choose('dino-eco-formation', 'Cedar Mountain');
    expect(data.ecoTime.age).toBe(98);
    expect(data.notebook.microraptor.question).toBe('How did it glide?');
  });
  it('compares chosen species and refuses a same-species contrast', async () => {
    await mount({ tab: 'ecosystem', ecoOpen: 'Cedar Mountain' });
    await choose('dino-eco-pair-a', 'utahraptor'); await choose('dino-eco-pair-b', 'utahraptor');
    expect(button('Compare these records').disabled).toBe(true);
    await choose('dino-eco-pair-b', 'eolambia');
    expect(host.textContent).toContain('30 million years');
    await click('Compare these records');
    expect(data).toMatchObject({ tab: 'compare', compareA: 'utahraptor', compareB: 'eolambia' });
  });
});
