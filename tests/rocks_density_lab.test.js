import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function all(node, predicate, result = []) {
  if (Array.isArray(node)) { node.forEach((child) => all(child, predicate, result)); return result; }
  if (!node || typeof node !== 'object') return result;
  if (predicate(node)) result.push(node);
  if (node.props) all(node.props.children, predicate, result);
  return result;
}
function lab(densityLab = {}) {
  const store = { rocks: { mode: 'densityLab', densityLab, fieldCases: { activeId: 'floating-stone' } }, rockCycle: {} };
  const ctx = makeCtx({ toolData: store, setToolData: (update) => Object.assign(store, typeof update === 'function' ? update(store) : update) });
  const tree = () => window.StemLab._registry.rocks.render(ctx);
  const find = (attribute, value = true) => { const found = all(tree(), (node) => node.props?.[attribute] === value)[0]; expect(found, `${attribute}=${value}`).toBeTruthy(); return found; };
  const click = (attribute, value = true) => find(attribute, value).props.onClick();
  const change = (attribute, value) => find(attribute).props.onChange({ target: { value } });
  const read = () => ['mass', 'before', 'after'].forEach((kind) => click('data-rk-density-measure', kind));
  const solve = (value = '2.65') => { read(); change('data-rk-density-estimate', value); click('data-rk-density-check'); };
  const record = () => click('data-rk-density-record');
  const html = () => ReactDOMServer.renderToStaticMarkup(React.createElement(() => tree()));
  return { store, tree, find, click, change, read, solve, record, html, state: () => store.rocks.densityLab };
}
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_rocks.js', 'rocks'); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('virtual mineral density measurements', () => {
  it('starts with seven bounded specimen choices and measurements separate from calculations', () => {
    const app = lab();
    expect(all(app.find('data-rk-density-mineral'), (node) => node.type === 'option')).toHaveLength(7);
    expect(app.find('data-rk-density-measure', 'after').props.disabled).toBe(true);
    expect(app.find('data-rk-density-record').props.disabled).toBe(true);
    expect(app.html()).not.toContain('data-rk-density-solution');
    expect(app.html()).not.toContain('value="halite"');
    expect(app.html()).not.toContain('value="gypsum"');
    app.click('data-rk-density-check');
    expect(app.state().feedback).toBe('measure');
  });

  it('reads mass, initial level and final level independently and prevents out-of-order immersion', () => {
    const app = lab();
    app.click('data-rk-density-measure', 'after');
    expect(app.state().measured).toBeUndefined();
    app.click('data-rk-density-measure', 'mass');
    expect(app.state().measured).toEqual({ mass: true });
    app.click('data-rk-density-measure', 'before');
    expect(app.state().measured).toEqual({ mass: true, before: true });
    app.click('data-rk-density-measure', 'after');
    const readings = ReactDOMServer.renderToStaticMarkup(app.find('data-rk-density-readings'));
    expect(readings).toContain('26.5 g');
    expect(readings).toContain('30.0 mL');
    expect(readings).toContain('40.0 mL');
    expect(app.find('data-rk-density-instruments').props['aria-label']).toContain('26.5 g');
  });

  it.each([['2.65','g/cm3'],['2,65','g/mL'],['2650','kg/m3']])('accepts %s in %s with explicit units', (answer, unit) => {
    const app = lab();
    app.change('data-rk-density-units', unit);
    app.solve(answer);
    expect(app.state().feedback).toBe('correct');
    expect(app.find('data-rk-density-record').props.disabled).toBe(false);
    expect(app.find('data-rk-density-solution')).toBeTruthy();
  });

  it.each([['0.66','final-volume'],['0.38','inverse'],['26.5','mass'],['2650','units'],['2.60','retry'],['Infinity','invalid'],['2.65abc','invalid'],['0','invalid'],['-2.65','invalid']])('explains the calculation issue for %s', (answer, feedback) => {
    const app = lab(); app.solve(answer);
    expect(app.state().feedback).toBe(feedback);
    expect(app.find('data-rk-density-record').props.disabled).toBe(true);
    expect(app.html()).not.toContain('data-rk-density-solution');
  });

  it('uses rounded balance readings rather than hidden precision, and applies two-decimal answer tolerance', () => {
    const app = lab({ mineralId: 'pyrite', volume: 5 });
    app.solve('5.02'); // 25.1 g / 5 cm³, not unrounded 25.05 g / 5.
    expect(app.state().feedback).toBe('correct');
    app.record();
    expect(app.state().trials[0]).toMatchObject({ mass: 25.1, volume: 5, density: 5.0200000000000005 });
    app.change('data-rk-density-estimate', '5.01');
    app.click('data-rk-density-check');
    expect(app.state().feedback).toBe('retry');
  });

  it('preserves trial snapshots when changing settings and invalidates old readings and answers', () => {
    const app = lab();
    app.change('data-rk-density-prediction', 'A bigger quartz sample has greater mass, but the same density.');
    app.solve();
    app.change('data-rk-density-explanation', 'Mass divided by displaced volume is 2.65.');
    app.record();
    const first = JSON.stringify(app.state().trials[0]);
    app.change('data-rk-density-size', '3');
    expect(app.state().measured).toEqual({});
    expect(app.state().estimate).toBe('');
    expect(app.state().feedback).toBe('');
    app.change('data-rk-density-water', '40');
    app.solve('2.65');
    app.change('data-rk-density-explanation', 'A larger sample gives the same ratio within rounding.');
    app.record();
    expect(JSON.stringify(app.state().trials[0])).toBe(first);
    expect(app.state().trials[1]).toMatchObject({ volume: 15, initialWater: 40, finalWater: 55, mass: 39.8 });
    expect(app.find('data-rk-density-size-comparison')).toBeTruthy();
    expect(app.find('data-rk-density-plot')).toBeTruthy();
    expect(app.store.rocks.fieldCases).toEqual({ activeId: 'floating-stone' });
  });

  it('separates size comparisons from same-volume comparisons across minerals', () => {
    const app = lab(); app.solve(); app.record();
    app.change('data-rk-density-mineral', 'magnetite');
    app.solve('5.18'); app.record();
    expect(app.state().trials[1]).toMatchObject({ mineralId: 'magnetite', volume: 10, mass: 51.8 });
    expect(app.find('data-rk-density-mineral-comparison')).toBeTruthy();
    expect(all(app.tree(), (node) => node.props?.['data-rk-density-size-comparison'])).toHaveLength(0);
  });

  it('records once per unchanged trial and allows an explicit repeat', () => {
    const app = lab(); app.solve(); app.record(); app.record();
    expect(app.state().trials).toHaveLength(1);
    expect(app.find('data-rk-density-record').props.disabled).toBe(true);
    app.click('data-rk-density-repeat');
    expect(app.state().trials).toHaveLength(1);
    app.solve(); app.record();
    expect(app.state().trials).toHaveLength(2);
  });

  it('bounds restored settings, writing and recorded trials without silently admitting incoherent rows', () => {
    const row = { mineralId: 'quartz', volume: 10, initialWater: 30, finalWater: 40, mass: 26.5, density: 2.65, estimate: '2.65', units: 'g/cm3', prediction: '', explanation: '' };
    const app = lab({ mineralId: 'halite', volume: 999, initialWater: -100, trials: [null,{...row,density:42},...Array.from({length:30},()=>({...row}))] });
    expect(app.find('data-rk-density-mineral').props.value).toBe('quartz');
    expect(app.find('data-rk-density-size').props.value).toBe(6);
    expect(app.find('data-rk-density-water').props.value).toBe(10);
    app.change('data-rk-density-prediction', 'x'.repeat(2001));
    app.change('data-rk-density-explanation', 'y'.repeat(4001));
    expect(app.state().prediction).toHaveLength(2000);
    expect(app.state().explanation).toHaveLength(4000);
    app.solve('2.65'); app.record();
    expect(app.state().trials).toHaveLength(30);
    expect(app.state().trials[29]).toMatchObject({ volume:30, initialWater:10, finalWater:40, mass:79.5 });
  });

  it('uses native labeled controls and accessible text for both scientific figures', () => {
    const app = lab(); app.solve(); app.record(); app.change('data-rk-density-size','4'); app.solve(); app.record();
    const root = app.find('data-rk-density-lab');
    const labels = all(root, (node) => node.type === 'label').map((node) => node.props.htmlFor);
    all(root, (node) => ['input','select','textarea'].includes(node.type)).forEach((node) => expect(labels).toContain(node.props.id));
    all(root, (node) => node.type === 'svg' && node.props.role === 'img').forEach((node) => expect(node.props['aria-label']).toBeTruthy());
    expect(app.html()).toContain('only the numerical calculation is checked');
    expect(app.html()).toContain('fixed mineral composition');
  });
});

describe('density notebook export', () => {
  it('exports frozen measurement rows, learner writing and an unmeasured current draft without invented readings', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:write}});
    const app = lab(); app.change('data-rk-density-prediction','My prediction.'); app.solve(); app.change('data-rk-density-explanation','My first interpretation.'); app.record();
    app.change('data-rk-density-mineral','galena');
    app.change('data-rk-density-explanation','Draft, not measured yet.');
    app.click('data-rk-density-copy'); await Promise.resolve();
    const text = write.mock.calls[0][0];
    expect(text).toContain('26.5 g');
    expect(text).toContain('30.0 → 40.0 mL');
    expect(text).toContain('2.65 g/cm³');
    expect(text).toContain('My first interpretation.');
    expect(text).toContain('Draft, not measured yet.');
    expect(text).toContain('Dry specimen mass: Not measured');
    expect(app.state().exportStatus).toBe('copied');
  });

  it('provides selectable text if clipboard access fails', async () => {
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:vi.fn().mockRejectedValue(new Error('denied'))}});
    const app = lab(); app.click('data-rk-density-copy'); await Promise.resolve();
    expect(app.state().exportStatus).toBe('manual');
    expect(app.find('data-rk-density-export').props.readOnly).toBe(true);
    expect(app.html()).toContain('Select the notebook text below');
  });

  it('releases download resources and preserves the fallback text', () => {
    vi.useFakeTimers();
    const create = vi.fn().mockReturnValue('blob:density'), revoke = vi.fn();
    Object.defineProperty(URL,'createObjectURL',{configurable:true,value:create});
    Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:revoke});
    const click = vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
    const app = lab(); app.click('data-rk-density-download');
    expect(create.mock.calls[0][0].type).toBe('text/plain;charset=utf-8');
    expect(click).toHaveBeenCalledTimes(1);
    expect(app.state().exportStatus).toBe('downloaded');
    expect(app.find('data-rk-density-export').props.value).toContain('Rocks & Minerals density investigation');
    expect(document.querySelector('a[download="mineral-density-investigation.txt"]')).toBeNull();
    vi.runAllTimers(); expect(revoke).toHaveBeenCalledWith('blob:density');
  });

  it('renders learner writing as text in trial notes', () => {
    const app = lab(); app.solve(); app.change('data-rk-density-explanation','<img src=x onerror=alert(1)>'); app.record();
    expect(app.html()).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(app.html()).not.toContain('<img src=x');
  });
});
