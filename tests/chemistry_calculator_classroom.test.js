import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab, makeCtx, newStore } from './helpers/stem_widgets_smoke_harness.js';

let tool;
beforeEach(() => {
  resetStemLab();
  tool = loadTool('stem_lab/stem_tool_chembalance.js', 'chemBalance');
});
const api = () => window.__alloChemPure;
function view(data = {}) {
  const el = document.createElement('div');
  el.innerHTML = renderTool('chemBalance', { chemBalance: { subtool: 'stoich', _everPicked: true, ...data } });
  return el;
}
function yieldState(data = {}) {
  return { _yieldInput: 'N2 + H2 -> NH3', _yieldResult: api().balanceEquation('N2 + H2 -> NH3'), _yieldGrams: { 0: '28.014', 1: '6.048' }, ...data };
}
function inputs(el) {
  return [el.querySelector('[aria-label="Grams to convert to moles"]'), el.querySelector('[aria-label="Moles to convert to grams"]')];
}
// Walk the real React tree to invoke a control handler and render the resulting store.
function controls(store) {
  const found = [];
  function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || !node.props) return;
    if (typeof node.type === 'string') found.push(node);
    walk(node.props.children);
  }
  walk(tool.render(makeCtx({}, store)));
  return found;
}

describe('Chemistry calculator classroom regressions', () => {
  it('counts each addition-compound multiplier independently', () => {
    const result = api().parseFormula('Na2CO3·2NaHCO3·2H2O');
    expect(result.elems).toEqual({ Na: 4, C: 3, H: 6, O: 11 });
    // 4(22.990) + 3(12.011) + 6(1.008) + 11(15.999) = 310.030 g/mol.
    expect(result.mass).toBeCloseTo(310.030, 3);
    expect(view({ _stoichFormula: 'Na2CO3·2NaHCO3·2H2O' }).textContent).toContain('310.030');
    expect(api().parseFormula('Na2CO3.2NaHCO3.2H2O')).toEqual(result);
  });
  it('balances an equation containing multiple addition segments', () => {
    const r = api().balanceEquation('Na2CO3·2NaHCO3·2H2O -> Na2CO3 + CO2 + H2O');
    expect(r.ok).toBe(true);
    expect(r.coefficients).toEqual([1, 2, 1, 3]);
  });
  it('allows clearing the formula rather than silently restoring water', () => {
    const el = view({ _stoichFormula: '' });
    expect(el.querySelector('[aria-label="Chemical formula input"]').value).toBe('');
    expect(el.querySelector('[aria-label="Molar mass result"]')).toBeNull();
    expect(el.textContent).toContain('Formula is empty');
  });
  it('rejects subscripts beyond safe integer precision', () => {
    expect(view({ _stoichFormula: 'H9007199254740992' }).querySelector('[role="alert"]')).toBeTruthy();
  });
  it('recalculates moles from the current formula even with stale saved counterpart', () => {
    const [grams,moles] = inputs(view({ _stoichFormula: 'CO2', _stoichGrams: '44.009', _stoichMoles: '2.44291' }));
    expect(grams.value).toBe('44.009');
    expect(moles.value).toBe('1');
  });
  it('preserves moles as the source when that was the last edited unit', () => {
    const [grams,moles] = inputs(view({ _stoichFormula: 'CO2', _stoichUnit: 'moles', _stoichMoles: '2', _stoichGrams: '36.03' }));
    expect(grams.value).toBe('88.018');
    expect(moles.value).toBe('2');
  });
  it('does not round small nonzero conversions to zero', () => {
    const [,moles] = inputs(view({ _stoichFormula: 'H2O', _stoichGrams: '0.000001' }));
    expect(Number(moles.value)).toBeCloseTo(1e-6 / 18.015, 14);
    expect(Number(moles.value)).toBeGreaterThan(0);
  });
  it.each(['-1', 'Infinity', 'nope'])('rejects invalid conversion amount %s with accessible feedback', (raw) => {
    const el = view({ _stoichGrams: raw });
    const [grams,moles] = inputs(el);
    expect(grams.getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('#chem-conversion-error').getAttribute('role')).toBe('alert');
    expect(moles.value).toBe('');
    expect(el.textContent).not.toMatch(/= (NaN|Infinity|-)\d*/);
  });
  it('clears both directions when the last edited amount is cleared', () => {
    const store = newStore({ chemBalance: { subtool: 'stoich', _everPicked: true, _stoichGrams: '18.015', _stoichMoles: '1' } });
    controls(store).find(n => n.props['aria-label'] === 'Grams to convert to moles').props.onChange({ target: { value: '' } });
    const el = view(store.toolData.chemBalance);
    expect(inputs(el).map(n => n.value)).toEqual(['', '']);
  });
  it('removes old reactant amounts and results immediately when the reaction changes', () => {
    const store = newStore({ chemBalance: { subtool: 'stoich', _everPicked: true, ...yieldState({ _yieldActual: '17' }) } });
    expect(view(store.toolData.chemBalance).textContent).toContain('Theoretical yield');
    controls(store).find(n => n.props['aria-label'] === 'Reaction for the yield calculator').props.onChange({ target: { value: 'H2 + O2 -> H2O' } });
    const el = view(store.toolData.chemBalance);
    expect(el.textContent).not.toContain('Theoretical yield');
    expect(store.toolData.chemBalance._yieldGrams).toEqual({});
    expect(store.toolData.chemBalance._yieldActual).toBe('');
    controls(store).find(n => n.type === 'button' && n.props.children === 'Set up').props.onClick();
    expect(view(store.toolData.chemBalance).querySelector('[aria-label="O2 grams available"]')).toBeTruthy();
    expect(view(store.toolData.chemBalance).textContent).not.toContain('Theoretical yield');
  });
  it.each(['-2', 'Infinity', 'not a number'])('rejects invalid actual yield %s', (raw) => {
    const el = view(yieldState({ _yieldActual: raw }));
    expect(el.querySelector('[role="alert"]').textContent).toMatch(/finite, non-negative actual yield/);
    expect(el.textContent).not.toContain('Percent yield:');
  });
  it('rejects infinite reactant amounts in calculations and the rendered form', () => {
    const b = api().balanceEquation('N2 + H2 -> NH3');
    expect(api().stoichiometry({ ...b, given: [{ index: 0, moles: Infinity }], productIndex: 2 }).error).toMatch(/valid amount/);
    expect(view(yieldState({ _yieldGrams: { 0: 'Infinity', 1: '6' } })).querySelector('[role="alert"]').textContent).toMatch(/valid amount/);
  });
  it('identifies stoichiometric ties instead of arbitrarily naming one limiting reagent', () => {
    const el = view(yieldState());
    expect(el.textContent).toContain('Limiting reagent: N2, H2');
    expect(el.textContent).toContain('used up together');
  });
  it('keeps a measured yield above 100 percent visible and explains checking it', () => {
    const el = view(yieldState({ _yieldActual: '68.124' }));
    expect(el.textContent).toContain('Percent yield: 200.0%');
    expect(el.textContent).toContain('exceeds the theoretical yield');
  });
  it('explains why percent yield cannot be computed with zero theoretical yield', () => {
    const el = view(yieldState({ _yieldGrams: { 0: 0, 1: '6.048' }, _yieldActual: 0 }));
    expect(el.querySelector('[aria-label="N2 grams available"]').value).toBe('0');
    expect(el.querySelector('[aria-label="Actual grams produced"]').value).toBe('0');
    expect(el.textContent).toContain('theoretical yield is zero');
    expect(el.textContent).not.toContain('Percent yield:');
  });
  it('clears a calculated balance when its equation is edited', () => {
    const store = newStore({ chemBalance: { subtool: 'balance', _everPicked: true, _balanceInput: 'H2 + O2 -> H2O', _balanceResult: api().balanceEquation('H2 + O2 -> H2O') } });
    controls(store).find(n => n.props['aria-label'] === 'Equation to balance').props.onChange({ target: { value: 'N2 + H2 -> NH3' } });
    expect(store.toolData.chemBalance._balanceResult).toBeNull();
    expect(store.toolData.chemBalance._balanceInput).toBe('N2 + H2 -> NH3');
  });
  it('labels which product is being calculated in a multi-product reaction', () => {
    const b = api().balanceEquation('CH4 + O2 -> CO2 + H2O');
    expect(view({ _yieldInput: 'CH4 + O2 -> CO2 + H2O', _yieldResult: b }).textContent).toContain('Calculating yield for: CO2');
  });
});

function combustion(data = {}) {
  return { _yieldInput: 'CH4 + O2 -> CO2 + H2O', _yieldResult: api().balanceEquation('CH4 + O2 -> CO2 + H2O'), _yieldGrams: { 0: '16.043', 1: '63.996' }, ...data };
}

describe('Product-specific chemistry yields', () => {
  it('offers only products, with a visible associated label', () => {
    const el = view(combustion());
    const select = el.querySelector('#chem-yield-product');
    expect(select.labels[0].textContent).toBe('Product to calculate');
    expect([...select.options].map(o => [o.value, o.textContent])).toEqual([['2', 'CO2'], ['3', 'H2O']]);
    expect(select.value).toBe('2');
    expect(el.querySelector('[aria-label="Actual grams produced"]').getAttribute('aria-describedby')).toBe('chem-yield-product-help');
  });
  it('uses the selected product coefficient and molar mass in the yield result', () => {
    const el = view(combustion({ _yieldProductIndex: 3, _yieldActual: '18.015' }));
    expect(el.textContent).toContain('Theoretical yield: 36.03 g H2O (2 mol)');
    expect(el.textContent).toContain('Percent yield: 50.0%');
    expect(el.textContent).toContain('Calculating yield for: H2O');
    expect(el.textContent).not.toContain('first product');
    expect([...el.querySelectorAll('[role="status"]')].some(n => n.textContent.includes('36.03 g H2O'))).toBe(true);
  });
  it('preserves reactants and clears the measured yield when changing products', () => {
    const store = newStore({ chemBalance: { subtool: 'stoich', _everPicked: true, ...combustion({ _yieldActual: '22.0045' }) } });
    controls(store).find(n => n.props.id === 'chem-yield-product').props.onChange({ target: { value: '3' } });
    expect(store.toolData.chemBalance._yieldGrams).toEqual({ 0: '16.043', 1: '63.996' });
    expect(store.toolData.chemBalance._yieldActual).toBe('');
    const el = view(store.toolData.chemBalance);
    expect(el.textContent).toContain('36.03 g H2O');
    expect(el.textContent).not.toContain('Percent yield:');
  });
  it('resets product selection when the reaction changes', () => {
    const store = newStore({ chemBalance: { subtool: 'stoich', _everPicked: true, ...combustion({ _yieldProductIndex: 3 }) } });
    controls(store).find(n => n.props['aria-label'] === 'Reaction for the yield calculator').props.onChange({ target: { value: 'N2 + H2 -> NH3' } });
    controls(store).find(n => n.type === 'button' && n.props.children === 'Set up').props.onClick();
    expect(store.toolData.chemBalance._yieldProductIndex).toBeNull();
    expect(view(store.toolData.chemBalance).querySelector('#chem-yield-product').value).toBe('2');
  });
  it.each([-1, 0, 99, 2.5])('recovers from unavailable saved product %s without reusing its measured yield', (choice) => {
    const el = view(combustion({ _yieldProductIndex: choice, _yieldActual: '18' }));
    expect(el.querySelector('#chem-yield-product').value).toBe('2');
    expect(el.querySelector('[aria-label="Actual grams produced"]').value).toBe('');
    expect(el.textContent).not.toContain('Percent yield:');
    expect(el.textContent).toContain('saved product choice is unavailable');
  });
  it('allows entering a fresh measurement after recovery', () => {
    const store = newStore({ chemBalance: { subtool: 'stoich', _everPicked: true, ...combustion({ _yieldProductIndex: 99, _yieldActual: '18' }) } });
    controls(store).find(n => n.props['aria-label'] === 'Actual grams produced').props.onChange({ target: { value: '44.009' } });
    expect(store.toolData.chemBalance._yieldProductIndex).toBe(2);
    expect(view(store.toolData.chemBalance).textContent).toContain('Percent yield: 100.0%');
  });
  it('names the missing reactants and treats an entered zero as an amount', () => {
    const el = view(combustion({ _yieldGrams: { 0: 0 } }));
    expect(el.textContent).toContain('Enter grams for: O2.');
    expect(el.textContent).not.toContain('Enter grams for: CH4');
    expect(el.textContent).not.toContain('Theoretical yield:');
  });
  it('explains the limiting comparison using the selected product mole ratios', () => {
    const el = view(combustion({ _yieldProductIndex: 3, _yieldGrams: { 0: '16.043', 1: '31.998' } }));
    const details = [...el.querySelectorAll('details')].find(n => n.querySelector('summary')?.textContent === 'How this was calculated');
    expect(details).toBeTruthy();
    expect(details.hasAttribute('open')).toBe(false);
    expect(details.textContent).toContain('1 mol CH4 × (2 mol H2O / 1 mol CH4) = 2 mol H2O');
    expect(details.textContent).toContain('1 mol O2 × (2 mol H2O / 2 mol O2) = 1 mol H2O');
    expect(details.textContent).toContain('1 mol H2O × 18.015 g/mol = 18.015 g H2O');
    expect(el.textContent).toContain('Limiting reagent: O2');
  });
  it('provides independently checkable mole-ratio steps without changing the limiting reactant', () => {
    const b = api().balanceEquation('CH4 + O2 -> CO2 + H2O');
    const given = [{ index: 0, moles: 1 }, { index: 1, moles: 1 }];
    const carbon = api().stoichiometry({ ...b, given, productIndex: 2 });
    const water = api().stoichiometry({ ...b, given, productIndex: 3 });
    expect(carbon.molesProduct).toBe(0.5);
    expect(water.molesProduct).toBe(1);
    expect(water.steps.map(step => step.possibleProductMoles)).toEqual([2, 1]);
    expect(water.limitingFormula).toBe(carbon.limitingFormula);
  });
});


describe('Chemistry yield practice examples', () => {
  it.each([
    ['Water formation', '18.015 g H2O'],
    ['Ammonia synthesis', '11.354 g NH3'],
    ['Methane combustion', '22.0045 g CO2'],
  ])('loads %s with practice quantities and a verified prediction', (name, predicted) => {
    const store = newStore({ chemBalance: { subtool: 'stoich', _everPicked: true } });
    controls(store).find(n => n.props['aria-label'] === 'Load practice example: ' + name).props.onClick();
    const el = view(store.toolData.chemBalance);
    expect(el.textContent).toContain(predicted);
    expect(el.textContent).not.toContain('Percent yield:');
    expect(store.toolData.chemBalance._yieldActual).toBe('');
    expect(el.querySelector('#chem-yield-product')).toBeTruthy();
  });
  it('offers examples only before a reaction has been entered', () => {
    expect(view().querySelectorAll('.chem-example')).toHaveLength(3);
    expect(view({ _yieldInput: 'H2 + ' }).querySelectorAll('.chem-example')).toHaveLength(0);
    expect(view(yieldState()).querySelectorAll('.chem-example')).toHaveLength(0);
  });
});
