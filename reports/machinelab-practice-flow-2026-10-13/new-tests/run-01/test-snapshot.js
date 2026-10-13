import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const STATIONS = ['lever', 'pulley', 'ramp', 'wedge', 'windlass', 'screw'];
const COMMON = ['inputPower', 'usefulPower', 'lossPower', 'handSpeed', 'loadSpeed', 'budgetTime', 'budgetEnergy', 'budgetLoad', 'budgetMovement', 'requiredEfficiency', 'effortFromPower', 'loadFromPower'];
const ROTATION = ['torque', 'rpm', 'turns', 'angularTravel', 'omega', 'rotationalWork', 'rotationalPower'];
const BASE = { loadDistance: 0.5, leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400,
  pulleySegments: 2, pulleyLoad: 400, rampLength: 4, rampHeight: 1, rampLoad: 400,
  wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800,
  windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400,
  screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000 };
const ROUTES = [['inputPower', 'comparison'], ['effortFromPower', 'force-speed'], ['omega', 'rotation'], ['budgetTime', 'planning']];
function destination(kind) {
  if (['effortFromPower', 'loadFromPower'].includes(kind)) return 'force-speed';
  if (ROTATION.includes(kind)) return 'rotation';
  if (['budgetTime', 'budgetEnergy', 'budgetLoad', 'budgetMovement', 'requiredEfficiency'].includes(kind)) return 'planning';
  return 'comparison';
}
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab'); });
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n); }
function session(bench = 'windlass', extra = {}) {
  const store = newStore({ machineLab: { view: 'machines', bench, bandOverride: 'g68', ...BASE, ...extra } });
  const awardXP = vi.fn(), tryAward = vi.fn(); let renderedState, tree;
  const render = () => { if (renderedState !== store.toolData.machineLab) { renderedState = store.toolData.machineLab; tree = tool.render(makeCtx({ awardXP, tryAward }, store)); } return tree; };
  const find = predicate => nodes(render()).find(predicate);
  const byId = suffix => find(n => n.props?.id === `ml-power-${suffix}-${store.toolData.machineLab.bench}`);
  const action = kind => find(n => n.type === 'button' && n.props[`data-ml-power-${kind}`] !== undefined);
  const invoke = node => { expect(node).toBeTruthy(); node.props.onClick({ currentTarget: { closest: () => ({ isConnected: false }) } }); };
  return { render, find, byId, action, invoke, awardXP, tryAward, state: () => store.toolData.machineLab,
    patch: patch => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    power: () => find(n => n.props?.['data-ml-power'] === store.toolData.machineLab.bench),
    edit: (suffix, value) => { const n = byId(suffix); expect(n, `Missing ${suffix}`).toBeTruthy(); n.props.onChange({ target: { value: String(value) } }); },
    click: kind => invoke(action(kind)),
    steps: () => nodes(render()).filter(n => n.props?.['data-ml-power-step']).map(n => n.props['data-ml-power-step']),
    result: () => find(n => n.props?.['data-ml-power-result'] !== undefined) };
}
function mount(s) {
  const host = document.createElement('div'); host.innerHTML = ReactDOMServer.renderToStaticMarkup(s.power()); document.body.append(host);
  const root = host.querySelector('[data-ml-power]'); root.open = true;
  const query = suffix => root.querySelector(`[data-ml-power-${suffix}]`);
  const run = (kind, button = query(kind), node = s.action(kind)) => { expect(node).toBeTruthy(); node.props.onClick({ currentTarget: button }); };
  return { root, host, query, run };
}
function watchFocus(target) {
  const focus = vi.spyOn(target, 'focus'); target.scrollIntoView = vi.fn();
  return { focus, scroll: target.scrollIntoView };
}
function expectFocused(target, watches) {
  expect(document.activeElement).toBe(target); expect(watches.focus).toHaveBeenCalledWith({ preventScroll: true });
  expect(watches.scroll).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
}
function record() {
  return { version: 1, benchId: 'windlass', settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400, loadDistance: 0.5 },
    percent: 80, seconds: 5, budget: 100, question: 'inputPower', answer: '50', unit: 'W', hint: 1, completion: 'checked' };
}

describe('Machine Lab: practice flow routes', () => {
  it.each(STATIONS)('links every %s skill to an existing relevant visual guide', bench => {
    const s = session(bench), kinds = COMMON.concat(['windlass', 'screw'].includes(bench) ? ROTATION : []), initial = s.state();
    expect(nodes(s.byId('question')).filter(n => n.type === 'option').map(n => n.props.value).sort()).toEqual([...kinds].sort());
    for (const kind of kinds) {
      s.edit('question', kind); const before = s.state(), button = s.action('open-guide'), route = destination(kind);
      expect(button?.props.type).toBe('button'); expect(button.props['data-ml-power-open-guide'], `${bench}/${kind}`).toBe(route);
      expect(text(button)).not.toBe('');
      const target = s.find(n => n.props?.[`data-ml-power-${route}`] === bench);
      expect(target?.type, `${bench}/${kind} destination`).toBe('details');
      expect(nodes(target).filter(n => n.props?.['data-ml-power-return-calculation'] !== undefined)).toHaveLength(1);
      expect(s.power().props['data-ml-power-navigation-signature']).toBeTypeOf('string'); expect(s.power().props['data-ml-power-navigation-signature'].length).toBeGreaterThan(0);
      expect(s.state()).toBe(before);
    }
    for (const key of Object.keys(BASE)) expect(s.state()[key]).toBe(initial[key]);
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it('follows existing age and valid-model visibility without orphan navigation', () => {
    for (const bandOverride of ['k2', 'g35', 'g68', 'g912']) {
      const s = session('lever', { bandOverride }); expect(!!s.action('open-guide')).toBe(['g68', 'g912'].includes(bandOverride));
    }
    for (const patch of [{ windlassHandleR: 0 }, { benchPower: { windlass: { percent: '0' } } }, { benchPower: { windlass: { duration: '0' } } }]) {
      const s = session('windlass', patch); expect(s.action('open-guide')).toBeUndefined(); expect(s.action('go-calculation')).toBeUndefined();
    }
  });
});

describe('Machine Lab: practice flow DOM navigation', () => {
  it.each(ROUTES)('opens the %s guide and focuses only the %s direct summary', (kind, route) => {
    const s = session(); s.edit('question', kind); const dom = mount(s), target = dom.query(route), summary = target.querySelector(':scope > summary'), watches = watchFocus(summary);
    const others = [...dom.root.querySelectorAll('details')].filter(n => n !== target); expect(target.open).toBe(false);
    const before = s.state(), timers = vi.spyOn(globalThis, 'setTimeout'); dom.run('open-guide');
    expect(target.open).toBe(true); expectFocused(summary, watches); expect(others.every(n => !n.open)).toBe(true);
    expect(s.state()).toBe(before); expect(timers).not.toHaveBeenCalled(); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it('returns from every visual guide and the skill map to the same answer input', () => {
    const s = session(), dom = mount(s), input = dom.root.querySelector('#ml-power-answer-windlass'), watches = watchFocus(input), before = s.state();
    for (const [, route] of ROUTES) {
      const guide = dom.query(route); guide.open = true;
      const button = guide.querySelector('[data-ml-power-return-calculation]');
      const node = nodes(s.find(n => n.props?.[`data-ml-power-${route}`] === 'windlass')).find(n => n.props?.['data-ml-power-return-calculation'] !== undefined);
      dom.run('return-calculation', button, node); expectFocused(input, watches); expect(guide.open).toBe(true); input.blur();
    }
    dom.query('skill-map').open = true; dom.run('go-calculation'); expectFocused(input, watches);
    expect(s.state()).toBe(before); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it('preserves checked work, hints, fixed records and unrelated notes through guide round trips', () => {
    const saved = { windlass: { inputPower: record() } }, s = session('windlass', { benchPowerRecords: saved, designReflection: 'Keep this note' });
    s.edit('answer', '50'); s.edit('unit', 'W'); s.click('hint'); s.click('check');
    const before = s.state(), serialized = JSON.stringify(before), dom = mount(s), summary = dom.query('comparison').querySelector(':scope > summary'); watchFocus(summary);
    dom.run('open-guide'); const input = dom.root.querySelector('#ml-power-answer-windlass'); watchFocus(input);
    dom.run('return-calculation', dom.query('comparison').querySelector('[data-ml-power-return-calculation]'));
    expect(s.state()).toBe(before); expect(JSON.stringify(s.state())).toBe(serialized); expect(s.state().benchPowerRecords).toBe(saved);
    expect(s.byId('answer').props.value).toBe('50'); expect(s.byId('unit').props.value).toBe('W'); expect(s.result().props['data-ml-power-result']).toBe('correct');
    expect(s.find(n => n.props?.['data-ml-power-hint-level'] === 1)).toBeTruthy(); expect(s.state().designReflection).toBe('Keep this note');
  });
  it('keeps other expanded guides open and makes repeated navigation harmless', () => {
    const s = session(), dom = mount(s), target = dom.query('comparison'), summary = target.querySelector(':scope > summary'), watches = watchFocus(summary);
    dom.query('planning').open = true; dom.query('skill-map').open = true; const before = s.state();
    dom.run('open-guide'); dom.run('open-guide'); expectFocused(summary, watches);
    expect(target.open).toBe(true); expect(dom.query('planning').open).toBe(true); expect(dom.query('skill-map').open).toBe(true); expect(s.state()).toBe(before);
  });
  it('rejects closed, mismatched, stale, disabled and detached DOM roots or triggers', () => {
    const s = session(), dom = mount(s), target = dom.query('comparison'), summary = target.querySelector(':scope > summary'), watches = watchFocus(summary);
    const button = dom.query('open-guide'), signature = dom.root.getAttribute('data-ml-power-navigation-signature'), before = s.state();
    const checks = [
      [() => { dom.root.open = false; }, () => { dom.root.open = true; }],
      [() => dom.root.setAttribute('data-ml-power', 'screw'), () => dom.root.setAttribute('data-ml-power', 'windlass')],
      [() => dom.root.setAttribute('data-ml-power-navigation-signature', 'stale'), () => dom.root.setAttribute('data-ml-power-navigation-signature', signature)],
      [() => { button.disabled = true; }, () => { button.disabled = false; }],
      [() => dom.host.remove(), () => document.body.append(dom.host)],
      [() => button.remove(), () => dom.root.append(button)]
    ];
    for (const [breakGuard, restore] of checks) { breakGuard(); dom.run('open-guide', button); expect(target.open).toBe(false); expect(watches.focus).not.toHaveBeenCalled(); expect(watches.scroll).not.toHaveBeenCalled(); restore(); }
    expect(s.state()).toBe(before); dom.run('open-guide', button); expectFocused(summary, watches);
  });
  it('never opens or focuses missing targets or matching targets outside the owning lab', () => {
    const s = session(), dom = mount(s), target = dom.query('comparison'), summary = target.querySelector(':scope > summary'), watches = watchFocus(summary);
    target.remove(); document.body.append(target); const before = s.state(); dom.run('open-guide');
    expect(target.open).toBe(false); expect(watches.focus).not.toHaveBeenCalled(); expect(watches.scroll).not.toHaveBeenCalled();
    const input = dom.root.querySelector('#ml-power-answer-windlass'), inputWatches = watchFocus(input); input.remove(); document.body.append(input);
    dom.query('skill-map').open = true; dom.run('go-calculation'); expect(inputWatches.focus).not.toHaveBeenCalled(); expect(inputWatches.scroll).not.toHaveBeenCalled();
    expect(s.state()).toBe(before);
  });
  it('rejects old callbacks against a newly rendered question or geometry signature', () => {
    const s = session(), oldButton = s.action('open-guide');
    for (const patch of [{ benchPower: { windlass: { question: 'omega' } } }, { windlassHandleR: 0.6 }]) {
      s.patch(patch); const dom = mount(s), summary = dom.query('comparison').querySelector(':scope > summary'), watches = watchFocus(summary), before = s.state();
      dom.run('open-guide', dom.query('open-guide'), oldButton); expect(dom.query('comparison').open).toBe(false);
      expect(watches.focus).not.toHaveBeenCalled(); expect(watches.scroll).not.toHaveBeenCalled(); expect(s.state()).toBe(before); dom.host.remove();
    }
  });
});

describe('Machine Lab: practice flow feedback steps', () => {
  it('reveals numbered formula and setup headings only with the corresponding requested hint', () => {
    const s = session(); expect(s.steps()).toEqual([]); s.click('hint'); expect(s.steps()).toEqual(['formula']);
    const firstFormula = text(s.find(n => n.props?.['data-ml-power-hint-level'] === 1)); expect(firstFormula).toMatch(/input work.*seconds/i);
    expect(text(s.find(n => n.props?.['data-ml-power-step'] === 'formula'))).toMatch(/1.*relationship/i);
    s.click('hint'); expect(s.steps()).toEqual(['formula', 'setup']); expect(text(s.find(n => n.props?.['data-ml-power-hint-level'] === 2))).toBe(firstFormula);
    expect(text(s.find(n => n.props?.['data-ml-power-step'] === 'setup'))).toMatch(/2.*substitute/i); expect(s.action('hint').props.disabled).toBe(true);
    s.edit('question', 'omega'); expect(s.steps()).toEqual([]);
  });
  it.each([
    ['invalid', '', '', false], ['unit', '50', 'J', false], ['incorrect', '123', 'W', false], ['correct', '50', 'W', false], ['solution', '', '', true]
  ])('shows the result step for %s without manufacturing hints or changing result semantics', (result, answer, unit, reveal) => {
    const s = session(); s.edit('answer', answer); s.edit('unit', unit); s.click(reveal ? 'reveal' : 'check');
    expect(s.steps()).toEqual(['result']); expect(s.result().props['data-ml-power-result']).toBe(result);
    expect(text(s.find(n => n.props?.['data-ml-power-step'] === 'result'))).toMatch(/3/);
    expect(s.find(n => n.props?.['data-ml-power-hint-level'] !== undefined)).toBeUndefined();
    expect(s.action('save').props.disabled).toBe(!['correct', 'solution'].includes(result));
    if (['correct', 'solution'].includes(result)) expect(text(s.result())).toContain('50 W');
    if (result === 'solution') { s.click('save'); expect(s.state().benchPowerRecords.windlass.inputPower).toMatchObject({ hint: 0, completion: 'solution', answer: '', unit: '' }); }
  });
  it('keeps requested steps during correction and removes only stale result feedback', () => {
    const s = session(); s.edit('answer', '123'); s.edit('unit', 'W'); s.click('check'); s.click('hint'); s.click('hint');
    expect(s.steps()).toEqual(['formula', 'setup', 'result']); expect(s.result().props['data-ml-power-result']).toBe('incorrect');
    expect(s.byId('answer').props.value).toBe('123'); expect(s.byId('unit').props.value).toBe('W');
    s.edit('answer', '50'); expect(s.steps()).toEqual(['formula', 'setup']); expect(s.result()).toBeUndefined();
    s.click('check'); expect(s.steps()).toEqual(['formula', 'setup', 'result']); expect(s.result().props['data-ml-power-result']).toBe('correct');
    s.click('save'); expect(s.state().benchPowerRecords.windlass.inputPower).toMatchObject({ answer: '50', unit: 'W', hint: 2, completion: 'checked' });
  });
  it('keeps a single polite atomic feedback region and semantic non-live step headings', () => {
    const s = session(); s.click('hint'); s.click('hint'); s.click('reveal');
    expect(s.steps()).toEqual(['formula', 'setup', 'result']);
    const practice = s.find(n => n.props?.['data-ml-power-practice'] !== undefined), live = nodes(practice).filter(n => n.props?.['aria-live']);
    expect(live).toHaveLength(1); expect(live[0].props).toMatchObject({ role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
    for (const heading of nodes(practice).filter(n => n.props?.['data-ml-power-step'])) { expect(['h4', 'h5', 'h6']).toContain(heading.type); expect(heading.props['aria-live']).toBeUndefined(); }
    const dom = mount(s); expect(dom.root.querySelectorAll('[data-ml-power-step]')).toHaveLength(3);
    for (const button of dom.root.querySelectorAll('[data-ml-power-open-guide],[data-ml-power-return-calculation],[data-ml-power-go-calculation]')) { expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(button.textContent.trim().length).toBeGreaterThan(0); }
  });
});
