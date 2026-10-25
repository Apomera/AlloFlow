import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
afterEach(() => { mounts.splice(0).forEach(({ root, host }) => { act(() => root.unmount()); host.remove(); }); vi.restoreAllMocks(); });
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const match = find(child, predicate); if (match) return match; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
async function mount(patch = {}) {
  resetStemLab();
  const tool = loadTool(process.env.AQUARIUM_SOURCE || 'stem_lab/stem_tool_aquarium.js', 'aquarium');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), store = newStore(); mounts.push({ root, host });
  let state, update, tree;
  function Harness() {
    const [data, setData] = React.useState({ _aquarium: {
      mode: 'designer', selectedTank: 'freshwater', soundEnabled: false, simRunning: false,
      tutorialDismissed: true, fishIdentityVersion: 3, tankFish: [], fishInstanceIds: [], nextFishInstanceId: 1,
      tankPlants: [], equipment: {}, habitatLayout: [{ id: 'keep-rock', type: 'rock', x: 2, z: -1 }],
      waterChem: { temp: 76, pH: 7, ammonia: 0, nitrite: 0, nitrate: 10, salinity: 0, dissolvedO2: 7, co2: 3 },
      coins: 42, observationNotes: 'Keep my observation.', ...patch
    } });
    state = data._aquarium; update = values => setData(old => ({ ...old, _aquarium: { ...old._aquarium, ...values } }));
    tree = tool.render(makeCtx({ toolData: data, setToolData: setData }, store));
    return React.createElement('div', null, tree, React.createElement('button', { 'data-unrelated-control': true }, 'Another control'));
  }
  await act(async () => root.render(React.createElement(Harness)));
  return { host, state: () => state, tree: () => tree, update: values => act(async () => update(values)), updateNow: values => update(values),
    catalog: key => host.querySelector('[data-aquarium-designer-catalog="' + key + '"]'),
    quantity: key => host.querySelector('[data-aquarium-designer-quantity="' + key + '"]'),
    status: () => host.querySelector('[data-aquarium-designer-status]') };
}
async function click(control) { await act(async () => { control.focus(); control.click(); }); }
function unchanged(t) {
  expect(t.state().coins).toBe(42); expect(t.state().observationNotes).toBe('Keep my observation.');
  expect(t.state().habitatLayout).toEqual([{ id: 'keep-rock', type: 'rock', x: 2, z: -1 }]);
}

describe('Aquarium Tank Designer accessible quantities', () => {
  it('names individual species controls, keeps catalog focus, and reports the resulting quantity', async () => {
    const t = await mount(), catalog = t.catalog('fish:neon-tetra'), status = t.status();
    expect(status.textContent).toBe(''); expect(status.getAttribute('role')).toBe('status');
    await click(catalog);
    expect(document.activeElement).toBe(catalog); expect(t.state().designerStock).toEqual([{ id: 'neon-tetra', qty: 1 }]);
    expect(t.quantity('fish:neon-tetra:add').getAttribute('aria-label')).toBe('Add one: Neon Tetra');
    expect(t.quantity('fish:neon-tetra:remove').getAttribute('aria-label')).toBe('Remove one: Neon Tetra');
    expect(t.status()).toBe(status); expect(status.textContent).toBe('Neon Tetra: Quantity 1.');
    await click(t.quantity('fish:neon-tetra:add'));
    expect(t.state().designerStock[0].qty).toBe(2); expect(status.textContent).toBe('Neon Tetra: Quantity 2.');
    unchanged(t);
  });

  it.each([
    { kind: 'fish', id: 'neon-tetra', name: 'Neon Tetra', field: 'designerStock', picker: 'fish' },
    { kind: 'plant', id: 'anubias-nana', name: 'Anubias nana', field: 'designerPlants', picker: 'plants' }
  ])('restores catalog focus after removing the last $kind', async ({ kind, id, name, field, picker }) => {
    const t = await mount({ [field]: [{ id, qty: 1 }], designerPicker: picker });
    const catalog = t.catalog(kind + ':' + id), status = t.status();
    await click(t.quantity(kind + ':' + id + ':remove'));
    expect(t.state()[field]).toEqual([]); expect(t.quantity(kind + ':' + id + ':remove')).toBeNull();
    expect(document.activeElement).toBe(catalog); expect(status.textContent).toBe(name + ': Quantity 0.');
    unchanged(t);
  });

  it('retains the decrement control while quantity remains above zero', async () => {
    const t = await mount({ designerStock: [{ id: 'neon-tetra', qty: 2 }] }), remove = t.quantity('fish:neon-tetra:remove');
    await click(remove);
    expect(t.state().designerStock[0].qty).toBe(1); expect(document.activeElement).toBe(remove);
    expect(t.quantity('fish:neon-tetra:remove')).toBe(remove);
  });

  it('uses the stock heading when the species catalog entry is filtered out', async () => {
    const t = await mount({ designerStock: [{ id: 'neon-tetra', qty: 1 }], designerCareFilter: 'advanced' });
    expect(t.catalog('fish:neon-tetra')).toBeNull();
    await click(t.quantity('fish:neon-tetra:remove'));
    expect(document.activeElement).toBe(t.host.querySelector('[data-aquarium-designer-stock-title]'));
  });

  it('respects another focus owner or mode change before removal commits', async () => {
    const t = await mount({ designerStock: [{ id: 'neon-tetra', qty: 1 }] }), other = t.host.querySelector('[data-unrelated-control]');
    await act(async () => { const remove = t.quantity('fish:neon-tetra:remove'); remove.focus(); remove.click(); other.focus(); });
    expect(document.activeElement).toBe(other);
    await t.update({ designerStock: [{ id: 'neon-tetra', qty: 1 }] });
    await act(async () => { const remove = t.quantity('fish:neon-tetra:remove'); remove.focus(); remove.click(); t.updateNow({ mode: 'stressHunt' }); });
    expect(t.host.querySelector('[data-aquarium-designer-stock-title]')).toBeNull(); expect(document.activeElement).toBe(document.body);
  });

  it('clears both collections with persistent feedback and leaves the clear action focused', async () => {
    const t = await mount({ designerStock: [{ id: 'neon-tetra', qty: 2 }], designerPlants: [{ id: 'anubias-nana', qty: 3 }] });
    const clear = [...t.host.querySelectorAll('[data-aquarium-designer] button')].find(n => n.textContent.includes('Clear all'));
    await click(clear);
    expect(t.state().designerStock).toEqual([]); expect(t.state().designerPlants).toEqual([]);
    expect(document.activeElement).toBe(clear); expect(t.status().textContent).toBe('Stocking cleared.'); unchanged(t);
  });
});

describe('Aquarium Stress Lab learning controls', () => {
  it('keeps a native prompts summary present and focused while opening and closing', async () => {
    const t = await mount({ mode: 'stressHunt' }), detail = t.host.querySelector('[data-aquarium-stress-prompts]'), summary = detail.querySelector('summary');
    expect(detail.open).toBe(false); summary.focus();
    await act(async () => { detail.open = true; detail.dispatchEvent(new Event('toggle')); });
    expect(t.state().stressHunt.stuckRevealed).toBe(true); expect(document.activeElement).toBe(summary);
    expect(detail.textContent).toContain('How does temperature change NH₃ toxicity?');
    await act(async () => { detail.open = false; detail.dispatchEvent(new Event('toggle')); });
    expect(t.state().stressHunt.stuckRevealed).toBe(false); expect(document.activeElement).toBe(summary);
  });

  it('provides stable labels and unit values and preserves written work when sliders change', async () => {
    const iq = { ammonia: 0.1, nitrite: 0, tempC: 25, hypothesis: 'I am comparing ammonia.', understood: true, explanation: 'Bacteria convert waste.', log: [] };
    const t = await mount({ mode: 'stressHunt', stressHunt: iq });
    const fields = [...t.host.querySelectorAll('[data-aquarium-stress-field]')];
    expect(fields.map(n => n.labels[0].textContent)).toEqual(['Water toxicity hypothesis', 'Nitrogen cycle explanation']);
    fields.forEach(n => { expect(n.getAttribute('aria-label')).toBeNull(); expect(n.labels[0].htmlFor).toBe(n.id); });
    const ammonia = t.host.querySelector('[data-aquarium-stress-param="ammonia"]'), label = ammonia.labels[0].textContent, id = ammonia.id;
    expect(ammonia.getAttribute('aria-valuetext')).toBe('0.1 ppm');
    await act(async () => find(t.tree(), n => n.props?.['data-aquarium-stress-param'] === 'ammonia').props.onChange({ target: { value: '0' } }));
    expect(ammonia.id).toBe(id); expect(ammonia.labels[0].textContent).toBe(label); expect(ammonia.getAttribute('aria-valuetext')).toBe('0 ppm');
    expect(t.state().stressHunt).toMatchObject({ ammonia: 0, hypothesis: iq.hypothesis, explanation: iq.explanation });
    expect(t.host.querySelector('[data-aquarium-stress-lab] [role="status"]').textContent).toContain('Healthy');
    expect(t.host.querySelector('[data-aquarium-stress-param="tempC"]').getAttribute('aria-valuetext')).toBe('25 °C'); unchanged(t);
  });

  it('keeps unique field associations across instances and mode transitions', async () => {
    const a = await mount({ mode: 'stressHunt', stressHunt: { ammonia: 0, nitrite: 0, tempC: 25, understood: true } });
    const b = await mount({ mode: 'stressHunt', stressHunt: { ammonia: 0, nitrite: 0, tempC: 25, understood: true } });
    const fields = [...a.host.querySelectorAll('[data-aquarium-stress-param],[data-aquarium-stress-field]'), ...b.host.querySelectorAll('[data-aquarium-stress-param],[data-aquarium-stress-field]')];
    expect(new Set(fields.map(n => n.id)).size).toBe(10);
    fields.forEach(n => expect(n.labels[0].htmlFor).toBe(n.id));
    const oldId = a.host.querySelector('[data-aquarium-stress-field="hypothesis"]').id;
    await a.update({ mode: 'designer' }); await a.update({ mode: 'stressHunt' });
    expect(a.host.querySelector('[data-aquarium-stress-field="hypothesis"]').id).toBe(oldId);
  });
});
