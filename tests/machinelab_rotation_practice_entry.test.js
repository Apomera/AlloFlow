import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const BENCHES = [
  { id: 'windlass', load: 'windlassLoad', radius: 'windlassHandleR', advance: d => 2 * Math.PI * d.windlassDrumR,
    settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400 } },
  { id: 'screw', load: 'screwLoad', radius: 'screwHandleR', advance: d => d.screwPitch,
    settings: { screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000 } }
];
const BASE = Object.assign({ loadDistance: 0.5, leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400,
  pulleySegments: 2, pulleyLoad: 400, rampLength: 4, rampHeight: 1, rampLoad: 400,
  wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800 }, ...BENCHES.map(b => b.settings));
const KINDS = ['rotationalWork', 'rotationalPower'];
const CASES = BENCHES.flatMap(b => KINDS.map(kind => ({ b, kind, name: `${b.id}/${kind}` })));
const unit = kind => kind === 'rotationalWork' ? 'J' : 'W';
const equationAttr = kind => kind === 'rotationalWork' ? 'data-ml-rotation-work-equation' : 'data-ml-rotation-power-equation';
let tool;
beforeEach(() => { resetStemLab(); tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab'); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.props?.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join('') : n == null || typeof n === 'boolean' ? '' : typeof n === 'object' ? text(n.props?.children) : String(n); }
function session(b = BENCHES[0], extra = {}) {
  const store = newStore({ otherTool: { note: 'Keep other work' }, machineLab: { view: 'machines', bench: b.id, bandOverride: 'g68', ...BASE, ...extra } });
  const awardXP = vi.fn(), tryAward = vi.fn(); let renderedState, tree;
  const render = () => { if (renderedState !== store.toolData.machineLab) { renderedState = store.toolData.machineLab; tree = tool.render(makeCtx({ awardXP, tryAward }, store)); } return tree; };
  const find = predicate => nodes(render()).find(predicate);
  const id = suffix => find(n => n.props?.id === `ml-power-${suffix}-${store.toolData.machineLab.bench}`);
  const click = kind => { const n = find(n => n.type === 'button' && n.props?.[`data-ml-power-${kind}`] !== undefined); expect(n).toBeTruthy(); n.props.onClick({ currentTarget: { closest: () => ({ isConnected: false }) } }); };
  const edit = (suffix, value) => { const n = id(suffix); expect(n, `Missing ${suffix}`).toBeTruthy(); n.props.onChange({ target: { value: String(value) } }); };
  return { render, find, id, click, edit, awardXP, tryAward,
    power: () => find(n => n.props?.['data-ml-power'] === store.toolData.machineLab.bench),
    guide: () => find(n => n.props?.['data-ml-power-rotation'] === store.toolData.machineLab.bench),
    card: kind => find(n => n.props?.['data-ml-power-rotation-calculation'] === kind),
    cta: kind => find(n => n.props?.['data-ml-power-rotation-practice'] === kind),
    result: () => find(n => n.props?.['data-ml-power-result'] !== undefined)?.props['data-ml-power-result'],
    state: () => store.toolData.machineLab, allState: () => store.toolData,
    patch: patch => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; }
  };
}
// Independent geometry and energy: load work per turn determines torque;
// total load work determines energy. Neither reads a production metric/helper.
function expected(b, kind, settings = BASE, percent = 80, seconds = 5) {
  const load = settings[b.load], advance = b.advance(settings), eta = percent / 100;
  const angle = settings.loadDistance / advance * 2 * Math.PI, energy = load * settings.loadDistance / eta;
  return { torque: load * advance / (2 * Math.PI * eta),
    operand: kind === 'rotationalWork' ? angle : angle / seconds,
    target: kind === 'rotationalWork' ? energy : energy / seconds };
}
function roundedClose(actual, wanted) {
  expect(Number.isFinite(actual)).toBe(true);
  expect(Math.abs(actual - wanted)).toBeLessThanOrEqual(Math.max(1e-10, Math.abs(wanted) * 0.000005));
}
function equation(s, kind, wanted) {
  const card = s.card(kind), attr = equationAttr(kind), equations = nodes(card).filter(n => n.props?.[attr] !== undefined);
  expect(card?.type).toBe('section'); expect(equations).toHaveLength(1); expect(equations[0].type).toBe('p');
  expect(nodes(s.guide()).filter(n => n.props?.[attr] !== undefined)).toHaveLength(1);
  const parts = text(equations[0]).match(/^([\d.e+-]+) N·m\s*×\s*([\d.e+-]+) (rad(?:\/s)?)\s*=\s*([\d.e+-]+) (J|W)$/);
  expect(parts, text(equations[0])).toBeTruthy();
  roundedClose(Number(parts[1]), wanted.torque); roundedClose(Number(parts[2]), wanted.operand); roundedClose(Number(parts[4]), wanted.target);
  expect(parts[3]).toBe(kind === 'rotationalWork' ? 'rad' : 'rad/s'); expect(parts[5]).toBe(unit(kind));
  const heading = nodes(card).find(n => n.props?.id === card.props['aria-labelledby']);
  expect(heading?.type).toBe('h4'); expect(text(heading)).toMatch(kind === 'rotationalWork' ? /work.*torque.*angle/i : /power.*torque.*angular speed/i);
  const buttons = nodes(card).filter(n => n.props?.['data-ml-power-rotation-practice'] !== undefined);
  expect(buttons).toHaveLength(1); expect(buttons[0].props.type).toBe('button'); expect(buttons[0].props['data-ml-power-rotation-practice']).toBe(kind);
  expect(text(buttons[0])).toMatch(kind === 'rotationalWork' ? /work/i : /power/i);
  const help = nodes(card).find(n => n.props?.id === buttons[0].props['aria-describedby']);
  expect(help).toBeTruthy(); expect(text(help)).toMatch(/save|keep/i);
  expect(text(card)).toMatch(/do not (divide|apply).*efficiency again/i); expect(text(card)).not.toMatch(/NaN|Infinity|undefined/);
}
function mount(s, kind = KINDS[0]) {
  const host = document.createElement('div'); host.innerHTML = ReactDOMServer.renderToStaticMarkup(s.power()); document.body.append(host);
  const root = host.querySelector('[data-ml-power]'); root.open = true;
  const guide = root.querySelector('[data-ml-power-rotation]'); guide.open = true;
  const button = root.querySelector(`[data-ml-power-rotation-practice="${kind}"]`), answer = root.querySelector('#ml-power-answer-' + s.state().bench);
  expect(button).toBeTruthy(); expect(answer).toBeTruthy(); answer.scrollIntoView = vi.fn(); const focus = vi.spyOn(answer, 'focus');
  const frames = []; vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
  const flush = (commit = true) => {
    // Model a keyed React commit without replacing the answer input. Actual
    // node retention and keyboard focus are checked by separate browser QA.
    if (commit && frames.length) {
      const current = s.power();
      if (current && current.props['data-ml-power'] === root.getAttribute('data-ml-power')) {
        root.setAttribute('data-ml-power-navigation-signature', current.props['data-ml-power-navigation-signature']);
        const selection = root.querySelector('#ml-power-question-' + s.state().bench), renderedSelection = s.id('question');
        if (selection && renderedSelection) selection.value = renderedSelection.props.value;
      }
    }
    while (frames.length) frames.shift()(0);
  };
  return { host, root, guide, button, answer, focus, flush,
    run: (node = s.cta(kind), origin = button) => { expect(node).toBeTruthy(); node.props.onClick({ currentTarget: origin }); flush(); }
  };
}

describe('Machine Lab: rotation practice entry equations', () => {
  it.each(BENCHES)('distinguishes $id torque work from torque power with independent quantities and units', b => {
    const s = session(b), before = s.allState();
    expect(nodes(s.guide()).filter(n => n.props?.['data-ml-power-rotation-calculation'] !== undefined).map(n => n.props['data-ml-power-rotation-calculation'])).toEqual(KINDS);
    for (const kind of KINDS) equation(s, kind, expected(b, kind));
    expect(s.guide()?.type).toBe('details'); expect(s.guide().props.open).not.toBe(true);
    expect(s.allState()).toBe(before); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it.each(BENCHES)('uses converted minutes and nondefault $id efficiency without applying losses twice', b => {
    const settings = { ...BASE, [b.load]: 333, loadDistance: 0.7 }, s = session(b, settings);
    s.edit('duration', 2); s.edit('timeUnit', 'min'); s.edit('percent', 37.5);
    for (const kind of KINDS) equation(s, kind, expected(b, kind, settings, 37.5, 120));
    expect(s.id('duration').props.value).toBe('2'); expect(s.id('timeUnit').props.value).toBe('min');
  });
  it('keeps work and angle fixed when time doubles while halving power and angular speed', () => {
    const b = BENCHES[0], s = session(b), work = text(s.card('rotationalWork'));
    s.edit('duration', 10);
    for (const kind of KINDS) equation(s, kind, expected(b, kind, BASE, 80, 10));
    expect(text(s.card('rotationalWork'))).toBe(work);
  });
  it('offers no rotary entry on linear stations, younger bands or invalid tasks', () => {
    for (const patch of ['lever', 'pulley', 'ramp', 'wedge'].map(bench => ({ bench })).concat([
      { bandOverride: 'k2' }, { bandOverride: 'g35' }, { windlassHandleR: 0 }, { windlassDrumR: 0 },
      { benchPower: { windlass: { percent: '0' } } }, { benchPower: { windlass: { duration: '0' } } }, { benchPower: { windlass: { budget: '0' } } }
    ])) {
      const s = session(BENCHES[0], patch);
      for (const kind of KINDS) { expect(s.card(kind)).toBeUndefined(); expect(s.cta(kind)).toBeUndefined(); }
    }
    const screw = session(BENCHES[1], { screwPitch: 0 });
    for (const kind of KINDS) expect(screw.cta(kind)).toBeUndefined();
  });
});

describe('Machine Lab: rotation practice entry navigation', () => {
  it.each(CASES)('opens and solves $name through the existing calculation input', ({ b, kind }) => {
    const s = session(b); s.edit('answer', 123); s.edit('unit', 'W'); s.click('hint'); s.click('check'); s.click('reveal');
    const before = s.state(), dom = mount(s, kind); dom.run();
    expect(s.id('question').props.value).toBe(kind); expect(s.id('answer').props.value).toBe(''); expect(s.id('unit').props.value).toBe('');
    expect(s.state().benchPower[b.id]).toMatchObject({ hint: 0, checked: false, revealed: false });
    expect(s.state().benchPower[b.id].signature).not.toBe(before.benchPower[b.id].signature);
    expect(document.activeElement).toBe(dom.answer); expect(dom.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(dom.answer.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' }); expect(dom.guide.open).toBe(true);
    s.edit('answer', expected(b, kind).target); s.edit('unit', unit(kind)); s.click('check'); expect(s.result()).toBe('correct');
    expect(s.state().benchPowerRecords).toBeUndefined(); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
  it.each(KINDS)('continues %s without replacing a checked or viewed draft', kind => {
    const s = session(); s.edit('question', kind); s.edit('answer', expected(BENCHES[0], kind).target); s.edit('unit', unit(kind)); s.click('hint'); s.click('hint'); s.click('check');
    for (const reveal of [false, true]) {
      if (reveal) s.click('reveal'); expect(text(s.cta(kind))).toMatch(/^Continue/); const before = s.allState(), dom = mount(s, kind); dom.run();
      expect(s.allState()).toBe(before); expect(s.state().benchPower.windlass).toMatchObject({ hint: 2, checked: true, revealed: reveal });
      expect(document.activeElement).toBe(dom.answer); expect(dom.focus).toHaveBeenCalledWith({ preventScroll: true }); dom.host.remove();
    }
  });
});

describe('Machine Lab: rotation practice entry guards', () => {
  it('rejects closed, mismatched, stale, disabled or disconnected origins', () => {
    const s = session(), dom = mount(s), signature = dom.root.getAttribute('data-ml-power-navigation-signature'), before = s.allState();
    const operations = [
      [() => { dom.root.open = false; }, () => { dom.root.open = true; }],
      [() => dom.root.setAttribute('data-ml-power', 'screw'), () => dom.root.setAttribute('data-ml-power', 'windlass')],
      [() => dom.root.setAttribute('data-ml-power-navigation-signature', 'stale'), () => dom.root.setAttribute('data-ml-power-navigation-signature', signature)],
      [() => { dom.button.disabled = true; }, () => { dom.button.disabled = false; }],
      [() => dom.host.remove(), () => document.body.append(dom.host)],
      [() => dom.button.remove(), () => dom.guide.append(dom.button)]
    ];
    for (const [disable, restore] of operations) { disable(); dom.run(); expect(s.allState()).toBe(before); expect(dom.focus).not.toHaveBeenCalled(); restore(); }
    dom.run(s.cta(KINDS[0]), null); expect(s.allState()).toBe(before); expect(dom.focus).not.toHaveBeenCalled();
  });
  it('requires the answer inside its owning lab and never uses an external duplicate', () => {
    const s = session(), dom = mount(s), before = s.allState(); dom.answer.remove();
    dom.run(); expect(s.allState()).toBe(before); expect(dom.focus).not.toHaveBeenCalled();
    document.body.append(dom.answer); dom.run(); expect(s.allState()).toBe(before); expect(dom.focus).not.toHaveBeenCalled();
    expect(dom.answer.scrollIntoView).not.toHaveBeenCalled();
  });
  it('rejects stale callbacks after geometry, assumptions, question, bench or view changes', () => {
    for (const change of [s => s.patch({ windlassLoad: 500 }), s => s.patch({ windlassHandleR: 0 }), s => s.edit('duration', 10),
      s => s.edit('budget', 200), s => s.edit('percent', 50), s => s.edit('question', 'omega'), s => s.patch({ bench: 'screw' }),
      s => s.patch({ bench: 'lever' }), s => s.patch({ view: 'learn' })]) {
      const s = session(), old = s.cta(KINDS[0]), dom = mount(s); change(s); const before = s.allState();
      dom.run(old); expect(s.allState()).toBe(before); expect(dom.focus).not.toHaveBeenCalled(); dom.host.remove();
    }
  });
  it('rechecks the live root, selected skill and answer before deferred focus', () => {
    for (const change of [dom => { dom.root.open = false; }, dom => dom.root.setAttribute('data-ml-power', 'screw'),
      dom => dom.root.setAttribute('data-ml-power-navigation-signature', 'new-task'), dom => dom.host.remove(),
      dom => document.body.append(dom.answer), dom => { dom.root.querySelector('#ml-power-question-windlass').value = 'rotationalPower'; }]) {
      const s = session(); s.edit('question', KINDS[0]); s.edit('answer', '250'); const before = s.allState(), dom = mount(s);
      s.cta(KINDS[0]).props.onClick({ currentTarget: dom.button }); expect(dom.focus).not.toHaveBeenCalled(); change(dom); dom.flush(false);
      expect(dom.focus).not.toHaveBeenCalled(); expect(dom.answer.scrollIntoView).not.toHaveBeenCalled(); expect(s.allState()).toBe(before); dom.host.remove(); dom.answer.remove();
    }
  });
  it('changes only ordinary draft fields while retaining assumptions, records, other drafts, notes and XP', () => {
    const s = session(BENCHES[0], { designReflection: 'Keep notes', benchPower: { screw: { answer: 'Keep draft' } }, benchPowerPredictions: { screw: { choice: 'half' } } });
    s.edit('answer', 50); s.edit('unit', 'W'); s.click('check'); s.click('save'); s.edit('duration', 2); s.edit('timeUnit', 'min'); s.edit('percent', 37.5); s.edit('budget', 12.3);
    s.edit('answer', 123); s.edit('unit', 'W'); s.click('hint'); s.click('reveal'); const before = s.allState(), dom = mount(s); dom.run(); const after = s.allState();
    const { benchPower: oldDrafts, ...oldLab } = before.machineLab, { benchPower: newDrafts, ...newLab } = after.machineLab;
    expect(newLab).toEqual(oldLab); expect(newDrafts.screw).toBe(oldDrafts.screw); expect(after.otherTool).toBe(before.otherTool);
    const draft = newDrafts.windlass, oldDraft = oldDrafts.windlass;
    for (const key of Object.keys(oldDraft).filter(k => !['question', 'answer', 'unit', 'hint', 'checked', 'revealed', 'signature'].includes(k))) expect(draft[key], key).toEqual(oldDraft[key]);
    expect(draft).toMatchObject({ question: KINDS[0], answer: '', unit: '', hint: 0, checked: false, revealed: false, duration: '2', timeUnit: 'min', percent: '37.5', budget: '12.3' });
    expect(s.state().benchPowerRecords).toBe(before.machineLab.benchPowerRecords); expect(s.awardXP).not.toHaveBeenCalled(); expect(s.tryAward).not.toHaveBeenCalled();
  });
});
